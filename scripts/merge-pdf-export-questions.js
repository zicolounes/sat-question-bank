/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const mainPath = path.join(root, 'data', 'questions.json');
const parts = [
  path.join(root, 'data', 'pdf-export-2026-5-1-part1.json'),
  path.join(root, 'data', 'pdf-export-2026-5-1-part2.json'),
];

const existing = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
const seen = new Set(existing.map((q) => q.id));
let added = 0;
for (const p of parts) {
  if (!fs.existsSync(p)) {
    console.warn('Skip missing:', p);
    continue;
  }
  const chunk = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!Array.isArray(chunk)) throw new Error(`Not an array: ${p}`);
  for (const q of chunk) {
    if (seen.has(q.id)) throw new Error(`Duplicate id ${q.id}`);
    seen.add(q.id);
  }
  existing.push(...chunk);
  added += chunk.length;
}
fs.writeFileSync(mainPath, JSON.stringify(existing, null, 2));
console.log(`Merged ${added} questions into data/questions.json (total ${existing.length}).`);
