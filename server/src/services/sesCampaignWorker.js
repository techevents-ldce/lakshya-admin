/**
 * sesCampaignWorker.js
 *
 * SES Campaign Worker — mirrors bulkEmailWorker.js in structure and style.
 * Completely separate from the Resend bulk email worker.
 * Uses the same setImmediate fire-and-forget pattern, same batch/concurrency
 * approach, same DB-sync counts, and same crash recovery mechanism.
 *
 * NEVER imports from mailService.js or bulkEmailWorker.js.
 */

const EmailCampaign          = require('../models/EmailCampaign');
const EmailCampaignRecipient = require('../models/EmailCampaignRecipient');
const EmailSuppression       = require('../models/EmailSuppression');
const { sendSingleEmailViaSES } = require('./sesMailService');
const logger = require('../utils/logger');

// ─── Configurable Defaults ────────────────────────────────────────────────────
const getConfig = (campaign) => ({
  batchSize:    campaign.batchSize    || Number(process.env.SES_CAMPAIGN_BATCH_SIZE)     || 10,
  concurrency:  campaign.concurrency  || Number(process.env.SES_CAMPAIGN_CONCURRENCY)    || 3,
  batchDelayMs: campaign.batchDelayMs || Number(process.env.SES_CAMPAIGN_BATCH_DELAY_MS) || 1200,
});

// Track active campaigns to prevent double-processing
const activeCampaigns = new Set();

// ─── Process a Single Campaign ────────────────────────────────────────────────

/**
 * Process a bulk SES email campaign. Fetches pending recipients in batches,
 * sends with controlled concurrency, updates DB atomically.
 * This is fire-and-forget — call it without awaiting (via setImmediate).
 */
async function processCampaign(campaignId) {
  const idStr = campaignId.toString();

  if (activeCampaigns.has(idStr)) {
    logger.warn(`[SESWorker] Campaign ${idStr} is already being processed, skipping`);
    return;
  }
  activeCampaigns.add(idStr);

  try {
    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      logger.error(`[SESWorker] Campaign ${idStr} not found`);
      return;
    }

    if (!['queued', 'processing'].includes(campaign.status)) {
      logger.warn(`[SESWorker] Campaign ${idStr} has status "${campaign.status}", skipping`);
      return;
    }

    await EmailCampaign.updateOne(
      { _id: campaignId },
      { status: 'processing', startedAt: campaign.startedAt || new Date() }
    );
    logger.info(`[SESWorker] Started processing campaign ${idStr} (${campaign.title})`);

    const config = getConfig(campaign);
    let hasMore  = true;

    while (hasMore) {
      // Check for pause/cancel between batches
      const current = await EmailCampaign.findById(campaignId).select('status');
      if (!current || ['paused', 'cancelled'].includes(current.status)) {
        logger.info(`[SESWorker] Campaign ${idStr} is ${current?.status || 'gone'}, stopping worker`);
        return; // Leave status as-is (paused/cancelled)
      }

      // Fetch next batch of pending recipients
      const batch = await EmailCampaignRecipient.find({ campaignId, status: 'pending' })
        .limit(config.batchSize)
        .lean();

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      logger.info(`[SESWorker] Campaign ${idStr}: Processing batch of ${batch.length} recipients`);

      // Mark batch as processing atomically
      const batchIds = batch.map((r) => r._id);
      await EmailCampaignRecipient.updateMany(
        { _id: { $in: batchIds }, status: 'pending' },
        { status: 'processing' }
      );

      await syncCampaignCounts(campaignId);
      await processBatchWithConcurrency(batch, campaign, config.concurrency);
      await syncCampaignCounts(campaignId);

      if (hasMore) await sleep(config.batchDelayMs);
    }

    await finalizeCampaign(campaignId);
    logger.info(`[SESWorker] Campaign ${idStr} completed`);

  } catch (err) {
    logger.error(`[SESWorker] Fatal error processing campaign ${idStr}:`, err);
    await EmailCampaign.updateOne(
      { _id: campaignId, status: 'processing' },
      { status: 'failed', completedAt: new Date() }
    );
  } finally {
    activeCampaigns.delete(idStr);
  }
}

// ─── Batch Processing with Concurrency Control ────────────────────────────────

async function processBatchWithConcurrency(batch, campaign, concurrencyLimit) {
  let activeCount = 0;
  let index       = 0;
  const results   = [];

  return new Promise((resolve) => {
    function startNext() {
      while (activeCount < concurrencyLimit && index < batch.length) {
        const recipient = batch[index++];
        activeCount++;

        processOneRecipient(recipient, campaign)
          .then((r) => results.push(r))
          .catch(() => {})
          .finally(() => {
            activeCount--;
            if (index >= batch.length && activeCount === 0) {
              resolve(results);
            } else {
              startNext();
            }
          });
      }
    }
    startNext();
  });
}

async function processOneRecipient(recipient, campaign) {
  try {
    // ── Suppression check before every send ──────────────────────────────────
    const suppressed = await EmailSuppression.findOne({ email: recipient.recipientEmail });
    if (suppressed) {
      await EmailCampaignRecipient.updateOne(
        { _id: recipient._id },
        { status: 'suppressed', failureReason: `Suppressed (${suppressed.reason})` }
      );
      logger.info(`[SESWorker] Skipped suppressed email ${recipient.recipientEmail}`);
      return;
    }

    // ── Send via SES ─────────────────────────────────────────────────────────
    const result = await sendSingleEmailViaSES(recipient, campaign);

    if (result.success) {
      await EmailCampaignRecipient.updateOne(
        { _id: recipient._id },
        {
          status:            'sent',
          sentAt:            new Date(),
          providerMessageId: result.messageId || '',
          failureReason:     '',
        }
      );
      logger.info(`[SESWorker] Sent → ${recipient.recipientEmail} (campaign ${campaign._id})`);
    } else {
      await EmailCampaignRecipient.updateOne(
        { _id: recipient._id },
        {
          status:        'failed',
          failureReason: result.error || 'Unknown SES error',
          $inc:          { retryCount: 1 },
        }
      );
      logger.warn(`[SESWorker] Failed → ${recipient.recipientEmail}: ${result.error}`);
    }
  } catch (err) {
    await EmailCampaignRecipient.updateOne(
      { _id: recipient._id },
      {
        status:        'failed',
        failureReason: err.message || 'Unexpected exception',
        $inc:          { retryCount: 1 },
      }
    );
    logger.error(`[SESWorker] Exception for ${recipient.recipientEmail}:`, err.message);
  }
}

// ─── Sync Campaign Counts from Recipient States ────────────────────────────────

async function syncCampaignCounts(campaignId) {
  const pipeline = await EmailCampaignRecipient.aggregate([
    { $match: { campaignId } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const counts = {
    pending: 0, processing: 0, sent: 0, failed: 0,
    bounced: 0, complained: 0, unsubscribed: 0, suppressed: 0,
  };
  pipeline.forEach((row) => {
    if (Object.prototype.hasOwnProperty.call(counts, row._id)) counts[row._id] = row.count;
  });

  await EmailCampaign.updateOne(
    { _id: campaignId },
    {
      sentCount:         counts.sent,
      failedCount:       counts.failed,
      bouncedCount:      counts.bounced,
      complainedCount:   counts.complained,
      unsubscribedCount: counts.unsubscribed,
      suppressedCount:   counts.suppressed,
    }
  );
}

// ─── Finalize Campaign Status ──────────────────────────────────────────────────

async function finalizeCampaign(campaignId) {
  await syncCampaignCounts(campaignId);

  const campaign = await EmailCampaign.findById(campaignId);
  if (!campaign || ['paused', 'cancelled'].includes(campaign.status)) return;

  const remaining = await EmailCampaignRecipient.countDocuments({
    campaignId,
    status: { $in: ['pending', 'processing'] },
  });
  const failed = campaign.failedCount + campaign.bouncedCount + campaign.complainedCount;
  const sent   = campaign.sentCount;

  let finalStatus;
  if (remaining === 0 && failed === 0) {
    finalStatus = 'completed';
  } else if (remaining === 0 && sent > 0) {
    finalStatus = 'completed_with_failures';
  } else if (remaining === 0 && sent === 0) {
    finalStatus = 'failed';
  } else {
    finalStatus = 'completed_with_failures';
  }

  await EmailCampaign.updateOne(
    { _id: campaignId },
    { status: finalStatus, completedAt: new Date() }
  );
  logger.info(`[SESWorker] Campaign ${campaignId} finalized → ${finalStatus}`);
}

// ─── Crash Recovery ────────────────────────────────────────────────────────────

/**
 * Called on server startup. Recovers interrupted SES campaigns:
 * - Recipients stuck in "processing" → reset to "pending"
 * - Campaigns stuck in "processing"  → re-queue and resume
 */
async function recoverStaleCampaigns() {
  try {
    const resetResult = await EmailCampaignRecipient.updateMany(
      { status: 'processing' },
      { status: 'pending' }
    );
    if (resetResult.modifiedCount > 0) {
      logger.info(`[SESWorker] Reset ${resetResult.modifiedCount} stuck recipients to pending`);
    }

    const staleCampaigns = await EmailCampaign.find({ status: 'processing' }).select('_id title');
    for (const c of staleCampaigns) {
      logger.info(`[SESWorker] Resuming stale campaign ${c._id} (${c.title})`);
      await EmailCampaign.updateOne({ _id: c._id }, { status: 'queued' });
      setImmediate(() => processCampaign(c._id));
    }

    if (staleCampaigns.length > 0) {
      logger.info(`[SESWorker] Campaign recovery complete: ${staleCampaigns.length} resumed`);
    }
  } catch (err) {
    logger.error('[SESWorker] Error during campaign recovery:', err);
  }
}

// ─── Scheduled Campaign Poller ─────────────────────────────────────────────────

/**
 * Checks for campaigns scheduled to run now and triggers the worker.
 * Called every 60 seconds via startScheduler().
 */
async function checkScheduledCampaigns() {
  try {
    const now = new Date();
    const due = await EmailCampaign.find({
      status:      'queued',
      scheduledAt: { $lte: now },
    }).select('_id title');

    for (const c of due) {
      logger.info(`[SESWorker] Launching scheduled campaign ${c._id} (${c.title})`);
      setImmediate(() => processCampaign(c._id));
    }
  } catch (err) {
    logger.error('[SESWorker] Error checking scheduled campaigns:', err);
  }
}

let _schedulerInterval = null;
function startScheduler() {
  if (_schedulerInterval) return;
  _schedulerInterval = setInterval(checkScheduledCampaigns, 60 * 1000);
  logger.info('[SESWorker] Campaign scheduler started (60s interval)');
}

// ─── Utility ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { processCampaign, recoverStaleCampaigns, syncCampaignCounts, startScheduler };
