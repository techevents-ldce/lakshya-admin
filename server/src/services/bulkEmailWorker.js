const BulkEmailJob = require('../models/BulkEmailJob');
const BulkEmailRecipient = require('../models/BulkEmailRecipient');
const { sendSingleEmail } = require('./mailService');
const logger = require('../utils/logger');

// ─── Configurable Defaults ────────────────────────────────────────────────────

const getConfig = (job) => ({
  batchSize: job.batchSize || Number(process.env.BULK_EMAIL_BATCH_SIZE) || 10,
  concurrency: job.concurrency || Number(process.env.BULK_EMAIL_CONCURRENCY) || 2,
  batchDelayMs: job.batchDelayMs || Number(process.env.BULK_EMAIL_BATCH_DELAY_MS) || 1500,
});

// Track active jobs to prevent double-processing
const activeJobs = new Set();

// ─── Process a Single Job ─────────────────────────────────────────────────────

/**
 * Process a bulk email job. Fetches pending recipients in batches,
 * sends with controlled concurrency, updates DB atomically.
 * This is fire-and-forget — call it without awaiting.
 */
async function processJob(jobId) {
  const jobIdStr = jobId.toString();

  // Prevent double-processing
  if (activeJobs.has(jobIdStr)) {
    logger.warn(`[BulkEmailWorker] Job ${jobIdStr} is already being processed, skipping`);
    return;
  }
  activeJobs.add(jobIdStr);

  try {
    const job = await BulkEmailJob.findById(jobId);
    if (!job) {
      logger.error(`[BulkEmailWorker] Job ${jobIdStr} not found`);
      return;
    }

    // Only process queued or processing jobs
    if (!['queued', 'processing'].includes(job.status)) {
      logger.warn(`[BulkEmailWorker] Job ${jobIdStr} has status "${job.status}", skipping`);
      return;
    }

    // Mark job as processing
    await BulkEmailJob.updateOne({ _id: jobId }, { status: 'processing' });
    logger.info(`[BulkEmailWorker] Started processing job ${jobIdStr}`);

    const config = getConfig(job);
    let hasMore = true;

    while (hasMore) {
      // Check if job was cancelled
      const currentJob = await BulkEmailJob.findById(jobId).select('status');
      if (!currentJob || currentJob.status === 'cancelled') {
        logger.info(`[BulkEmailWorker] Job ${jobIdStr} was cancelled, stopping`);
        break;
      }

      // Fetch a batch of pending recipients
      const batch = await BulkEmailRecipient.find({ jobId, status: 'pending' })
        .limit(config.batchSize)
        .lean();

      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      logger.info(`[BulkEmailWorker] Job ${jobIdStr}: Processing batch of ${batch.length} recipients`);

      // Mark batch as "processing" atomically
      const batchIds = batch.map((r) => r._id);
      await BulkEmailRecipient.updateMany(
        { _id: { $in: batchIds }, status: 'pending' },
        { status: 'processing' }
      );

      // Update job processing count
      await syncJobCounts(jobId);

      // Process batch with controlled concurrency
      await processBatchWithConcurrency(batch, job, config.concurrency);

      // Sync counts after batch completion
      await syncJobCounts(jobId);

      // Delay between batches (let the API breathe)
      if (hasMore) {
        await sleep(config.batchDelayMs);
      }
    }

    // Finalize job status
    await finalizeJob(jobId);
    logger.info(`[BulkEmailWorker] Job ${jobIdStr} completed`);
  } catch (err) {
    logger.error(`[BulkEmailWorker] Fatal error processing job ${jobIdStr}:`, err);
    // Mark job as failed only if it was still processing
    await BulkEmailJob.updateOne(
      { _id: jobId, status: 'processing' },
      { status: 'failed' }
    );
  } finally {
    activeJobs.delete(jobIdStr);
  }
}

// ─── Batch Processing with Concurrency Control ───────────────────────────────

async function processBatchWithConcurrency(batch, job, concurrencyLimit) {
  const { subject, body, template, senderIdentity } = job;

  // Simple concurrency limiter (like p-limit)
  let activeCount = 0;
  let index = 0;
  const results = [];

  return new Promise((resolve) => {
    function startNext() {
      while (activeCount < concurrencyLimit && index < batch.length) {
        const recipient = batch[index++];
        activeCount++;

        processRecipient(recipient, subject, body, template, senderIdentity, job._id)
          .then((result) => results.push(result))
          .catch(() => {}) // errors handled inside processRecipient
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

async function processRecipient(recipient, subject, body, template, senderIdentity, jobId) {
  try {
    const result = await sendSingleEmail(
      { email: recipient.email, name: recipient.name },
      subject,
      body,
      template,
      senderIdentity
    );

    if (result.success) {
      await BulkEmailRecipient.updateOne(
        { _id: recipient._id },
        { status: 'sent', sentAt: new Date(), errorMessage: '' }
      );
      logger.info(`[BulkEmailWorker] Sent to ${recipient.email} (job ${jobId})`);
    } else {
      await BulkEmailRecipient.updateOne(
        { _id: recipient._id },
        {
          status: 'failed',
          errorMessage: result.error || 'Unknown error',
          $inc: { retryCount: 1 },
        }
      );
      logger.warn(`[BulkEmailWorker] Failed to send to ${recipient.email}: ${result.error}`);
    }
  } catch (err) {
    await BulkEmailRecipient.updateOne(
      { _id: recipient._id },
      {
        status: 'failed',
        errorMessage: err.message || 'Unexpected exception',
        $inc: { retryCount: 1 },
      }
    );
    logger.error(`[BulkEmailWorker] Exception for ${recipient.email}:`, err.message);
  }
}

// ─── Sync Job Counters from Recipient States ──────────────────────────────────

async function syncJobCounts(jobId) {
  const pipeline = await BulkEmailRecipient.aggregate([
    { $match: { jobId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  const counts = { pending: 0, processing: 0, sent: 0, failed: 0 };
  pipeline.forEach((row) => {
    if (counts.hasOwnProperty(row._id)) counts[row._id] = row.count;
  });

  await BulkEmailJob.updateOne(
    { _id: jobId },
    {
      pendingCount: counts.pending,
      processingCount: counts.processing,
      completedCount: counts.sent,
      failedCount: counts.failed,
    }
  );
}

// ─── Finalize Job Status ──────────────────────────────────────────────────────

async function finalizeJob(jobId) {
  await syncJobCounts(jobId);

  const job = await BulkEmailJob.findById(jobId);
  if (!job || job.status === 'cancelled') return;

  let finalStatus;
  if (job.failedCount === 0 && job.pendingCount === 0 && job.processingCount === 0) {
    finalStatus = 'completed';
  } else if (job.completedCount > 0 && job.pendingCount === 0 && job.processingCount === 0) {
    finalStatus = 'completed_with_failures';
  } else if (job.completedCount === 0 && job.failedCount > 0 && job.pendingCount === 0) {
    finalStatus = 'failed';
  } else {
    finalStatus = 'completed_with_failures'; // some still pending = treat as partial
  }

  await BulkEmailJob.updateOne({ _id: jobId }, { status: finalStatus });
  logger.info(`[BulkEmailWorker] Job ${jobId} finalized with status: ${finalStatus}`);
}

// ─── Crash Recovery ───────────────────────────────────────────────────────────

/**
 * Called on server startup. Recovers any jobs that were interrupted:
 * - Recipients stuck in "processing" → reset to "pending"
 * - Jobs stuck in "processing" → resume
 */
async function recoverStaleJobs() {
  try {
    // Reset stuck recipients
    const resetResult = await BulkEmailRecipient.updateMany(
      { status: 'processing' },
      { status: 'pending' }
    );
    if (resetResult.modifiedCount > 0) {
      logger.info(`[BulkEmailWorker] Reset ${resetResult.modifiedCount} stuck recipients to pending`);
    }

    // Find jobs that need resuming
    const staleJobs = await BulkEmailJob.find({ status: 'processing' }).select('_id');
    for (const job of staleJobs) {
      logger.info(`[BulkEmailWorker] Resuming stale job ${job._id}`);
      // Reset to queued first so processJob picks it up
      await BulkEmailJob.updateOne({ _id: job._id }, { status: 'queued' });
      // Fire and forget — don't await
      setImmediate(() => processJob(job._id));
    }

    if (staleJobs.length > 0) {
      logger.info(`[BulkEmailWorker] Recovery complete: ${staleJobs.length} jobs resumed`);
    }
  } catch (err) {
    logger.error('[BulkEmailWorker] Error during recovery:', err);
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = { processJob, recoverStaleJobs, syncJobCounts };
