const IssuedCertificate = require('../models/IssuedCertificate');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../middleware/AppError');
const logger = require('../utils/logger');

// ─── POST /api/certificates/register ─────────────────────────────────────────
// Called by the frontend immediately after a certificate email succeeds.
// Stores the steganographic hash + participant details in the DB.
exports.registerCertificate = asyncHandler(async (req, res) => {
  const { hash, recipientName, recipientEmail, eventName } = req.body;

  if (!hash || !recipientName || !recipientEmail) {
    throw new AppError('hash, recipientName, and recipientEmail are required', 400, 'MISSING_FIELDS');
  }

  // Idempotent: if the same hash is already registered (e.g. due to a retry), just return it
  const existing = await IssuedCertificate.findOne({ hash });
  if (existing) {
    return res.status(200).json({
      success: true,
      message: 'Certificate already registered',
      data: {
        hash: existing.hash,
        recipientName: existing.recipientName,
        recipientEmail: existing.recipientEmail,
        eventName: existing.eventName,
        issuedAt: existing.issuedAt,
      },
    });
  }

  const cert = await IssuedCertificate.create({
    hash,
    recipientName,
    recipientEmail,
    eventName: eventName || '',
    issuedBy: req.user?.id || null,
    issuedAt: new Date(),
  });

  logger.info(`[Cert] Registered certificate hash=${hash.slice(0, 12)}… for ${recipientEmail}`);

  res.status(201).json({
    success: true,
    message: 'Certificate registered successfully',
    data: {
      hash: cert.hash,
      recipientName: cert.recipientName,
      recipientEmail: cert.recipientEmail,
      eventName: cert.eventName,
      issuedAt: cert.issuedAt,
    },
  });
});

// ─── GET /api/certificates/verify/:hash ──────────────────────────────────────
// PUBLIC endpoint — no auth required.
// Extracts the hash from the URL and looks it up in the DB.
exports.verifyCertificate = asyncHandler(async (req, res) => {
  const { hash } = req.params;

  if (!hash || hash.length < 10) {
    throw new AppError('Invalid hash provided', 400, 'INVALID_HASH');
  }

  const cert = await IssuedCertificate.findOne({ hash })
    .select('hash recipientName eventName issuedAt')
    .lean();

  if (!cert) {
    return res.status(200).json({
      success: true,
      verified: false,
      message: 'Certificate not found in our records',
    });
  }

  res.status(200).json({
    success: true,
    verified: true,
    message: 'Certificate is authentic',
    data: {
      recipientName: cert.recipientName,
      eventName: cert.eventName,
      issuedAt: cert.issuedAt,
    },
  });
});

// ─── GET /api/certificates — List issued certs (admin only) ──────────────────
exports.listCertificates = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 50);
  const search = req.query.search || '';

  const filter = search
    ? {
        $or: [
          { recipientName: { $regex: search, $options: 'i' } },
          { recipientEmail: { $regex: search, $options: 'i' } },
          { eventName: { $regex: search, $options: 'i' } },
        ],
      }
    : {};

  const [certs, total] = await Promise.all([
    IssuedCertificate.find(filter)
      .sort({ issuedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('hash recipientName recipientEmail eventName issuedAt')
      .lean(),
    IssuedCertificate.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: { certs, total, page, pages: Math.ceil(total / limit) },
  });
});
