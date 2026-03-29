const { templates } = require('./server/src/services/mailService');
const fs = require('fs');
const path = require('path');

const mockRecipient = {
  name: 'John Doe',
  email: 'john@example.com',
  department: 'Computer Science',
  college: 'L.D. College of Engineering',
  clubName: 'Coding Club'
};

const mockData = {
  subject: 'Invitation to Tark Shaastra 2026',
  body: `We are thrilled to invite you to the upcoming edition of Lakshya!

Our annual technical fest is back with more innovation, competition, and learning than ever before. Visit our website for more details: https://lakshyaldce.in

Don't miss out on the Unstop registration: https://unstop.com/hackathons/tarkshastra-2k26-ldce-ahmedabad-1661815

Best regards,
Organizing Committee`,
  recipient: mockRecipient
};

// Generate HTML for multiple templates
const marketingHtml = templates.marketing(mockData);
const successHtml = templates.success({ ...mockData, subject: 'Registration Successful!' });
const importantHtml = templates.important({ ...mockData, subject: 'Update Regarding Your Submission' });

const outputDir = path.join(__dirname, 'temp_previews');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

fs.writeFileSync(path.join(outputDir, 'marketing_preview.html'), marketingHtml);
fs.writeFileSync(path.join(outputDir, 'success_preview.html'), successHtml);
fs.writeFileSync(path.join(outputDir, 'important_preview.html'), importantHtml);

console.log('Previews generated in temp_previews/');
