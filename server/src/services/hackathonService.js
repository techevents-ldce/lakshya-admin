/**
 * hackathonService.js
 *
 * All hackathon import and management logic lives here.
 * Zero changes to any shared model schema.
 *
 * EXCEL FORMAT — ONE ROW PER PERSON:
 *   Each row = one person (leader or member).
 *   Rows sharing the same teamName (or unstopTeamId) are grouped into one team.
 *   The row with teamRole = 'leader'/'lead'/… is the team leader.
 *   All other rows are members.
 *
 *   For the LEADER row, all fields are used to create/update the User record.
 *   For MEMBER rows, all fields are stored in HackathonTeam.members (raw data).
 *   Member User accounts are NOT created — only the leader gets a login account.
 *
 * DB SAFETY:
 *   selected   -> Registration.status = 'pending'    (portal allows payment)
 *   waitlisted -> Registration.status = 'waitlisted' (portal blocks payment)
 *   suspended  -> Registration.status = 'cancelled'  (portal blocks payment)
 *   restored   -> Registration.status = 'pending'    (payment re-enabled)
 */

const ExcelJS  = require('exceljs');
const fs       = require('fs');
const path     = require('path');

const HackathonTeam  = require('../models/HackathonTeam');
const User           = require('../models/User');
const Team           = require('../models/Team');
const TeamMember     = require('../models/TeamMember');
const Registration   = require('../models/Registration');
const Event          = require('../models/Event');
const Order          = require('../models/Order');
const AppError       = require('../middleware/AppError');
const { hashPassword }  = require('../utils/password');
const { writeAuditLog } = require('../middleware/auditLog');

// ─── Column aliases (case-insensitive, common variations) ────────────────────
const COLUMN_ALIASES = {
  // Team grouping
  teamName:     ['teamname', 'team name', 'team_name', 'team'],
  teamRole:     ['teamrole', 'team role', 'role', 'memberrole', 'member role', 'position', 'type', 'designation'],
  unstopTeamId: ['unstopteamid', 'unstop team id', 'unstop_team_id', 'unstop id', 'external id', 'externalid', 'teamid', 'tid'],
  status:       ['status', 'selection status', 'selectionstatus', 'team status'],

  // Personal details
  name:         ['name', 'fullname', 'full name', 'full_name', 'participant name', 'membername', 'member name', 'participant'],
  email:        ['email', 'emailaddress', 'email address', 'email id', 'mail', 'e-mail'],
  phone:        ['phone', 'mobile', 'contact', 'phonenumber', 'phone number', 'mobile number', 'contactnumber', 'contact number', 'ph no', 'phno'],
  gender:       ['gender', 'sex', 'gender/sex'],

  // Academic details
  collegeName:  ['collegename', 'college name', 'college_name', 'college', 'institution', 'university', 'institute', 'school'],
  department:   ['department', 'dept', 'branch', 'stream', 'specialization', 'specialisation', 'field', 'course'],
  year:         ['year', 'year of study', 'current year', 'yearofstudy', 'sem year', 'semester', 'study year', 'year of course'],

  // Social/professional profiles
  linkedin:     ['linkedin', 'linkedin url', 'linkedin profile', 'linkedinurl', 'linkedin link', 'linkedin id'],
  github:       ['github', 'github url', 'github profile', 'githuburl', 'github link', 'github id'],
};

/** Build headerIndex -> canonicalFieldName from the header row */
function buildHeaderMap(cells) {
  const map = {};
  cells.forEach((cell, idx) => {
    const raw = String(cell?.value ?? cell ?? '').trim().toLowerCase();
    for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(raw)) { map[idx] = canonical; break; }
    }
  });
  return map;
}

/** Extract a plain string from any exceljs cell value type */
function cellText(cell) {
  if (cell === null || cell === undefined)                 return '';
  if (typeof cell === 'object' && cell.text)               return String(cell.text).trim();
  if (typeof cell === 'object' && cell.richText)           return cell.richText.map((r) => r.text).join('').trim();
  if (typeof cell === 'object' && cell.result !== undefined) return String(cell.result).trim();
  return String(cell).trim();
}

/** Parse spreadsheet -> array of person-row objects */
async function parseSpreadsheet(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const wb  = new ExcelJS.Workbook();
  if (ext === '.csv') await wb.csv.readFile(filePath);
  else                await wb.xlsx.readFile(filePath);

  const ws = wb.worksheets[0];
  if (!ws) throw new AppError('Spreadsheet is empty', 400, 'EMPTY_SPREADSHEET');

  const rows = [];
  let headerMap = null;

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells = Array.isArray(row.values) ? row.values.slice(1) : [];
    if (rowNumber === 1) { headerMap = buildHeaderMap(cells); return; }
    if (!headerMap) return;

    const obj = {};
    cells.forEach((cell, idx) => {
      const field = headerMap[idx];
      if (field) obj[field] = cellText(cell);
    });

    if (Object.values(obj).some((v) => v !== '')) {
      rows.push({ ...obj, _row: rowNumber });
    }
  });

  if (!headerMap) throw new AppError('Could not read header row', 400, 'MISSING_HEADER');
  try { fs.unlinkSync(filePath); } catch { /* best effort */ }
  return rows;
}

/**
 * Group person-rows into teams.
 * Key: unstopTeamId (preferred, more precise) OR normalised teamName.
 */
function groupIntoTeams(rows) {
  const groups = new Map();
  for (const row of rows) {
    const teamName = (row.teamName || '').trim();
    if (!teamName) continue;
    const unstopId = (row.unstopTeamId || '').trim();
    const key      = unstopId ? `ustop:${unstopId.toLowerCase()}` : `name:${teamName.toLowerCase()}`;

    if (!groups.has(key)) {
      groups.set(key, { teamName, unstopTeamId: unstopId, status: '', collegeName: '', rows: [] });
    }
    const grp = groups.get(key);
    grp.rows.push(row);
    // Capture team-level fields from any row that has them
    if (row.status      && !grp.status)      grp.status      = row.status;
    if (row.collegeName && !grp.collegeName) grp.collegeName = row.collegeName;
  }
  return groups;
}

/** True if the teamRole string marks this person as the team leader */
function isLeader(roleStr) {
  if (!roleStr) return false;
  const r = roleStr.toLowerCase().trim();
  return ['leader', 'lead', 'captain', 'head'].includes(r);
}

/** Build a clean member data object from a row for storage in HackathonTeam.members */
function buildMemberData(row, roleLabel = 'member') {
  return {
    name:        (row.name        || '').trim(),
    email:       (row.email       || '').trim().toLowerCase(),
    phone:       (row.phone       || '').trim(),
    gender:      (row.gender      || '').trim(),
    collegeName: (row.collegeName || '').trim(),
    department:  (row.department  || '').trim(),
    year:        (row.year        || '').trim(),
    linkedin:    (row.linkedin    || '').trim(),
    github:      (row.github      || '').trim(),
    teamRole:    roleLabel,
  };
}

// ─── Default password ────────────────────────────────────────────────────────
const DEFAULT_PASSWORD = process.env.HACKATHON_DEFAULT_PASSWORD || 'Lakshya@2025';

// ─── importTeams ─────────────────────────────────────────────────────────────
/**
 * @param {string} filePath      - uploaded spreadsheet file path
 * @param {string} eventId       - hackathon Event ObjectId
 * @param {string} defaultStatus - 'selected' | 'waitlisted' (UI toggle)
 * @param {string} adminId       - importing admin's ObjectId
 */
const importTeams = async (filePath, eventId, defaultStatus, adminId) => {
  // Resolve the hackathon event — either by explicit ID or auto-detect
  let event;
  if (eventId && eventId !== 'hackathon') {
    event = await Event.findById(eventId).catch(() => null);
  }
  if (!event) {
    // Auto-detect: find event whose title or slug contains "hackathon"
    event = await Event.findOne({
      $or: [
        { title: { $regex: /hackathon/i } },
        { slug:  { $regex: /hackathon/i } },
      ],
    });
  }
  if (!event) throw new AppError('Hackathon event not found. Create it in Events first.', 404, 'EVENT_NOT_FOUND');


  const allRows = await parseSpreadsheet(filePath);
  if (allRows.length === 0) throw new AppError('Spreadsheet has no data rows', 400, 'NO_DATA_ROWS');

  const importBatch  = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const summary      = { created: 0, duplicates: 0, invalid: 0, errors: [], totalPersonRows: allRows.length };

  // Flag rows with missing teamName
  allRows.filter((r) => !(r.teamName || '').trim()).forEach((r) => {
    summary.invalid++;
    summary.errors.push({ row: r._row, reason: 'Missing teamName — cannot assign this person to any team', data: { name: r.name, email: r.email } });
  });

  const groups = groupIntoTeams(allRows.filter((r) => (r.teamName || '').trim()));
  summary.totalTeams = groups.size;

  for (const [, grp] of groups) {
    const { teamName, unstopTeamId, rows } = grp;

    const leaderRows = rows.filter((r) => isLeader(r.teamRole));
    const memberRows = rows.filter((r) => !isLeader(r.teamRole));

    // No leader row -> invalid
    if (leaderRows.length === 0) {
      summary.invalid++;
      summary.errors.push({
        row:    rows[0]._row,
        reason: `Team "${teamName}" has no leader row. Add a row with teamRole="leader".`,
        data:   { teamName },
      });
      continue;
    }

    const leaderRow    = leaderRows[0];
    const extraLeaders = leaderRows.slice(1);           // demote to members
    const allMembers   = [...memberRows, ...extraLeaders];

    const leaderEmail = (leaderRow.email || '').toLowerCase().trim();
    const leaderName  = (leaderRow.name  || '').trim();

    if (!leaderEmail) {
      summary.invalid++;
      summary.errors.push({ row: leaderRow._row, reason: `Leader of team "${teamName}" has no email`, data: { teamName } });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leaderEmail)) {
      summary.invalid++;
      summary.errors.push({ row: leaderRow._row, reason: `Invalid leader email "${leaderEmail}"`, data: { teamName } });
      continue;
    }

    // Determine selection status
    let selectionStatus = defaultStatus;
    const rawStatus = (grp.status || leaderRow.status || '').toLowerCase();
    if (rawStatus.includes('wait'))     selectionStatus = 'waitlisted';
    else if (rawStatus.includes('sel')) selectionStatus = 'selected';

    try {
      // ── Find or create leader User ──────────────────────────────────────────
      let leaderUser = await User.findOne({ email: leaderEmail });
      let isNewUser  = false;

      const yearNum = parseInt(leaderRow.year, 10);

      if (!leaderUser) {
        leaderUser = await User.create({
          name:         leaderName || leaderEmail.split('@')[0],
          email:        leaderEmail,
          phone:        leaderRow.phone || '',
          college:      grp.collegeName || leaderRow.collegeName || '',
          branch:       leaderRow.department || '',
          year:         !isNaN(yearNum) && yearNum >= 1 && yearNum <= 6 ? yearNum : undefined,
          passwordHash,
          role:         'participant',
          isActive:     true,
        });
        isNewUser = true;
      }

      // ── HackathonTeam duplicate check (only this — not Registration) ─────────
      // A HackathonTeam record means this leader was already imported. Skip.
      const existingHT = await HackathonTeam.findOne({ eventId: event._id, leaderId: leaderUser._id });
      if (existingHT) {
        summary.duplicates++;
        summary.errors.push({
          row:    leaderRow._row,
          reason: `Duplicate — "${leaderEmail}" is already imported as a team leader for this event`,
          data:   { teamName },
        });
        continue;
      }

      // ── Build members array with full profile data ─────────────────────────
      const members = [
        buildMemberData(leaderRow, 'leader'),
        ...allMembers.map((m) => buildMemberData(m, 'member')),
      ].filter((m) => m.name || m.email);

      const regStatus = selectionStatus === 'selected' ? 'pending' : 'waitlisted';

      // ── Find-or-create Team ───────────────────────────────────────────────
      // If this leader already has a Team record (e.g. from portal), reuse it.
      let team = await Team.findOne({ eventId: event._id, leaderId: leaderUser._id });
      if (!team) {
        team = await Team.create({ eventId: event._id, leaderId: leaderUser._id, teamName, status: 'active' });
        // Only add TeamMember for newly created teams
        const existingMember = await TeamMember.findOne({ teamId: team._id, userId: leaderUser._id });
        if (!existingMember) {
          await TeamMember.create({ teamId: team._id, userId: leaderUser._id, status: 'accepted' });
        }
      }

      // ── Find-or-create Registration ────────────────────────────────────────
      // If user registered via portal, we REUSE that registration and update
      // its status according to the import selection type.
      let registration = await Registration.findOne({ userId: leaderUser._id, eventId: event._id });
      if (registration) {
        // Update to reflect import selection status
        registration.status      = regStatus;
        registration.teamId      = registration.teamId || team._id;
        // Overwrite the portal's default memberCount (1) with the real size from the Excel import
        registration.memberCount = Math.max(registration.memberCount || 0, members.length);
        if (!registration.registrationData?.get?.('importSource')) {
          registration.registrationData = registration.registrationData || {};
          if (typeof registration.registrationData.set === 'function') {
            registration.registrationData.set('importSource', 'hackathon_import');
          }
        }
        await registration.save();
      } else {
        registration = await Registration.create({
          userId:           leaderUser._id,
          eventId:          event._id,
          teamId:           team._id,
          registrationMode: 'team',
          memberCount:      members.length,
          status:           regStatus,
          registrationData: {
            gender:       leaderRow.gender     || '',
            department:   leaderRow.department || '',
            linkedin:     leaderRow.linkedin   || '',
            github:       leaderRow.github     || '',
            importSource: 'hackathon_import',
          },
        });
      }

      // ── Create HackathonTeam ──────────────────────────────────────────────
      await HackathonTeam.create({
        eventId:         event._id,
        leaderId:        leaderUser._id,
        teamName,
        collegeName:     grp.collegeName || leaderRow.collegeName || '',
        leaderName:      leaderName      || leaderUser.name,
        leaderPhone:     leaderRow.phone || '',
        leaderEmail,
        members,
        teamId:          team._id,
        registrationId:  registration._id,
        selectionStatus,
        paymentEnabled:  selectionStatus === 'selected',
        unstopTeamId:    unstopTeamId || '',
        importBatch,
        importedBy:      adminId,
        importedAt:      new Date(),
      });

      await writeAuditLog({
        adminId,
        action:     'HACKATHON_IMPORT_TEAM',
        entityType: 'HackathonTeam',
        entityId:   team._id,
        before:     null,
        after:      { teamName, leaderEmail, selectionStatus, isNewUser, memberCount: members.length },
      });

      summary.created++;
    } catch (err) {
      summary.errors.push({ row: leaderRow._row, reason: err.message, data: { teamName, leaderEmail } });
      if (err.code === 11000) summary.duplicates++;
      else summary.invalid++;
    }

  }

  return { ...summary, importBatch };
};

// ─── List Teams ───────────────────────────────────────────────────────────────
const listTeams = async (query = {}) => {
  const { page = 1, limit = 20, eventId, selectionStatus, search, paymentStatus, importBatch } = query;

  const filter = {};
  if (eventId)         filter.eventId         = eventId;
  if (selectionStatus) filter.selectionStatus = selectionStatus;
  if (importBatch)     filter.importBatch      = importBatch;
  if (search) {
    filter.$or = [
      { teamName:    { $regex: search, $options: 'i' } },
      { leaderEmail: { $regex: search, $options: 'i' } },
      { leaderName:  { $regex: search, $options: 'i' } },
      { collegeName: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [hackathonTeams, total] = await Promise.all([
    HackathonTeam.find(filter)
      .skip(skip).limit(Number(limit)).sort({ createdAt: -1 })
      .populate('eventId',  'title slug')
      .populate('leaderId', 'name email phone college branch year isActive')
      .lean(),
    HackathonTeam.countDocuments(filter),
  ]);

  if (hackathonTeams.length > 0) {
    const regIds   = hackathonTeams.map((t) => t.registrationId).filter(Boolean);
    const regs     = await Registration.find({ _id: { $in: regIds } }).select('_id status orderId').lean();
    const regMap   = Object.fromEntries(regs.map((r) => [r._id.toString(), r]));
    const orderIds = regs.map((r) => r.orderId).filter(Boolean);
    let orderMap   = {};
    if (orderIds.length > 0) {
      const orders = await Order.find({ _id: { $in: orderIds } }).select('_id status').lean();
      orderMap = Object.fromEntries(orders.map((o) => [o._id.toString(), o]));
    }
    hackathonTeams.forEach((t) => {
      const reg   = regMap[t.registrationId?.toString()];
      const order = reg?.orderId ? orderMap[reg.orderId.toString()] : null;
      t.registrationStatus = reg?.status  || null;
      t.orderStatus        = order?.status || null;
      // A team is only "Paid" when:
      //   1. There is a successful Order (order.status === 'success'), AND
      //   2. The Registration is 'confirmed' (set by the portal fulfillment flow AFTER payment)
      // Importing a team resets registration.status to 'pending', so pre-existing
      // paid Orders do NOT incorrectly mark imported teams as paid.
      t.isPaid = order?.status === 'success' && reg?.status === 'confirmed';
    });

    if (paymentStatus === 'paid') {
      const paid = hackathonTeams.filter((t) => t.isPaid);
      return { teams: paid, total: paid.length, page: Number(page), pages: 1 };
    }
    if (paymentStatus === 'unpaid') {
      const unpaid = hackathonTeams.filter((t) => !t.isPaid);
      return { teams: unpaid, total: unpaid.length, page: Number(page), pages: 1 };
    }
  }

  return { teams: hackathonTeams, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
};

// ─── Get one team detail ──────────────────────────────────────────────────────
const getTeamDetail = async (id) => {
  const ht = await HackathonTeam.findById(id)
    .populate('eventId',        'title slug isPaid registrationFee')
    .populate('leaderId',       'name email phone college branch year isActive')
    .populate('teamId',         'teamName status')
    .populate('registrationId', 'status memberCount createdAt registrationData')
    .lean();
  if (!ht) throw new AppError('Hackathon team not found', 404, 'HACKATHON_TEAM_NOT_FOUND');

  if (ht.registrationId?.orderId) {
    const order = await Order.findById(ht.registrationId.orderId).lean();
    ht.order  = order;
    ht.isPaid = order?.status === 'success';
  } else {
    ht.isPaid = false;
  }
  return ht;
};

// ─── State transitions ────────────────────────────────────────────────────────
const promoteToSelected = async (hackathonTeamId, adminId, reqMeta = {}) => {
  const ht = await HackathonTeam.findById(hackathonTeamId);
  if (!ht) throw new AppError('Hackathon team not found', 404, 'HACKATHON_TEAM_NOT_FOUND');
  if (ht.selectionStatus !== 'waitlisted') throw new AppError('Only waitlisted teams can be promoted', 400, 'NOT_WAITLISTED');

  const before = { selectionStatus: ht.selectionStatus, paymentEnabled: ht.paymentEnabled };
  ht.selectionStatus = 'selected'; ht.paymentEnabled = true;
  await ht.save();
  await Registration.findByIdAndUpdate(ht.registrationId, { status: 'pending' });
  await writeAuditLog({ adminId, action: 'HACKATHON_PROMOTE_TEAM', entityType: 'HackathonTeam', entityId: ht._id, before, after: { selectionStatus: 'selected' }, ip: reqMeta.ip, userAgent: reqMeta.userAgent });
  return ht;
};

const suspendTeam = async (hackathonTeamId, adminId, reqMeta = {}) => {
  const ht = await HackathonTeam.findById(hackathonTeamId);
  if (!ht) throw new AppError('Hackathon team not found', 404, 'HACKATHON_TEAM_NOT_FOUND');
  if (['suspended', 'removed'].includes(ht.selectionStatus)) throw new AppError('Already inactive', 400, 'ALREADY_INACTIVE');

  const before = { selectionStatus: ht.selectionStatus, paymentEnabled: ht.paymentEnabled };
  ht.selectionStatus = 'suspended'; ht.paymentEnabled = false;
  await ht.save();
  await Registration.findByIdAndUpdate(ht.registrationId, { status: 'cancelled' });
  await writeAuditLog({ adminId, action: 'HACKATHON_SUSPEND_TEAM', entityType: 'HackathonTeam', entityId: ht._id, before, after: { selectionStatus: 'suspended' }, ip: reqMeta.ip, userAgent: reqMeta.userAgent });
  return ht;
};

const removeTeam = async (hackathonTeamId, adminId, reqMeta = {}) => {
  const ht = await HackathonTeam.findById(hackathonTeamId);
  if (!ht) throw new AppError('Hackathon team not found', 404, 'HACKATHON_TEAM_NOT_FOUND');

  const before = { selectionStatus: ht.selectionStatus };
  ht.selectionStatus = 'removed'; ht.paymentEnabled = false;
  await ht.save();
  await Registration.findByIdAndUpdate(ht.registrationId, { status: 'cancelled' });
  await writeAuditLog({ adminId, action: 'HACKATHON_REMOVE_TEAM', entityType: 'HackathonTeam', entityId: ht._id, before, after: { selectionStatus: 'removed' }, ip: reqMeta.ip, userAgent: reqMeta.userAgent });
  return ht;
};

const restoreTeam = async (hackathonTeamId, adminId, reqMeta = {}) => {
  const ht = await HackathonTeam.findById(hackathonTeamId);
  if (!ht) throw new AppError('Hackathon team not found', 404, 'HACKATHON_TEAM_NOT_FOUND');
  if (!['suspended', 'removed'].includes(ht.selectionStatus)) throw new AppError('Only suspended/removed teams can be restored', 400, 'NOT_RESTORABLE');

  const before = { selectionStatus: ht.selectionStatus, paymentEnabled: ht.paymentEnabled };
  ht.selectionStatus = 'selected'; ht.paymentEnabled = true;
  await ht.save();
  await Registration.findByIdAndUpdate(ht.registrationId, { status: 'pending' });
  await writeAuditLog({ adminId, action: 'HACKATHON_RESTORE_TEAM', entityType: 'HackathonTeam', entityId: ht._id, before, after: { selectionStatus: 'selected' }, ip: reqMeta.ip, userAgent: reqMeta.userAgent });
  return ht;
};

// ─── Import batches ───────────────────────────────────────────────────────────
const listImportBatches = async (eventId) => {
  const filter  = eventId ? { eventId } : {};
  const batches = await HackathonTeam.distinct('importBatch', filter);
  return batches.filter(Boolean).sort().reverse();
};

// ─── Delete team (full cascade) ───────────────────────────────────────────────
/**
 * Permanently deletes a hackathon team and ALL related records:
 *   HackathonTeam → Registration → Team → TeamMember
 *   User leader account is deleted ONLY if they have no other registrations.
 */
const deleteTeam = async (hackathonTeamId, adminId, reqMeta = {}) => {
  const ht = await HackathonTeam.findById(hackathonTeamId);
  if (!ht) throw new AppError('Hackathon team not found', 404, 'HACKATHON_TEAM_NOT_FOUND');

  const snap = {
    teamName:       ht.teamName,
    leaderEmail:    ht.leaderEmail,
    selectionStatus: ht.selectionStatus,
    importBatch:    ht.importBatch,
  };

  // 1. Delete Registration
  if (ht.registrationId) {
    await Registration.findByIdAndDelete(ht.registrationId);
  }

  // 2. Delete TeamMember entries + Team
  if (ht.teamId) {
    await TeamMember.deleteMany({ teamId: ht.teamId });
    await Team.findByIdAndDelete(ht.teamId);
  }

  // 3. Delete leader User ONLY if they have zero remaining registrations
  if (ht.leaderId) {
    const remainingRegs = await Registration.countDocuments({ userId: ht.leaderId });
    if (remainingRegs === 0) {
      await User.findByIdAndDelete(ht.leaderId);
    }
  }

  // 4. Delete HackathonTeam record
  await HackathonTeam.findByIdAndDelete(hackathonTeamId);

  await writeAuditLog({
    adminId,
    action:     'HACKATHON_DELETE_TEAM',
    entityType: 'HackathonTeam',
    entityId:   hackathonTeamId,
    before:     snap,
    after:      null,
    ip:         reqMeta.ip,
    userAgent:  reqMeta.userAgent,
  });

  return { deleted: true, teamName: snap.teamName };
};

// ─── Delete entire import batch ───────────────────────────────────────────────
/**
 * Deletes ALL teams that belong to a specific importBatch (optionally filtered by eventId).
 * Each team is fully cascaded via deleteTeam.
 */
const deleteBatch = async (importBatch, eventId, adminId, reqMeta = {}) => {
  if (!importBatch) throw new AppError('importBatch is required', 400, 'MISSING_BATCH');

  const filter = { importBatch };
  if (eventId) filter.eventId = eventId;

  const teams = await HackathonTeam.find(filter).lean();
  if (teams.length === 0) throw new AppError('No teams found for this batch', 404, 'BATCH_NOT_FOUND');

  let deletedCount = 0;
  const errors     = [];

  for (const ht of teams) {
    try {
      await deleteTeam(ht._id, adminId, reqMeta);
      deletedCount++;
    } catch (err) {
      errors.push({ teamName: ht.teamName, reason: err.message });
    }
  }

  await writeAuditLog({
    adminId,
    action:     'HACKATHON_DELETE_BATCH',
    entityType: 'HackathonTeam',
    entityId:   importBatch,
    before:     { teamCount: teams.length },
    after:      { deletedCount, errors: errors.length },
    ip:         reqMeta.ip,
    userAgent:  reqMeta.userAgent,
  });

  return { deletedCount, total: teams.length, importBatch, errors };
};

module.exports = { importTeams, listTeams, getTeamDetail, promoteToSelected, suspendTeam, removeTeam, restoreTeam, listImportBatches, deleteTeam, deleteBatch };
