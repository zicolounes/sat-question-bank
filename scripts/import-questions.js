/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const admin = require('firebase-admin');

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing file: ${filePath}`);
  }
  return filePath;
}

function readJson(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid JSON in ${filePath}: ${e?.message || e}`);
  }
}

function normalizeQuestion(raw) {
  const q = { ...(raw || {}) };
  const id = Number(q.id);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error(`Invalid or missing id: ${JSON.stringify(q.id)}`);
  }

  const out = {
    id,
    subject: String(q.subject ?? ''),
    domain: String(q.domain ?? ''),
    skill: String(q.skill ?? ''),
    difficulty: String(q.difficulty ?? ''),
    difficulty_tier: String(q.difficulty_tier ?? ''),
    question_text: String(q.question_text ?? ''),
    image_url: String(q.image_url ?? ''),
    choice_a: String(q.choice_a ?? ''),
    choice_b: String(q.choice_b ?? ''),
    choice_c: String(q.choice_c ?? ''),
    choice_d: String(q.choice_d ?? ''),
    correct_answer: String(q.correct_answer ?? ''),
    explanation: String(q.explanation ?? ''),
    created_at: String(q.created_at ?? new Date().toISOString()),
  };

  return out;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const projectRoot = process.cwd();
  const serviceAccountPath = requireFile(
    path.join(projectRoot, 'serviceAccountKey.json')
  );

  const inputPath = process.argv[2] || 'data/questions.json';
  const absoluteInputPath = path.isAbsolute(inputPath)
    ? inputPath
    : path.join(projectRoot, inputPath);

  requireFile(absoluteInputPath);

  if (!admin.apps.length) {
    const serviceAccount = readJson(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  const parsed = readJson(absoluteInputPath);
  if (!Array.isArray(parsed)) {
    throw new Error(
      `Expected JSON array in ${absoluteInputPath}. Got: ${typeof parsed}`
    );
  }

  const questions = parsed.map(normalizeQuestion);
  const unique = new Map();
  for (const q of questions) {
    if (unique.has(q.id)) {
      throw new Error(`Duplicate id found: ${q.id}`);
    }
    unique.set(q.id, q);
  }

  console.log(`Importing ${questions.length} questions into Firestore...`);

  // Firestore batch limit is 500 operations; payload limit ~10MB per batch.
  const batches = chunk(questions, 50);
  let imported = 0;

  for (let i = 0; i < batches.length; i += 1) {
    const batchQuestions = batches[i];
    const batch = db.batch();
    for (const q of batchQuestions) {
      const ref = db.collection('questions').doc(String(q.id));
      batch.set(ref, q, { merge: false });
    }
    await batch.commit();
    imported += batchQuestions.length;
    console.log(`Committed batch ${i + 1}/${batches.length} (${imported} total)`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});

