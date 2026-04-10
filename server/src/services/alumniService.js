const AlumniSubmission = require('../models/AlumniSubmission');
const AppError = require('../middleware/AppError');
const mongoose = require('mongoose');

const parseRolesParam = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const buildListFilter = (query) => {
  const filter = {};
  const branch = query.branch;
  if (branch && String(branch).trim()) {
    filter.branch = { $regex: String(branch).trim(), $options: 'i' };
  }
  const roles = parseRolesParam(query.engagementRoles);
  if (roles.length > 0) {
    filter.engagementRoles = { $in: roles };
  }
  return filter;
};

const listSubmissions = async (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sortField = 'submittedAt';
  const sortDir = query.order === 'asc' ? 1 : -1;

  const filter = buildListFilter(query);
  const skip = (page - 1) * limit;

  const [submissions, total] = await Promise.all([
    AlumniSubmission.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ [sortField]: sortDir })
      .lean(),
    AlumniSubmission.countDocuments(filter),
  ]);

  return {
    submissions,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  };
};

const getSubmissionById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid submission ID', 400, 'INVALID_ALUMNI_ID');
  }
  const doc = await AlumniSubmission.findById(id).lean();
  if (!doc) throw new AppError('Alumni submission not found', 404, 'ALUMNI_NOT_FOUND');
  return doc;
};

const togglePriority = async (id, body = {}) => {
  const doc = await AlumniSubmission.findById(id);
  if (!doc) throw new AppError('Alumni submission not found', 404, 'ALUMNI_NOT_FOUND');

  if (typeof body.priority === 'boolean') {
    doc.priority = body.priority;
  } else {
    doc.priority = !doc.priority;
  }
  await doc.save();
  return doc.toObject();
};

const csvEscape = (val) => {
  if (val === null || val === undefined) return '';
  const s = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const buildCsv = (rows) => {
  const headers = [
    'id',
    'name',
    'branch',
    'yearOfPassing',
    'qualification',
    'companyName',
    'designation',
    'email',
    'contactNumber',
    'engagementRoles',
    'priority',
    'submittedAt',
    'guestDetails',
    'judgeDetails',
    'speakerDetails',
    'donorDetails',
    'sponsorDetails',
  ];
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r._id),
        csvEscape(r.name),
        csvEscape(r.branch),
        csvEscape(r.yearOfPassing),
        csvEscape(r.qualification),
        csvEscape(r.companyName),
        csvEscape(r.designation),
        csvEscape(r.email),
        csvEscape(r.contactNumber),
        csvEscape((r.engagementRoles || []).join(';')),
        csvEscape(r.priority),
        csvEscape(r.submittedAt ? new Date(r.submittedAt).toISOString() : ''),
        csvEscape(r.guestDetails),
        csvEscape(r.judgeDetails),
        csvEscape(r.speakerDetails),
        csvEscape(r.donorDetails),
        csvEscape(r.sponsorDetails),
      ].join(',')
    );
  }
  return lines.join('\r\n');
};

const exportSubmissionsCsv = async (query) => {
  const filter = buildListFilter(query);
  const rows = await AlumniSubmission.find(filter).sort({ submittedAt: -1 }).lean();
  return buildCsv(rows);
};

module.exports = {
  listSubmissions,
  getSubmissionById,
  togglePriority,
  exportSubmissionsCsv,
  buildListFilter,
  parseRolesParam,
};
