/**
 * Reports every question that likely needs image assets for practice/full test.
 * Writes data/QUESTIONS-NEEDING-IMAGES.md and prints a JSON summary.
 *
 * Categories:
 *  1) imageMCQ — MCQ with all choices empty → per-option files public/question-images/{id}A..D.png|jpg|jpeg
 *  2) imageUrlSet — non-empty image_url → add/replace that asset (paths under /question-images/ live in public/question-images/)
 *  3) keywordStem — no image_url but stem/choices mention graphs/tables/etc. (heuristic)
 */
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const jsonPath = path.join(projectRoot, 'data', 'questions.json');
const outMdPath = path.join(projectRoot, 'data', 'QUESTIONS-NEEDING-IMAGES.md');

const qs = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const strictRe = /\b(graph|table|chart|figure|diagram)\b/i;
const broadRe =
  /\b(graphs?|graphed|graphing|tables?|charts?|figures?|diagrams?|scatter\s*plot|histogram|bar\s+graph|line\s+graph|plot|xy-plane|coordinate\s+plane|shown\s+above|below)\b/i;

function isFrq(q) {
  const a = String(q?.choice_a ?? '').trim();
  const b = String(q?.choice_b ?? '').trim();
  const c = String(q?.choice_c ?? '').trim();
  const d = String(q?.choice_d ?? '').trim();
  if (a || b || c || d) return false;
  const ca = String(q?.correct_answer ?? '').trim().toUpperCase();
  if (ca === 'A' || ca === 'B' || ca === 'C' || ca === 'D') return false;
  return true;
}

function fullText(q) {
  return [
    q.question_text,
    q.choice_a,
    q.choice_b,
    q.choice_c,
    q.choice_d,
  ]
    .map((s) => String(s ?? ''))
    .join(' ');
}

function noExplicitImage(q) {
  return !String(q?.image_url ?? '').trim();
}

function imageMcq(q) {
  if (isFrq(q)) return false;
  const a = String(q?.choice_a ?? '').trim();
  const b = String(q?.choice_b ?? '').trim();
  const c = String(q?.choice_c ?? '').trim();
  const d = String(q?.choice_d ?? '').trim();
  return !a && !b && !c && !d;
}

function row(q) {
  const stem = String(q.question_text ?? '').replace(/\s+/g, ' ').trim();
  return {
    id: q.id,
    subject: q.subject,
    domain: q.domain,
    skill: q.skill,
    difficulty: q.difficulty,
    image_url: String(q.image_url ?? '').trim() || '(none)',
    stemPreview: stem.slice(0, 160) + (stem.length > 160 ? '…' : ''),
  };
}

const imageUrlSet = qs.filter((q) => String(q?.image_url ?? '').trim());
const imageMcqList = qs.filter((q) => imageMcq(q));

const strict = qs.filter((q) => noExplicitImage(q) && strictRe.test(String(q.question_text ?? '')));
const broad = qs.filter((q) => noExplicitImage(q) && broadRe.test(fullText(q)));
const strictIds = new Set(strict.map((q) => q.id));
const broadOnly = broad.filter((q) => !strictIds.has(q.id));

/** Keyword hits that are NOT already covered by image_url or image-only MCQ */
const keywordOnly = [...strict, ...broadOnly].filter(
  (q) => !imageMcqList.some((m) => m.id === q.id) && !String(q?.image_url ?? '').trim()
);
const keywordIds = new Set(keywordOnly.map((q) => q.id));

const summary = {
  total: qs.length,
  imageUrlSetCount: imageUrlSet.length,
  imageMcqCount: imageMcqList.length,
  keywordStrictCount: strict.length,
  keywordBroadExtraCount: broadOnly.length,
  keywordUnionCount: keywordOnly.length,
};

console.log(JSON.stringify(summary, null, 2));

const today = new Date().toISOString().slice(0, 10);
let md = `# Questions needing images\n\n`;
md += `Generated **${today}** from \`data/questions.json\` (${qs.length} questions).\n\n`;
md += `Use this checklist when uploading to \`public/question-images/\`. The app serves that folder at \`/question-images/...\`.\n\n`;
md += `## Summary\n\n`;
md += `| Category | Count | Action |\n`;
md += `|----------|------:|--------|\n`;
md += `| **A — \`image_url\` set** | ${imageUrlSet.length} | Add/replace the file for each URL (see list below). |\n`;
md += `| **B — MCQ, all choices empty** | ${imageMcqList.length} | Add \`{id}A\`, \`{id}B\`, \`{id}C\`, \`{id}D\` (png/jpg/jpeg). |\n`;
md += `| **C — Keyword heuristic (no stem \`image_url\`)** | ${keywordOnly.length} | Review; add stem image and/or set \`image_url\` if a figure belongs in the stem. |\n\n`;

md += `---\n\n## A — Questions with \`image_url\` (must have matching file or remote URL)\n\n`;
if (!imageUrlSet.length) {
  md += `_None._\n\n`;
} else {
  md += `| ID | Subject | \`image_url\` |\n`;
  md += `|---:|---------|-------------|\n`;
  for (const q of imageUrlSet.sort((a, b) => a.id - b.id)) {
    const u = String(q.image_url ?? '').replace(/\|/g, '\\|');
    md += `| ${q.id} | ${q.subject} | \`${u}\` |\n`;
  }
  md += `\n`;
}

md += `---\n\n## B — MCQ with empty A–D text (choice images only)\n\n`;
md += `Expected files (try \`.png\` first, then \`.jpg\` / \`.jpeg\`): \`public/question-images/{id}A.png\` … \`{id}D.png\`.\n\n`;
if (!imageMcqList.length) {
  md += `_None._\n\n`;
} else {
  md += `| ID | Subject | Domain | Preview (stem) |\n`;
  md += `|---:|---------|--------|----------------|\n`;
  for (const q of imageMcqList.sort((a, b) => a.id - b.id)) {
    const r = row(q);
    const prev = r.stemPreview.replace(/\|/g, '\\|');
    md += `| ${r.id} | ${r.subject} | ${r.domain} | ${prev} |\n`;
  }
  md += `\n`;
}

md += `---\n\n## C — Keyword heuristic (likely stem/figure; no \`image_url\`)\n\n`;
md += `Strict = stem contains *graph/table/chart/figure/diagram*. Broad = stem+choices also match *plot*, *xy-plane*, *shown above*, etc. Duplicates vs B removed.\n\n`;
if (!keywordOnly.length) {
  md += `_None._\n\n`;
} else {
  md += `| ID | Subject | Match | Preview |\n`;
  md += `|---:|---------|-------|---------|\n`;
  for (const q of keywordOnly.sort((a, b) => a.id - b.id)) {
    const match = strictIds.has(q.id) ? 'strict' : 'broad';
    const prev = row(q).stemPreview.replace(/\|/g, '\\|');
    md += `| ${q.id} | ${q.subject} | ${match} | ${prev} |\n`;
  }
  md += `\n`;
}

md += `---\n\n## Flat ID lists (copy-paste)\n\n`;
md += `**image_url set:** \`${imageUrlSet.map((q) => q.id).sort((a, b) => a - b).join(', ') || '(none)'}\`\n\n`;
md += `**image-only MCQ:** \`${imageMcqList.map((q) => q.id).sort((a, b) => a - b).join(', ') || '(none)'}\`\n\n`;
md += `**keyword heuristic:** \`${[...keywordIds].sort((a, b) => a - b).join(', ') || '(none)'}\`\n`;

fs.writeFileSync(outMdPath, md, 'utf8');
console.log(`\nWrote ${path.relative(projectRoot, outMdPath)}`);
