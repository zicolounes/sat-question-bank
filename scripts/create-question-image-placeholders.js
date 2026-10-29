/* eslint-disable no-console */
/**
 * Writes obvious placeholder PNGs to public/question-images/<id>.png
 * so you can grep the bank / browse the folder and replace real figures later.
 *
 * Usage:
 *   node scripts/create-question-image-placeholders.js 189 190 205
 *   node scripts/create-question-image-placeholders.js --ids 189,190,205
 */
const path = require('path');
const { writeQuestionPlaceholderPngs } = require('./lib/question-placeholder-png');

function parseIds(argv) {
  const ids = [];
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--ids' && argv[i + 1]) {
      argv[i + 1].split(/[\s,]+/).forEach((s) => {
        const n = Number(String(s).trim());
        if (Number.isFinite(n) && n > 0) ids.push(Math.floor(n));
      });
      i += 1;
    } else if (/^\d+$/.test(a)) {
      ids.push(Number(a));
    }
  }
  return [...new Set(ids)].sort((x, y) => x - y);
}

function main() {
  const ids = parseIds(process.argv);
  if (!ids.length) {
    console.error('Usage: node scripts/create-question-image-placeholders.js <id> [id ...]');
    console.error('   or: node scripts/create-question-image-placeholders.js --ids 189,190,205');
    process.exit(1);
  }

  const projectRoot = path.join(__dirname, '..');
  writeQuestionPlaceholderPngs(projectRoot, ids);
}

main();
