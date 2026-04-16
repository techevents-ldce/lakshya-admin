/**
 * Dashboard-only grouping for "college" free text.
 * Does not change stored user data or schema — merges counts when building analytics.
 *
 * Add entries to COLLEGE_DISPLAY_ALIASES: key = normalizeKey("what users type"), value = label to show.
 */

function normalizeKey(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[.,\-_'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toTitleCase(s) {
  return String(s)
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

/**
 * Map normalized spellings → single dashboard label.
 * Extend this list as you discover new variants (run normalizeKey on each variant for the key).
 */
const COLLEGE_DISPLAY_ALIASES = {
  ld: 'LD College of Engineering',
  'ld college': 'LD College of Engineering',
  ldce: 'LD College of Engineering',
  'ldce ahmedabad': 'LD College of Engineering',
  'ld college of engineering': 'LD College of Engineering',
  'ld college of engineering ahmedabad': 'LD College of Engineering',
  ldceahmedabad: 'LD College of Engineering',
  'l d college of engineering': 'LD College of Engineering',
  'ld engg': 'LD College of Engineering',
  'ld eng': 'LD College of Engineering',
};

/**
 * @param {Array<{ _id: string, count: number }>} buckets - raw $group by college from User
 * @param {number} limit - max rows after merge (default top 10 for chart)
 */
function mergeCollegeStatsForDisplay(buckets, limit = 10) {
  if (!Array.isArray(buckets)) return [];
  const merged = new Map();
  const rawVariantsMap = new Map(); // displayLabel -> Set(rawCollegeName)
  for (const row of buckets) {
    const raw = row._id;
    const count = Number(row.count) || 0;
    if (!raw || !String(raw).trim()) continue;
    const nk = normalizeKey(raw);
    const display = COLLEGE_DISPLAY_ALIASES[nk] || toTitleCase(String(raw));
    merged.set(display, (merged.get(display) || 0) + count);
    if (!rawVariantsMap.has(display)) rawVariantsMap.set(display, new Set());
    rawVariantsMap.get(display).add(String(raw));
  }
  return [...merged.entries()]
    .map(([_id, count]) => ({
      _id,
      count,
      // Helps audit/trace where merged labels came from.
      rawVariants: rawVariantsMap.has(_id) ? [...rawVariantsMap.get(_id)].sort() : [],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

module.exports = {
  mergeCollegeStatsForDisplay,
  normalizeKey,
  COLLEGE_DISPLAY_ALIASES,
};
