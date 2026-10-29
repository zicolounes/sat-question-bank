import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Create a .env file with ${name}=... and restart the dev server.`
    );
  }
  return value;
}

const firebaseConfig = {
  apiKey: requireEnv('REACT_APP_FIREBASE_API_KEY'),
  authDomain: requireEnv('REACT_APP_FIREBASE_AUTH_DOMAIN'),
  projectId: requireEnv('REACT_APP_FIREBASE_PROJECT_ID'),
  storageBucket: requireEnv('REACT_APP_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: requireEnv('REACT_APP_FIREBASE_MESSAGING_SENDER_ID'),
  appId: requireEnv('REACT_APP_FIREBASE_APP_ID'),
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/** Only this account gets authoring UI and Firestore writes to `questions` (see `firestore.rules`). */
export const ADMIN_EMAIL = 'zico@karimlounes.com';

/**
 * Only this Firebase Auth email may read `questionReports` (dev reports page + Firestore).
 * Use your tutor Google login email. Must match `questionReportsViewerEmail()` in `firestore.rules`.
 * Override at build time: `REACT_APP_QUESTION_REPORTS_VIEWER_EMAIL`.
 */
export const QUESTION_REPORTS_VIEWER_EMAIL = String(
  process.env.REACT_APP_QUESTION_REPORTS_VIEWER_EMAIL ?? 'zico@karimlounes.com'
)
  .trim()
  .toLowerCase();

export function isAdminEmail(email) {
  return String(email ?? '').trim().toLowerCase() === ADMIN_EMAIL;
}

export function canViewQuestionReports(email) {
  return String(email ?? '').trim().toLowerCase() === QUESTION_REPORTS_VIEWER_EMAIL;
}

/** Client session shape; admin access is only when email matches {@link ADMIN_EMAIL}. */
export function buildStudentSession(user) {
  if (!user) return null;
  const email = String(user.email ?? '').trim().toLowerCase();
  const firstName =
    String(user.displayName ?? '').trim() ||
    String(user.email ?? '').split('@')[0] ||
    'Student';
  const providers = Array.isArray(user.providerData)
    ? user.providerData.map((p) => p?.providerId).filter(Boolean)
    : [];
  const isVerified = Boolean(user.emailVerified) || providers.includes('google.com');
  return {
    student_id: user.uid,
    first_name: firstName,
    email,
    is_admin: isAdminEmail(email),
    is_verified: isVerified,
    providers,
  };
}

const QUESTIONS_HEADERS = [
  'id',
  'subject',
  'domain',
  'skill',
  'difficulty',
  'difficulty_tier',
  'question_text',
  'choice_a',
  'choice_b',
  'choice_c',
  'choice_d',
  'correct_answer',
  'explanation',
  'created_at',
];

function coerceQuestion(raw) {
  return {
    id: Number(raw.id),
    subject: raw.subject ?? '',
    domain: raw.domain ?? '',
    skill: raw.skill ?? '',
    difficulty: raw.difficulty ?? '',
    difficulty_tier: String(raw.difficulty_tier ?? ''),
    question_text: raw.question_text ?? '',
    image_url: raw.image_url ?? '',
    choice_a: raw.choice_a ?? '',
    choice_b: raw.choice_b ?? '',
    choice_c: raw.choice_c ?? '',
    choice_d: raw.choice_d ?? '',
    correct_answer: raw.correct_answer ?? '',
    explanation: raw.explanation ?? '',
    created_at: raw.created_at ?? '',
  };
}

export function getExpectedHeaders() {
  return [...QUESTIONS_HEADERS];
}

export async function listQuestions() {
  const q = query(collection(db, 'questions'), orderBy('id', 'desc'));
  const snap = await getDocs(q);
  const questions = snap.docs.map((d) => coerceQuestion(d.data()));
  return {
    questions,
    headers: getExpectedHeaders(),
    expectedHeaders: getExpectedHeaders(),
  };
}

export function getNextId(questions) {
  let maxId = 0;
  for (const q of questions) {
    const id = Number(q.id);
    if (!Number.isNaN(id) && id > maxId) maxId = id;
  }
  return maxId + 1;
}

export async function appendQuestion(question) {
  const payload = coerceQuestion({
    ...question,
    created_at: question.created_at ?? new Date().toISOString(),
  });
  await setDoc(doc(db, 'questions', String(payload.id)), payload);
}

export async function updateQuestion(question) {
  const payload = coerceQuestion(question);
  await setDoc(doc(db, 'questions', String(payload.id)), payload);
}

export async function deleteQuestion(questionId) {
  await deleteDoc(doc(db, 'questions', String(questionId)));
}

export async function appendResponseLog(response) {
  await addDoc(collection(db, 'responses'), {
    student_id: response.student_id ?? '',
    student_email: response.student_email ?? '',
    student_name: response.student_name ?? '',
    session_id: response.session_id ?? '',
    question_id: String(response.question_id ?? ''),
    subject: response.subject ?? '',
    domain: response.domain ?? '',
    skill: response.skill ?? '',
    difficulty: response.difficulty ?? '',
    selected_answer: response.selected_answer ?? '',
    correct_answer: response.correct_answer ?? '',
    is_correct: Boolean(response.is_correct),
    time_spent_seconds: String(response.time_spent_seconds ?? ''),
    answer_changed: Boolean(response.answer_changed),
    timestamp: response.timestamp ?? new Date().toISOString(),
  });
}

function parseIso(iso) {
  const d = new Date(String(iso ?? ''));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Firestore hard cap per query (see Firebase docs). */
const FIRESTORE_MAX_QUERY_LIMIT = 10000;

export async function listResponsesForStudentSince(studentId, sinceIso, max = 1000) {
  const sinceDate = parseIso(sinceIso) ?? new Date(0);
  const capped = Math.max(1, Math.min(FIRESTORE_MAX_QUERY_LIMIT, Number(max) || 1000));
  const q = query(
    collection(db, 'responses'),
    where('student_id', '==', String(studentId)),
    where('timestamp', '>=', sinceDate.toISOString()),
    orderBy('timestamp', 'desc'),
    limit(capped)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function submitQuestionReport({
  studentEmail,
  questionId,
  reason,
  missingImage,
  looksWeird,
}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to report a question.');
  }
  const qid = Math.trunc(Number(questionId));
  if (!Number.isFinite(qid) || qid < 1) {
    throw new Error('Invalid question.');
  }
  const note = String(reason ?? '').trim();
  if (note.length < 4) {
    throw new Error('Please add a short note (at least 4 characters).');
  }
  const email = String(studentEmail ?? user.email ?? '').trim();
  await addDoc(collection(db, 'questionReports'), {
    student_id: user.uid,
    student_email: email || 'unknown',
    question_id: qid,
    reason: note.slice(0, 4000),
    missing_image: Boolean(missingImage),
    looks_weird: Boolean(looksWeird),
    created_at: new Date().toISOString(),
  });
}

export async function fetchQuestionReports(max = 200) {
  const capped = Math.max(1, Math.min(500, Number(max) || 200));
  const q = query(collection(db, 'questionReports'), orderBy('created_at', 'desc'), limit(capped));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listResponsesForAdminSince(sinceIso, max = 10000) {
  const sinceDate = parseIso(sinceIso) ?? new Date(0);
  const capped = Math.max(1, Math.min(FIRESTORE_MAX_QUERY_LIMIT, Number(max) || 10000));
  const q = query(
    collection(db, 'responses'),
    where('timestamp', '>=', sinceDate.toISOString()),
    orderBy('timestamp', 'desc'),
    limit(capped)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Continue URL after verification. Some clients still show a plain URL — for a proper HTML button link,
 * customize the template in Firebase Console → Authentication → Templates → Email address verification.
 */
function emailVerificationActionSettings() {
  if (typeof window === 'undefined' || !window.location?.origin) return undefined;
  return {
    url: `${window.location.origin}/`,
    handleCodeInApp: false,
  };
}

export async function signUpWithEmail({ email, password, firstName }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (String(firstName ?? '').trim()) {
    await updateProfile(cred.user, { displayName: String(firstName).trim() });
  }
  const action = emailVerificationActionSettings();
  if (action) {
    await sendEmailVerification(cred.user, action);
  } else {
    await sendEmailVerification(cred.user);
  }
  return cred.user;
}

export async function signInWithEmail({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function resendVerificationEmail() {
  if (!auth.currentUser) throw new Error('Not signed in.');
  const action = emailVerificationActionSettings();
  if (action) {
    await sendEmailVerification(auth.currentUser, action);
  } else {
    await sendEmailVerification(auth.currentUser);
  }
}

export async function reloadCurrentUser() {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  return auth.currentUser;
}

export async function logOut() {
  await signOut(auth);
}

export function observeAuthState(onChange) {
  return onAuthStateChanged(auth, onChange);
}

export { db, auth };

