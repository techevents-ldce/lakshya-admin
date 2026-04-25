import api from '../../../../src/services/api';

/**
 * Send certificate email via internal API
 */
export async function sendCertificateEmail(
  member,
  certificateBlob,
  subject,
  body
) {
  try {
    const personalizedBody = body.replace(/\{\{name\}\}/g, member.fullName);

    // Convert Blob to Base64
    const base64Content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(certificateBlob);
    });

    const response = await api.post('/mail/send-certificate', {
      to: member.email,
      subject,
      html: personalizedBody.replace(/\n/g, '<br/>'),
      attachment: base64Content,
      filename: `${member.fullName.replace(/\s+/g, '_')}_Certificate.pdf`
    });

    return { success: true, data: response.data };
  } catch (error) {
    console.error('API error in sendCertificateEmail:', error);
    return {
      success: false,
      error: error.userMessage || error.message || 'Failed to send email'
    };
  }
}

/**
 * Send certificates to all members
 */
export async function sendCertificates(
  members,
  certificateBlobs,
  subject,
  body,
  onProgress
) {
  const progress = {
    total: members.length,
    sent: 0,
    failed: 0,
    failedRecipients: []
  };

  for (const member of members) {
    const certificateBlob = certificateBlobs.get(member.email);
    if (!certificateBlob) {
      progress.failed++;
      progress.failedRecipients.push({
        email: member.email,
        error: 'Certificate not found'
      });
      continue;
    }

    const result = await sendCertificateEmail(
      member,
      certificateBlob,
      subject,
      body
    );

    if (result.success) {
      progress.sent++;
    } else {
      progress.failed++;
      progress.failedRecipients.push({
        email: member.email,
        error: result.error || 'Unknown error'
      });
    }

    if (onProgress) {
      onProgress({ ...progress });
    }
  }

  return progress;
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(subject, body) {
  const errors = [];

  if (!subject.trim()) {
    errors.push('Subject line cannot be empty');
  }

  if (!body.trim()) {
    errors.push('Email body cannot be empty');
  }

  if (!body.includes('{{name}}')) {
    errors.push('Email body should include {{name}} placeholder for personalization');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
