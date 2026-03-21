const ReferralCodeMapping = require('../models/ReferralCodeMapping');
const Registration = require('../models/Registration');
const AppError = require('../middleware/AppError');
const { normalizeReferralCode } = require('../utils/referralCode');

async function aggregateRegistrationCountsByCode() {
  const rows = await Registration.aggregate([
    { $match: { referralCodeUsed: { $exists: true, $nin: [null, ''] } } },
    {
      $addFields: {
        t: { $trim: { input: { $ifNull: ['$referralCodeUsed', ''] } } },
      },
    },
    { $match: { t: { $ne: '' } } },
    { $addFields: { normalizedReferralCode: { $toUpper: '$t' } } },
    {
      $group: {
        _id: '$normalizedReferralCode',
        count: { $sum: 1 },
        referralCodeSample: { $first: '$referralCodeUsed' },
      },
    },
  ]);
  return rows.map((r) => ({
    normalizedReferralCode: r._id,
    count: r.count,
    referralCodeDisplay: r.referralCodeSample || r._id,
  }));
}

async function getActiveMappingMap() {
  const mappings = await ReferralCodeMapping.find({ isActive: true }).lean();
  const byNorm = new Map();
  for (const m of mappings) {
    byNorm.set(m.normalizedReferralCode, m);
  }
  return byNorm;
}

const listMappings = async (query = {}) => {
  const { page = 1, limit = 50, search = '', includeInactive = 'false' } = query;
  const filter = {};
  if (includeInactive !== 'true' && includeInactive !== true) {
    filter.isActive = true;
  }
  if (search && String(search).trim()) {
    const q = String(search).trim();
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ referralCode: rx }, { caName: rx }, { normalizedReferralCode: rx }];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    ReferralCodeMapping.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    ReferralCodeMapping.countDocuments(filter),
  ]);
  return { items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 };
};

const createMapping = async (body) => {
  const normalizedReferralCode = normalizeReferralCode(body.referralCode);
  if (!normalizedReferralCode) {
    throw new AppError('Referral code is required', 422, 'INVALID_REFERRAL_CODE');
  }
  const exists = await ReferralCodeMapping.findOne({ normalizedReferralCode });
  if (exists) {
    throw new AppError('A mapping for this referral code already exists', 409, 'DUPLICATE_REFERRAL_CODE');
  }
  const doc = await ReferralCodeMapping.create({
    referralCode: body.referralCode.trim(),
    normalizedReferralCode,
    caName: body.caName.trim(),
    caEmail: body.caEmail != null ? String(body.caEmail).trim() : '',
    caPhone: body.caPhone != null ? String(body.caPhone).trim() : '',
    notes: body.notes != null ? String(body.notes).trim() : '',
    isActive: body.isActive !== false,
  });
  return doc;
};

const updateMapping = async (id, body) => {
  const doc = await ReferralCodeMapping.findById(id);
  if (!doc) throw new AppError('Referral mapping not found', 404, 'MAPPING_NOT_FOUND');

  if (body.referralCode !== undefined) {
    const normalizedReferralCode = normalizeReferralCode(body.referralCode);
    if (!normalizedReferralCode) {
      throw new AppError('Referral code is required', 422, 'INVALID_REFERRAL_CODE');
    }
    if (normalizedReferralCode !== doc.normalizedReferralCode) {
      const clash = await ReferralCodeMapping.findOne({ normalizedReferralCode });
      if (clash) {
        throw new AppError('A mapping for this referral code already exists', 409, 'DUPLICATE_REFERRAL_CODE');
      }
    }
    doc.referralCode = body.referralCode.trim();
    doc.normalizedReferralCode = normalizedReferralCode;
  }
  if (body.caName !== undefined) doc.caName = String(body.caName).trim();
  if (body.caEmail !== undefined) doc.caEmail = String(body.caEmail).trim();
  if (body.caPhone !== undefined) doc.caPhone = String(body.caPhone).trim();
  if (body.notes !== undefined) doc.notes = String(body.notes).trim();
  if (body.isActive !== undefined) doc.isActive = Boolean(body.isActive);

  await doc.save();
  return doc;
};

const getUnmappedUsedCodes = async () => {
  const counts = await aggregateRegistrationCountsByCode();
  const activeMap = await getActiveMappingMap();
  const unmapped = counts
    .filter((c) => !activeMap.has(c.normalizedReferralCode))
    .sort((a, b) => b.count - a.count);
  return unmapped;
};

const getAnalyticsSummary = async () => {
  const counts = await aggregateRegistrationCountsByCode();
  const activeMap = await getActiveMappingMap();

  let totalRegistrationsWithReferral = 0;
  let distinctMappedCodes = 0;
  let distinctUnmappedCodes = 0;
  let registrationsMapped = 0;
  let registrationsUnmapped = 0;

  for (const c of counts) {
    totalRegistrationsWithReferral += c.count;
    if (activeMap.has(c.normalizedReferralCode)) {
      distinctMappedCodes += 1;
      registrationsMapped += c.count;
    } else {
      distinctUnmappedCodes += 1;
      registrationsUnmapped += c.count;
    }
  }

  const totalActiveMappings = await ReferralCodeMapping.countDocuments({ isActive: true });

  return {
    totalRegistrationsWithReferral,
    distinctCodesUsed: counts.length,
    distinctMappedCodes,
    distinctUnmappedCodes,
    registrationsMapped,
    registrationsUnmapped,
    totalActiveMappings,
  };
};

const getLeaderboard = async ({ unmappedAtBottom = true } = {}) => {
  const counts = await aggregateRegistrationCountsByCode();
  const activeMap = await getActiveMappingMap();

  const rows = counts.map((c) => {
    const m = activeMap.get(c.normalizedReferralCode);
    return {
      normalizedReferralCode: c.normalizedReferralCode,
      referralCode: c.referralCodeDisplay,
      count: c.count,
      isMapped: Boolean(m),
      caName: m ? m.caName : null,
      mappingId: m ? m._id : null,
    };
  });

  rows.sort((a, b) => {
    if (unmappedAtBottom) {
      if (a.isMapped !== b.isMapped) return a.isMapped ? -1 : 1;
    }
    return b.count - a.count;
  });

  let rank = 0;
  const leaderboard = rows.map((row, i) => {
    rank = i + 1;
    return { rank, ...row };
  });

  return leaderboard;
};

const getCodeWiseAnalytics = async () => {
  const counts = await aggregateRegistrationCountsByCode();
  const activeMap = await getActiveMappingMap();
  const inactiveMappings = await ReferralCodeMapping.find({ isActive: false }).lean();
  const inactiveByNorm = new Map(inactiveMappings.map((m) => [m.normalizedReferralCode, m]));

  return counts
    .map((c) => {
      const active = activeMap.get(c.normalizedReferralCode);
      const inactive = inactiveByNorm.get(c.normalizedReferralCode);
      return {
        normalizedReferralCode: c.normalizedReferralCode,
        referralCode: c.referralCodeDisplay,
        count: c.count,
        caName: active ? active.caName : null,
        isMapped: Boolean(active),
        mappingInactive: !active && Boolean(inactive),
      };
    })
    .sort((a, b) => b.count - a.count);
};

module.exports = {
  listMappings,
  createMapping,
  updateMapping,
  getUnmappedUsedCodes,
  getAnalyticsSummary,
  getLeaderboard,
  getCodeWiseAnalytics,
  normalizeReferralCode,
};
