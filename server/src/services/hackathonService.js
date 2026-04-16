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
 *   For MEMBER rows, User accounts and TeamMember entries are created to link them to the team.
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
const { generateCSV, generateExcel } = require('../utils/export');

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

  // Custom import flags
  referralCode:    ['referralcode', 'referral code', 'referral_code', 'ca code', 'ca-ref-code', 'ca_code', 'ref code', 'ref_code'],
  defaultPassword: ['defaultpassword', 'default password', 'default_password', 'password', 'pass', 'default-pass', 'default_pass'],
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
async function parseSpreadsheet(filePath, shouldDelete = true) {
  const ext = path.extname(filePath).toLowerCase();
  const wb  = new ExcelJS.Workbook();
  if (ext === '.csv') await wb.csv.readFile(filePath);
  else                await wb.xlsx.readFile(filePath);

  const ws = wb.worksheets[0];
  if (!ws) throw new AppError('Spreadsheet is empty', 400, 'EMPTY_SPREADSHEET');

  const rows = [];
  let headerMap = null;
  let rawHeaders = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells = Array.isArray(row.values) ? row.values.slice(1) : [];
    if (rowNumber === 1) {
      headerMap = buildHeaderMap(cells);
      rawHeaders = cells.map(c => cellText(c));
      return;
    }
    if (!headerMap) return;

    const obj = {};
    cells.forEach((cell, idx) => {
      const field = headerMap[idx];
      if (field) obj[field] = cellText(cell);
      // Also store raw values for custom mapping usage if needed
      obj[`raw_${idx}`] = cellText(cell);
    });

    if (Object.values(obj).some((v) => v !== '')) {
      rows.push({ ...obj, _row: rowNumber, _rawValues: cells.map(c => cellText(c)) });
    }
  });

  if (!headerMap) throw new AppError('Could not read header row', 400, 'MISSING_HEADER');
  if (shouldDelete) {
    try { fs.unlinkSync(filePath); } catch { /* best effort */ }
  }
  return { rows, headers: rawHeaders };
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

// ─── Phase 1: Parse ──────────────────────────────────────────────────────────
const getHeadersAndPreview = async (filePath) => {
  const { rows, headers } = await parseSpreadsheet(filePath, false); // don't delete yet
  const preview = rows.slice(0, 5).map(r => {
    const p = {};
    headers.forEach((h, i) => { p[h] = r._rawValues[i] || ''; });
    return p;
  });
  return { headers, preview };
};

// ─── Phase 2: Validate ───────────────────────────────────────────────────────
const validateImportData = async (filePath, mappings) => {
  const { rows, headers } = await parseSpreadsheet(filePath, false); // don't delete yet
  
  const mappedRows = rows.map(r => {
    const mapped = { _row: r._row };
    Object.entries(mappings).forEach(([header, field]) => {
      const idx = headers.indexOf(header);
      if (idx !== -1) mapped[field] = r._rawValues[idx];
    });
    return mapped;
  });

  const validNodesPreview = [];
  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;

  for (const row of mappedRows) {
    if (row.email && row.teamName && row.name) {
      validCount++;
      if (validNodesPreview.length < 10) {
        validNodesPreview.push({
          name: row.name,
          teamName: row.teamName,
          email: row.email
        });
      }
    } else {
      invalidCount++;
    }
  }

  return { validCount, invalidCount, duplicateCount, validNodesPreview };
};

// ─── Phase 3: Execute ────────────────────────────────────────────────────────

// ─── importTeams ─────────────────────────────────────────────────────────────
/**
 * @param {string} filePath      - uploaded spreadsheet file path
 * @param {string} eventId       - hackathon Event ObjectId
 * @param {string} defaultStatus - 'selected' | 'waitlisted' (UI toggle)
 * @param {string} adminId       - importing admin's ObjectId
 */
const importTeams = async (filePath, eventId, defaultStatus, adminId) => {
  const { rows: allRows } = await parseSpreadsheet(filePath);
  if (allRows.length === 0) throw new AppError('Spreadsheet has no data rows', 400, 'NO_DATA_ROWS');

  // Resolve the hackathon event — either by explicit ID or auto-detect
  let event;
  if (eventId && eventId !== 'hackathon') {
    event = await Event.findById(eventId).catch(() => null);
  }
  if (!event) {
    event = await Event.findOne({
      $or: [{ title: { $regex: /hackathon/i } }, { slug: { $regex: /hackathon/i } }],
    });
  }
  if (!event) throw new AppError('Hackathon event not found', 404, 'EVENT_NOT_FOUND');

  return processImportRows(allRows, event, defaultStatus, adminId);
};

const processImportRows = async (allRows, event, defaultStatus, adminId) => {
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
      const customPass = (leaderRow.defaultPassword || '').trim();
      const userData = {
        name:         leaderName || leaderEmail.split('@')[0],
        phone:        leaderRow.phone || '',
        college:      grp.collegeName || leaderRow.collegeName || '',
        branch:       leaderRow.department || '',
        year:         !isNaN(yearNum) && yearNum >= 1 && yearNum <= 6 ? yearNum : undefined,
      };

      if (customPass) {
        userData.passwordHash = await hashPassword(customPass);
      }

      if (!leaderUser) {
        leaderUser = await User.create({
          ...userData,
          email:        leaderEmail,
          passwordHash: userData.passwordHash || passwordHash,
          role:         'participant',
          isActive:     true,
        });
        isNewUser = true;
      } else {
        // Update existing user fields
        Object.assign(leaderUser, userData);
        await leaderUser.save();
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

      // ── Find-or-create Team (atomic upsert prevents race-condition duplicates) ─────
      // If this leader already has a Team record (e.g. from portal), reuse it.
      // Using findOneAndUpdate with upsert avoids the window between findOne + create
      // that allowed two Team documents to be created for the same (eventId, leaderId).
      const team = await Team.findOneAndUpdate(
        { eventId: event._id, leaderId: leaderUser._id },
        { $setOnInsert: { eventId: event._id, leaderId: leaderUser._id, teamName, status: 'active' } },
        { upsert: true, new: true }
      );
      // Always ensure leader is in TeamMember
      const existingLeaderMember = await TeamMember.findOne({ teamId: team._id, userId: leaderUser._id });
      if (!existingLeaderMember) {
        await TeamMember.create({ teamId: team._id, userId: leaderUser._id, status: 'accepted' });
      }

      // ── Find-or-create Users & TeamMembers for ALL members ──────────────────
      for (const mRow of allMembers) {
        const mEmail = (mRow.email || '').toLowerCase().trim();
        const mName  = (mRow.name  || '').trim();
        if (!mEmail) continue;

        let mUser = await User.findOne({ email: mEmail });
        const mYearNum = parseInt(mRow.year, 10);
        const mCustomPass = (mRow.defaultPassword || '').trim();
        const mUserData = {
          name:         mName || mEmail.split('@')[0],
          phone:        mRow.phone || '',
          college:      mRow.collegeName || grp.collegeName || '',
          branch:       mRow.department || '',
          year:         !isNaN(mYearNum) && mYearNum >= 1 && mYearNum <= 6 ? mYearNum : undefined,
        };

        if (mCustomPass) {
          mUserData.passwordHash = await hashPassword(mCustomPass);
        }

        if (!mUser) {
          mUser = await User.create({
            ...mUserData,
            email:        mEmail,
            passwordHash: mUserData.passwordHash || passwordHash,
            role:         'participant',
            isActive:     true,
          });
        } else {
          // Update existing member fields
          Object.assign(mUser, mUserData);
          await mUser.save();
        }

        const existingTM = await TeamMember.findOne({ teamId: team._id, userId: mUser._id });
        if (!existingTM) {
          await TeamMember.create({ teamId: team._id, userId: mUser._id, status: 'accepted' });
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
        
        // Update referral code if provided in import and not already set
        const refCode = (leaderRow.referralCode || '').trim();
        if (refCode && !registration.referralCodeUsed) {
          registration.referralCodeUsed = refCode.toUpperCase();
        }

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
          referralCodeUsed: (leaderRow.referralCode || '').trim().toUpperCase() || null,
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
  const findQuery = HackathonTeam.find(filter).sort({ createdAt: -1 })
    .populate('eventId',  'title slug')
    .populate('leaderId', 'name email phone college branch year isActive');

  // If filtering by payment status, we must fetch more to filter in-memory since isPaid is derived
  const hackathonTeams = (paymentStatus === 'paid' || paymentStatus === 'unpaid')
    ? await findQuery.lean() // Fetch all for in-memory filtering (safe for typical hackathon sizes)
    : await findQuery.skip(skip).limit(Number(limit)).lean();

  const totalRaw = await HackathonTeam.countDocuments(filter);

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
      const filtered = hackathonTeams.filter((t) => t.isPaid);
      const totalFiltered = filtered.length;
      const paginated = filtered.slice(skip, skip + Number(limit));
      return { teams: paginated, total: totalFiltered, page: Number(page), pages: Math.ceil(totalFiltered / Number(limit)) };
    }
    if (paymentStatus === 'unpaid') {
      const filtered = hackathonTeams.filter((t) => !t.isPaid);
      const totalFiltered = filtered.length;
      const paginated = filtered.slice(skip, skip + Number(limit));
      return { teams: paginated, total: totalFiltered, page: Number(page), pages: Math.ceil(totalFiltered / Number(limit)) };
    }
  }

  return { teams: hackathonTeams, total: totalRaw, page: Number(page), pages: Math.ceil(totalRaw / Number(limit)) };
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
    const members = await TeamMember.find({ teamId: ht.teamId }).lean();
    const memberUserIds = members.map((m) => m.userId);

    await TeamMember.deleteMany({ teamId: ht.teamId });
    await Team.findByIdAndDelete(ht.teamId);

    // 2.1 Delete member Users ONLY if they have zero remaining registrations
    for (const mUserId of memberUserIds) {
      if (!mUserId) continue;
      const remainingRegs = await Registration.countDocuments({ userId: mUserId });
      if (remainingRegs === 0) {
        await User.findByIdAndDelete(mUserId);
      }
    }
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

const finalizeImport = async (filePath, mappings, adminId) => {
  const { rows, headers } = await parseSpreadsheet(filePath, true); // final step, delete file
  
  // Resolve hackathon event
  const event = await Event.findOne({
    $or: [{ title: { $regex: /hackathon/i } }, { slug: { $regex: /hackathon/i } }]
  });
  if (!event) throw new AppError('Hackathon event not found', 404);

  const mappedRows = rows.map(r => {
    const mapped = { _row: r._row };
    Object.entries(mappings).forEach(([header, field]) => {
      const idx = headers.indexOf(header);
      if (idx !== -1) mapped[field] = r._rawValues[idx];
    });
    return mapped;
  });

  return processImportRows(mappedRows, event, 'selected', adminId);
};

// ─── Export paid teams ────────────────────────────────────────────────────────
/**
 * Exports ALL paid hackathon teams (one row per member) to CSV or Excel.
 * Supports optional filters: selectionStatus, importBatch, teamIds (specific team IDs).
 */
const exportPaidTeams = async (filters = {}) => {
  const { format = 'csv', selectionStatus, importBatch, teamIds } = filters;

  // Build base filter — always fetch all matching teams then filter by isPaid
  const filter = {};
  if (selectionStatus) filter.selectionStatus = selectionStatus;
  if (importBatch)     filter.importBatch     = importBatch;
  if (teamIds && teamIds.length > 0) filter._id = { $in: teamIds };

  const hackathonTeams = await HackathonTeam.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  if (!hackathonTeams.length) {
    throw new AppError('No hackathon teams found matching filters', 404, 'NO_TEAMS_FOUND');
  }

  // Resolve isPaid for each team
  const regIds   = hackathonTeams.map((t) => t.registrationId).filter(Boolean);
  const regs     = await Registration.find({ _id: { $in: regIds } }).select('_id status orderId').lean();
  const regMap   = Object.fromEntries(regs.map((r) => [r._id.toString(), r]));
  const orderIds = regs.map((r) => r.orderId).filter(Boolean);
  let orderMap   = {};
  if (orderIds.length > 0) {
    const orders = await Order.find({ _id: { $in: orderIds } }).select('_id status updatedAt').lean();
    orderMap = Object.fromEntries(orders.map((o) => [o._id.toString(), o]));
  }

  // Flatten: one row per member, only for paid teams
  const rows = [];
  for (const t of hackathonTeams) {
    const reg   = regMap[t.registrationId?.toString()];
    const order = reg?.orderId ? orderMap[reg.orderId.toString()] : null;
    const isPaid = order?.status === 'success' && reg?.status === 'confirmed';
    if (!isPaid) continue;

    const paidAt = order?.updatedAt ? new Date(order.updatedAt).toISOString().split('T')[0] : 'N/A';

    const members = t.members && t.members.length > 0 ? t.members : [{
      name: t.leaderName, email: t.leaderEmail, phone: t.leaderPhone,
      collegeName: t.collegeName, department: '', year: '', teamRole: 'leader',
    }];

    for (const m of members) {
      rows.push({
        teamName:        t.teamName                 || 'N/A',
        memberRole:      m.teamRole                 || 'member',
        name:            m.name                     || 'N/A',
        email:           m.email                    || 'N/A',
        phone:           m.phone                    || 'N/A',
        collegeName:     m.collegeName || t.collegeName || 'N/A',
        department:      m.department               || 'N/A',
        year:            m.year                     || 'N/A',
        leaderEmail:     t.leaderEmail              || 'N/A',
        selectionStatus: t.selectionStatus          || 'N/A',
        importBatch:     t.importBatch              || 'N/A',
        unstopTeamId:    t.unstopTeamId             || 'N/A',
        paidAt,
      });
    }
  }

  if (!rows.length) {
    throw new AppError('No paid hackathon teams found matching filters', 404, 'NO_PAID_TEAMS_FOUND');
  }

  if (format === 'excel') {
    const columns = [
      { header: 'Team Name',        key: 'teamName',        width: 25 },
      { header: 'Role',             key: 'memberRole',      width: 10 },
      { header: 'Name',             key: 'name',            width: 25 },
      { header: 'Email',            key: 'email',           width: 30 },
      { header: 'Phone',            key: 'phone',           width: 15 },
      { header: 'College',          key: 'collegeName',     width: 30 },
      { header: 'Department',       key: 'department',      width: 20 },
      { header: 'Year',             key: 'year',            width: 8  },
      { header: 'Leader Email',     key: 'leaderEmail',     width: 30 },
      { header: 'Selection Status', key: 'selectionStatus', width: 15 },
      { header: 'Import Batch',     key: 'importBatch',     width: 18 },
      { header: 'Unstop Team ID',   key: 'unstopTeamId',    width: 15 },
      { header: 'Paid At',          key: 'paidAt',          width: 12 },
    ];
    return generateExcel(rows, columns, 'Paid Teams');
  }

  const fields = ['teamName', 'memberRole', 'name', 'email', 'phone', 'collegeName', 'department', 'year', 'leaderEmail', 'selectionStatus', 'importBatch', 'unstopTeamId', 'paidAt'];
  return generateCSV(rows, fields);
};

module.exports = { 
  importTeams, 
  getHeadersAndPreview, 
  validateImportData,
  finalizeImport,
  listTeams, 
  getTeamDetail, 
  promoteToSelected, 
  suspendTeam, 
  removeTeam, 
  restoreTeam, 
  listImportBatches, 
  deleteTeam, 
  deleteBatch,
  exportPaidTeams,
};
