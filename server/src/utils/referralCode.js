/**
 * Normalize referral codes for deduplication and matching (trim + uppercase).
 */
function normalizeReferralCode(code) {
  if (code == null || typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

module.exports = { normalizeReferralCode };
