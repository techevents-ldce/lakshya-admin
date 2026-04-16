const mongoose = require('mongoose');
const Event = require('./server/src/models/Event');
const Team = require('./server/src/models/Team');
const Registration = require('./server/src/models/Registration');
const HackathonTeam = require('./server/src/models/HackathonTeam');
const TeamMember = require('./server/src/models/TeamMember');
require('dotenv').config({ path: './server/.env' });

async function run() {
  try {
    console.log('Connecting to', process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected');

    const event = await Event.findOne({slug: 'hackathon'});
    console.log('--- HACKATHON DB COUNTS ---');
    console.log('HackathonTeams collection:', await HackathonTeam.countDocuments({eventId: event._id}));
    
    // How many total members in HackathonTeams?
    const hts = await HackathonTeam.find({eventId: event._id}).lean();
    let members = 0;
    hts.forEach(ht => { members += (ht.members && ht.members.length > 0 ? ht.members.length : 1); });
    console.log('HackathonTeam Members total:', members);

    console.log('Team collection:', await Team.countDocuments({eventId: event._id}));
    
    const teams = await Team.find({eventId: event._id}).lean();
    const teamIds = teams.map(t => t._id);
    console.log('TeamMember collection for Hackathon:', await TeamMember.countDocuments({teamId: {$in: teamIds}}));

    console.log('Registration collection:', await Registration.countDocuments({eventId: event._id, status: {$ne: 'cancelled'}}));

    const { getEventRegistrationMetrics } = require('./server/src/services/analytics/eventRegistrationMetricsService');
    const metrics = await getEventRegistrationMetrics({ eventId: event._id.toString() });
    console.log('getEventRegistrationMetrics result:', JSON.stringify(metrics.events[0], null, 2));

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
