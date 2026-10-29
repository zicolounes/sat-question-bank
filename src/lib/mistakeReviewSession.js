import { uniq } from './filtering';

/**
 * Build up to `targetCount` questions for a "review mistakes" practice session:
 * missed items first (in given order), then other bank questions matching the same
 * skills (or domains if no skills), without duplicates.
 *
 * @param {object[]} questions full bank
 * @param {{ questionId: number, ts?: string }[]} mistakeItems wrong attempts (newest-first is typical)
 * @param {number} [targetCount=10]
 * @returns {object[]}
 */
export function buildMistakeReviewSessionQuestions(questions, mistakeItems, targetCount = 10) {
  const cap = Math.max(1, Math.floor(Number(targetCount) || 10));
  const list = Array.isArray(questions) ? questions : [];
  const items = Array.isArray(mistakeItems) ? mistakeItems : [];

  const byId = new Map(list.map((q) => [Number(q.id), q]));

  const mistakeQs = [];
  for (const it of items) {
    const id = Number(it.questionId);
    if (!Number.isFinite(id)) continue;
    const q = byId.get(id);
    if (q) mistakeQs.push(q);
  }

  const skills = uniq(mistakeQs.map((q) => String(q.skill || '').trim()).filter(Boolean));
  const domains = uniq(mistakeQs.map((q) => String(q.domain || '').trim()).filter(Boolean));

  let candidates = [];
  if (skills.length) {
    const skillSet = new Set(skills);
    candidates = list.filter((q) => skillSet.has(q.skill));
  } else if (domains.length) {
    const domainSet = new Set(domains);
    candidates = list.filter((q) => domainSet.has(q.domain));
  } else {
    candidates = [...mistakeQs];
  }

  const seen = new Set();
  const ordered = [];

  for (const it of items) {
    const id = Number(it.questionId);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    const q = byId.get(id);
    if (!q) continue;
    seen.add(id);
    ordered.push(q);
    if (ordered.length >= cap) return ordered;
  }

  for (const q of candidates) {
    const id = Number(q.id);
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(q);
    if (ordered.length >= cap) break;
  }

  return ordered;
}
