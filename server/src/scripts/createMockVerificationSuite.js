/**
 * LAKSHYA MOCK VERIFICATION SUITE GENERATOR
 * Creates a targeted mock event, coordinator, and participants for testing the verification system.
 * Generates a verify_tickets.html file with QR codes for easy scanning.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const dns = require("node:dns/promises");
dns.setServers(["1.1.1.1"]);
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { hashPassword } = require('../utils/password');

// Models
const User = require('../models/User');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Ticket = require('../models/Ticket');

async function createSuite() {
  try {
    console.log('\n🚀 Starting Mock Verification Suite Generation...');

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const PASSWORD_HASH = await hashPassword('TestPassword123');

    // 1. Create Mock Events
    const soloEventData = {
      title: 'Solo Verification Test',
      category: 'Testing',
      eventType: 'solo',
      capacity: 50,
      registrationFee: 0,
      isPaid: false,
      description: 'A solo event for testing the ticket verification system.',
      venue: 'Lab 101',
      eventDate: new Date(Date.now() + 30 * 86400000),
      isRegistrationOpen: true
    };

    const teamEventData = {
      title: 'Team Verification Test',
      category: 'Testing',
      eventType: 'team',
      capacity: 20,
      registrationFee: 0,
      isPaid: false,
      teamSizeMin: 2,
      teamSizeMax: 3,
      description: 'A team event for testing member-level ticket verification.',
      venue: 'Hackathon Hall',
      eventDate: new Date(Date.now() + 31 * 86400000),
      isRegistrationOpen: true
    };

    let soloEvent = await Event.findOne({ title: soloEventData.title });
    if (soloEvent) {
      Object.assign(soloEvent, soloEventData);
      await soloEvent.save();
    } else {
      soloEvent = await Event.create(soloEventData);
      console.log('📅 Created Solo Mock Event:', soloEvent.title);
    }

    let teamEvent = await Event.findOne({ title: teamEventData.title });
    if (teamEvent) {
      Object.assign(teamEvent, teamEventData);
      await teamEvent.save();
    } else {
      teamEvent = await Event.create(teamEventData);
      console.log('📅 Created Team Mock Event:', teamEvent.title);
    }

    const events = [soloEvent, teamEvent];

    // 2. Create Coordinator
    const coordData = {
      name: 'Mock Coordinator',
      email: 'coordinator@test.com',
      passwordHash: PASSWORD_HASH,
      role: 'coordinator',
      isActive: true,
      assignedEvents: events.map(e => e._id)
    };

    let coord = await User.findOne({ email: coordData.email });
    if (coord) {
      console.log('ℹ️ Coordinator user already exists, updating...');
      coord.assignedEvents = events.map(e => e._id);
      await coord.save();
    } else {
      coord = await User.create(coordData);
      console.log('🎯 Created Coordinator:', coord.email);
    }

    // Update events coordinators list
    for (const ev of events) {
      if (!ev.coordinators.includes(coord._id)) {
        ev.coordinators.push(coord._id);
        await ev.save();
      }
    }

    // 3. Create Participants & Tickets (Solo)
    const ticketReport = [];

    const soloParticipants = [
      { name: 'John Solo (Valid)', email: 'participant.solo1@test.com' },
      { name: 'Jane Solo (Valid)', email: 'participant.solo2@test.com' }
    ];

    for (const p of soloParticipants) {
      const ticket = await setupParticipant(p, soloEvent, coord, null);
      ticketReport.push({ ...ticket, eventType: 'solo', eventTitle: soloEvent.title });
    }

    // 4. Create Team Participants & Tickets
    console.log('🤝 Setting up Team registrations...');
    const Team = require('../models/Team');
    const TeamMember = require('../models/TeamMember');

    const teamEmail = 'leader.team1@test.com';
    let leader = await User.findOne({ email: teamEmail });
    if (!leader) {
      leader = await User.create({ name: 'Team Leader', email: teamEmail, passwordHash: PASSWORD_HASH, role: 'participant', isActive: true });
    }

    let team = await Team.findOne({ eventId: teamEvent._id, leaderId: leader._id });
    if (!team) {
      team = await Team.create({ eventId: teamEvent._id, leaderId: leader._id, teamName: 'Test Alpha Team' });
    }

    const members = [
      { name: 'Team Leader (L)', email: teamEmail },
      { name: 'Team Member 1', email: 'member1.team1@test.com' }
    ];

    for (const m of members) {
      const ticket = await setupParticipant(m, teamEvent, coord, team._id);
      ticketReport.push({ ...ticket, eventType: 'team', eventTitle: teamEvent.title, teamName: team.teamName });
    }

    // 5. Generate HTML File
    const htmlContent = generateHtml(ticketReport);
    const htmlPath = path.join(__dirname, '..', '..', 'scripts', 'verify_tickets.html');

    // Ensure the directory exists
    const scriptsDir = path.join(__dirname, '..', '..', 'scripts');
    if (!fs.existsSync(scriptsDir)) {
      fs.mkdirSync(scriptsDir, { recursive: true });
    }

    fs.writeFileSync(htmlPath, htmlContent);
    console.log('\n✨ COMPLETE!');
    console.log(`📄 HTML Dashboard created at: ${htmlPath}`);
    console.log('💡 Open this file in your browser to start scanning.');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ ERROR:', err);
    process.exit(1);
  }
}

async function setupParticipant(p, event, coord, teamId) {
  let user = await User.findOne({ email: p.email });
  if (!user) {
    user = await User.create({
      name: p.name,
      email: p.email,
      passwordHash: await hashPassword('TestPassword123'),
      role: 'participant',
      isActive: true
    });
    console.log(`👤 Created ${teamId ? 'Team Member' : 'Participant'}: ${user.email}`);
  }

  // Create Registration
  let reg = await Registration.findOne({ userId: user._id, eventId: event._id });
  if (!reg) {
    reg = await Registration.create({
      userId: user._id,
      eventId: event._id,
      teamId: teamId || null,
      status: 'confirmed',
      registrationMode: teamId ? 'team' : 'individual',
      checkedIn: p.preScanned || false,
      checkedInAt: p.preScanned ? new Date() : null,
      checkedInBy: p.preScanned ? coord._id : null
    });
  }

  // Ensure TeamMember entry if teamId provided
  if (teamId) {
    const TeamMember = require('../models/TeamMember');
    await TeamMember.findOneAndUpdate(
      { teamId, userId: user._id },
      { status: 'accepted' },
      { upsert: true }
    );
  }

  // Create Ticket
  let ticket = await Ticket.findOne({ userId: user._id, eventId: event._id });
  if (!ticket) {
    const ticketId = `TEST-${uuidv4().split('-')[0].toUpperCase()}`;
    const qrData = await QRCode.toDataURL(ticketId, { width: 400 });

    ticket = await Ticket.create({
      ticketId,
      userId: user._id,
      eventId: event._id,
      registrationId: reg._id,
      teamId: teamId || null,
      qrData,
      status: p.preScanned ? 'used' : 'valid'
    });
    console.log(`🎟️ Generated Ticket for ${user.name}: ${ticketId}`);
  }

  return {
    userName: user.name,
    userEmail: user.email,
    ticketId: ticket.ticketId,
    status: ticket.status,
    qrData: ticket.qrData
  };
}

function generateHtml(tickets) {
  const ticketCards = tickets.map(t => `
    <div class="ticket-card ${t.status}">
      <div class="type-tag">${t.eventType.toUpperCase()}</div>
      <h3>${t.userName}</h3>
      <p>${t.userEmail}</p>
      <div class="meta">
        ${t.teamName ? `<strong>Team:</strong> ${t.teamName}<br>` : ''}
        <strong>Event:</strong> ${t.eventTitle}
      </div>
      <div class="ticket-id">ID: ${t.ticketId}</div>
      <div class="status-badge">${t.status.toUpperCase()}</div>
      <img src="${t.qrData}" alt="QR Code">
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ticket Verification Test Suite</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { color: #38bdf8; text-align: center; margin-bottom: 10px; }
        .subtitle { text-align: center; color: #94a3b8; margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
        .ticket-card { background: #1e293b; border-radius: 16px; padding: 25px; text-align: center; border: 1px solid #334155; transition: transform 0.2s; }
        .ticket-card:hover { transform: translateY(-5px); }
        .ticket-card.valid { border-top: 5px solid #22c55e; }
        .ticket-card.used { border-top: 5px solid #eab308; opacity: 0.8; }
        h3 { margin: 0 0 5px 0; font-size: 1.4rem; }
        p { margin: 0 0 15px 0; color: #94a3b8; }
        .type-tag { font-[10px] font-bold tracking-widest text-[#38bdf8] mb-2; }
        .meta { font-size: 0.8rem; color: #94a3b8; margin-bottom: 15px; background: #0f172a; padding: 10px; border-radius: 8px; text-align: left; }
        .ticket-id { font-family: monospace; background: #0f172a; padding: 5px 10px; border-radius: 4px; display: inline-block; margin-bottom: 20px; color: #38bdf8; }
        .status-badge { font-weight: bold; font-size: 0.8rem; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
        .valid .status-badge { background: #14532d; color: #4ade80; }
        .used .status-badge { background: #713f12; color: #fde047; }
        img { width: 100%; max-width: 250px; background: white; padding: 10px; border-radius: 8px; }
        .instructions { background: #1e293b; padding: 25px; border-radius: 12px; margin-bottom: 40px; border-left: 4px solid #38bdf8; }
        .instructions ol { padding-left: 20px; margin-top: 10px; }
        .instructions li { margin-bottom: 8px; }
        code { background: #0f172a; padding: 2px 6px; border-radius: 4px; color: #38bdf8; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎟️ Verification Test Suite</h1>
        <p class="subtitle">System End-to-End Verification Dashboard</p>
        
        <div class="instructions">
            <strong>How to test:</strong>
            <ol>
                <li>Open your application's <strong>Coordinator Portal</strong>.</li>
                <li>Login with: <code>coordinator@test.com</code> / <code>TestPassword123</code></li>
                <li>Navigate to the <strong>Assigned Events</strong> dashboard.</li>
                <li>Choose either <strong>Solo</strong> or <strong>Team</strong> verification test.</li>
                <li>Click <strong>Scan QR</strong> and scan the codes below.</li>
            </ol>
        </div>

        <div class="grid">
            ${ticketCards}
        </div>
    </div>
</body>
</html>
  `;
}

createSuite();
