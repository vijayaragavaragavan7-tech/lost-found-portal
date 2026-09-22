/**
 * Smart Matching System
 * ----------------------
 * Compares a Lost item against Found items (or vice versa) and produces
 * a similarity score out of 100 based on:
 *   - Item name / description similarity   (50%)
 *   - Category match                        (15%)
 *   - Location similarity                   (20%)
 *   - Date closeness                        (15%)
 *
 * A pair scoring >= MATCH_THRESHOLD is flagged as "Possible Match".
 */

const MATCH_THRESHOLD = 55;

// ---- Text similarity (Levenshtein-based, normalized 0-1) ----
function levenshtein(a, b) {
  a = a.toLowerCase().trim();
  b = b.toLowerCase().trim();
  const m = a.length,
    n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

function textSimilarity(a = "", b = "") {
  if (!a && !b) return 1;
  if (!a || !b) return 0;

  // Word-overlap score (handles reordered words like "wallet black" vs "black wallet")
  const wordsA = new Set(a.toLowerCase().trim().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().trim().split(/\s+/).filter(Boolean));
  let overlap = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) overlap++;
  });
  const wordScore = overlap / Math.max(wordsA.size, wordsB.size, 1);

  // Character-level score (handles typos / near matches)
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length, 1);
  const charScore = 1 - dist / maxLen;

  return Math.max(wordScore, charScore);
}

function dateCloseness(dateA, dateB, maxDaysApart = 14) {
  if (!dateA || !dateB) return 0;
  const d1 = new Date(dateA).getTime();
  const d2 = new Date(dateB).getTime();
  if (isNaN(d1) || isNaN(d2)) return 0;
  const diffDays = Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
  if (diffDays > maxDaysApart) return 0;
  return 1 - diffDays / maxDaysApart;
}

/**
 * Compute a match score (0-100) between a lost item and a found item.
 */
function computeMatchScore(lostItem, foundItem) {
  const nameScore = textSimilarity(lostItem.title, foundItem.title);
  const descScore = textSimilarity(lostItem.description, foundItem.description);
  const nameCombined = Math.max(nameScore, descScore * 0.8);

  const categoryScore =
    lostItem.category && foundItem.category && lostItem.category.toLowerCase() === foundItem.category.toLowerCase()
      ? 1
      : 0;

  const locationScore = textSimilarity(lostItem.location, foundItem.location);
  const dateScore = dateCloseness(lostItem.date, foundItem.date);

  const total =
    nameCombined * 50 + categoryScore * 15 + locationScore * 20 + dateScore * 15;

  return Math.round(total);
}

/**
 * Given one item and a list of candidate items from the opposite type,
 * return all matches above the threshold, sorted best-first.
 */
function findMatches(item, candidates) {
  return candidates
    .filter((c) => c.id !== item.id && c.status === "active")
    .map((c) => ({
      item: c,
      score: item.type === "lost" ? computeMatchScore(item, c) : computeMatchScore(c, item),
    }))
    .filter((m) => m.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score);
}

module.exports = { computeMatchScore, findMatches, MATCH_THRESHOLD };
