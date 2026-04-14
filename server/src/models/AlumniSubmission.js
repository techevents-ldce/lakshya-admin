const mongoose = require('mongoose');

const ENGAGEMENT_ROLES = ['Guest', 'Judge', 'Speaker', 'Donor', 'Sponsor', 'Visitor'];
const QUALIFICATIONS = ['BE', 'ME', 'MCA'];

const alumniSubmissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    branch: { type: String, trim: true, default: '' },
    yearOfPassing: { type: Number },
    qualification: { type: String, enum: QUALIFICATIONS },
    companyName: { type: String, trim: true, default: '' },
    designation: { type: String, trim: true, default: '' },
    email: { type: String, lowercase: true, trim: true, default: '' },
    contactNumber: { type: String, trim: true, default: '' },
    engagementRoles: [{ type: String, enum: ENGAGEMENT_ROLES }],
    guestDetails: { type: mongoose.Schema.Types.Mixed, default: undefined },
    judgeDetails: { type: mongoose.Schema.Types.Mixed, default: undefined },
    speakerDetails: { type: mongoose.Schema.Types.Mixed, default: undefined },
    donorDetails: { type: mongoose.Schema.Types.Mixed, default: undefined },
    sponsorDetails: { type: mongoose.Schema.Types.Mixed, default: undefined },
    priority: { type: Boolean, default: false },
  },
  {
    collection: 'alumnisubmissions',
    timestamps: { createdAt: 'submittedAt', updatedAt: 'updatedAt' },
  }
);

alumniSubmissionSchema.index({ submittedAt: -1 });
alumniSubmissionSchema.index({ branch: 1 });
alumniSubmissionSchema.index({ engagementRoles: 1 });
alumniSubmissionSchema.index({ priority: -1, submittedAt: -1 });

const AlumniSubmission = mongoose.model('AlumniSubmission', alumniSubmissionSchema);
AlumniSubmission.ENGAGEMENT_ROLES = ENGAGEMENT_ROLES;
AlumniSubmission.QUALIFICATIONS = QUALIFICATIONS;
module.exports = AlumniSubmission;
