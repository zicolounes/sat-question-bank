/* eslint-disable no-console */
/**
 * Merges a local draft JSON array into data/questions.json with bank formatting,
 * auto-assigns numeric ids (or honors explicit id when unused), and writes
 * amber placeholder PNGs for any row with needs_image: true.
 *
 * Draft rows: same fields as the bank, plus optional needs_image (boolean).
 * needs_image is stripped before save; image_url is cleared when needs_image
 * so the app loads public/question-images/<id>.png until you replace the file.
 *
 * Usage:
 *   node scripts/merge-question-import-draft.js
 *   node scripts/merge-question-import-draft.js path/to/draft.json
 *
 * Default draft path: data/question-import-draft.json (gitignored; copy from
 * data/question-import-draft.example.json)
 */
const fs = require('fs');
const path = require('path');
const { writeQuestionPlaceholderPngs } = require('./lib/question-placeholder-png');

function readJson(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON in ${filePath}: ${e?.message || e}`);
  }
}

function bankRowFromDraft(raw, id, created_at) {
  return {
    id,
    subject: String(raw.subject ?? ''),
    domain: String(raw.domain ?? ''),
    skill: String(raw.skill ?? ''),
    difficulty: String(raw.difficulty ?? ''),
    difficulty_tier: String(raw.difficulty_tier ?? ''),
    question_text: String(raw.question_text ?? ''),
    image_url: String(raw.image_url ?? ''),
    choice_a: String(raw.choice_a ?? ''),
    choice_b: String(raw.choice_b ?? ''),
    choice_c: String(raw.choice_c ?? ''),
    choice_d: String(raw.choice_d ?? ''),
    correct_answer: String(raw.correct_answer ?? ''),
    explanation: String(raw.explanation ?? ''),
    created_at: String(created_at ?? new Date().toISOString()),
  };
}

function maxId(questions) {
  let m = 0;
  for (const q of questions) {
    const id = Number(q?.id);
    if (Number.isFinite(id) && id > m) m = id;
  }
  return m;
}

function sortById(questions) {
  return [...questions].sort((a, b) => Number(a.id) - Number(b.id));
}

function main() {
  const projectRoot = path.join(__dirname, '..');
  const bankPath = path.join(projectRoot, 'data', 'questions.json');
  const draftPath = path.isAbsolute(process.argv[2])
    ? process.argv[2]
    : path.join(projectRoot, process.argv[2] || 'data/question-import-draft.json');

  if (!fs.existsSync(draftPath)) {
    console.error(`Missing draft file: ${draftPath}`);
    console.error('Copy data/question-import-draft.example.json → data/question-import-draft.json and fill it.');
    process.exit(1);
  }

  const bank = readJson(bankPath);
  if (!Array.isArray(bank)) {
    throw new Error(`Expected array in ${bankPath}`);
  }

  const draft = readJson(draftPath);
  if (!Array.isArray(draft) || draft.length === 0) {
    throw new Error(`Draft must be a non-empty JSON array: ${draftPath}`);
  }

  const existingIds = new Set(bank.map((q) => Number(q.id)).filter((n) => Number.isFinite(n)));
  let nextId = maxId(bank) + 1;
  const consumedInDraft = new Set();

  const newRows = [];
  const placeholderIds = [];

  for (let i = 0; i < draft.length; i += 1) {
    const raw = draft[i] || {};
    const needsImage = Boolean(raw.needs_image);

    let id;
    if (raw.id != null && raw.id !== '') {
      id = Number(raw.id);
      if (!Number.isFinite(id) || id <= 0) {
        throw new Error(`Draft row ${i}: invalid id ${JSON.stringify(raw.id)}`);
      }
      if (existingIds.has(id)) {
        throw new Error(`Draft row ${i}: id ${id} already exists in questions.json`);
      }
      if (consumedInDraft.has(id)) {
        throw new Error(`Draft row ${i}: duplicate id ${id} in draft`);
      }
      consumedInDraft.add(id);
    } else {
      while (existingIds.has(nextId) || consumedInDraft.has(nextId)) {
        nextId += 1;
      }
      id = nextId;
      nextId += 1;
      consumedInDraft.add(id);
    }

    existingIds.add(id);

    const created = raw.created_at ? String(raw.created_at) : new Date().toISOString();
    const row = bankRowFromDraft(raw, id, created);
    if (needsImage) {
      row.image_url = '';
      placeholderIds.push(id);
    }

    newRows.push(row);
  }

  const merged = sortById([...bank, ...newRows]);
  const seen = new Set();
  for (const q of merged) {
    const id = Number(q.id);
    if (seen.has(id)) throw new Error(`Duplicate id in merged bank: ${id}`);
    seen.add(id);
  }

  fs.writeFileSync(bankPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(`Updated ${path.relative(projectRoot, bankPath)} (+${newRows.length} questions).`);

  if (placeholderIds.length) {
    writeQuestionPlaceholderPngs(projectRoot, placeholderIds);
    console.log(
      `\nPlaceholder images (replace with real figures, same path/name):\n  ${placeholderIds.join(', ')}`
    );
    console.log('Files: public/question-images/<id>.png');
  } else {
    console.log('No needs_image rows — no placeholder files written.');
  }

  console.log('\nPush to Firestore when ready: npm run import:questions');
}

main();
