import {
  doc,
  getDoc,
  setDoc,
  writeBatch,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, auth } from './firebase';
import { levelFromTotalXp, levelProgressFromTotalXp } from './xpLevel';
import { computeNewBadgeIds, pickDefaultActiveTitle } from './badges';
import { randomAvatarDefaults, sanitizeAvatar } from './studentAvatar';

/** Leaderboard doc mirrors public fields used for ranking + display. */
function badgeMetricsFromPubDoc(d, overrides = {}) {
  return {
    currentStreak: 0,
    longestStreak: 0,
    activeDaysLast30: 0,
    questionsAnswered: Number(overrides.questionsAnswered ?? d?.questionsAnswered) || 0,
    level: Number(overrides.level ?? d?.level) || 1,
    correctTotal: Number(overrides.correctTotal ?? d?.correctTotal) || 0,
    correctMath: Number(overrides.correctMath ?? d?.correctMath) || 0,
    correctEnglish: Number(overrides.correctEnglish ?? d?.correctEnglish) || 0,
  };
}

function leaderboardMirrorWrite(pubData) {
  const d = pubData ?? {};
  const xp = Number(d.xp) || 0;
  const level = levelFromTotalXp(xp);
  const av = sanitizeAvatar({ avatarColor: d.avatarColor, avatarSymbol: d.avatarSymbol });
  return {
    displayName: d.displayName ?? 'Student',
    photoURL: d.photoURL ?? '',
    level,
    xp,
    activeTitle: d.activeTitle ?? null,
    avatarColor: av.avatarColor,
    avatarSymbol: av.avatarSymbol,
    updatedAt: serverTimestamp(),
  };
}

/** Normalize leaderboard row: level always matches XP. */
export function normalizeLeaderboardRow(id, data) {
  const xp = Number(data?.xp) || 0;
  return {
    id,
    ...data,
    xp,
    level: levelFromTotalXp(xp),
  };
}

/**
 * Repair stored level on public profile + leaderboard when out of sync with XP.
 * Safe to call on login / profile load (idempotent).
 */
export async function syncProgressionFromXp(uid) {
  const u = String(uid);
  const pubRef = publicProfileRef(u);
  const snap = await getDoc(pubRef);
  if (!snap.exists()) return;
  const d = snap.data();
  const xp = Number(d.xp) || 0;
  const level = levelFromTotalXp(xp);
  const storedLevel = Number(d.level) || 1;
  const needsPublic = storedLevel !== level;
  const leaderPayload = leaderboardMirrorWrite({ ...d, xp, level });
  if (needsPublic) {
    await setDoc(pubRef, { level, updatedAt: serverTimestamp() }, { merge: true });
  }
  await setDoc(leaderboardRef(u), leaderPayload, { merge: true });
}

export const COL_PUBLIC = 'userProfilePublic';
export const COL_PRIVATE = 'userProfilePrivate';
export const COL_LEADER = 'leaderboard';

export function publicProfileRef(uid) {
  return doc(db, COL_PUBLIC, String(uid));
}

export function privateProfileRef(uid) {
  return doc(db, COL_PRIVATE, String(uid));
}

export function leaderboardRef(uid) {
  return doc(db, COL_LEADER, String(uid));
}

export function dailyTokenCaps(level) {
  const L = Math.max(1, Math.floor(Number(level) || 1));
  return {
    hints: 0,
    skips: 0,
    secondChances: 0,
    streakShields: L >= 8 ? 1 : 0,
  };
}

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export function defaultPublicProfile(_uid, { displayName = '', photoURL = '', avatar = null } = {}) {
  const av = avatar || randomAvatarDefaults();
  return {
    displayName: String(displayName || 'Student').slice(0, 80),
    photoURL: String(photoURL || '').slice(0, 2000),
    avatarColor: av.avatarColor,
    avatarSymbol: av.avatarSymbol,
    xp: 0,
    level: 1,
    activeTitle: null,
    badges: [],
    strongestSubject: '',
    friendIds: [],
    streakGraceDayKey: null,
    questionsAnswered: 0,
    correctTotal: 0,
    correctMath: 0,
    correctEnglish: 0,
    updatedAt: serverTimestamp(),
  };
}

export function defaultPrivateProfile() {
  return {
    hints: 0,
    skips: 0,
    secondChances: 0,
    streakShields: 0,
    lastTokenResetUtcDay: '',
    lastDailyXpBonusDay: '',
    updatedAt: serverTimestamp(),
  };
}

export async function ensureUserProfilesExist(uid, authUser) {
  const u = String(uid);
  const pubRef = publicProfileRef(u);
  const privRef = privateProfileRef(u);
  const [pubSnap, privSnap] = await Promise.all([getDoc(pubRef), getDoc(privRef)]);
  const displayName =
    String(authUser?.displayName ?? '')
      .trim()
      .slice(0, 80) || String(authUser?.email ?? '').split('@')[0] || 'Student';
  const photoURL = String(authUser?.photoURL ?? '').slice(0, 2000);
  const batch = writeBatch(db);
  let shouldCommit = false;

  if (!pubSnap.exists()) {
    const av = randomAvatarDefaults();
    batch.set(pubRef, defaultPublicProfile(u, { displayName, photoURL, avatar: av }));
    batch.set(
      leaderboardRef(u),
      leaderboardMirrorWrite({
        displayName,
        photoURL,
        level: 1,
        xp: 0,
        activeTitle: null,
        avatarColor: av.avatarColor,
        avatarSymbol: av.avatarSymbol,
      })
    );
    shouldCommit = true;
  } else {
    const d = pubSnap.data();
    if (!d.avatarColor || !d.avatarSymbol) {
      const av = randomAvatarDefaults();
      batch.update(pubRef, {
        avatarColor: av.avatarColor,
        avatarSymbol: av.avatarSymbol,
        updatedAt: serverTimestamp(),
      });
      batch.set(
        leaderboardRef(u),
        leaderboardMirrorWrite({
          ...d,
          avatarColor: av.avatarColor,
          avatarSymbol: av.avatarSymbol,
        }),
        { merge: true }
      );
      shouldCommit = true;
    }
  }

  if (!privSnap.exists()) {
    const caps = dailyTokenCaps(1);
    batch.set(privRef, {
      ...defaultPrivateProfile(),
      ...caps,
      lastTokenResetUtcDay: utcDayKey(),
    });
    shouldCommit = true;
  }

  if (shouldCommit) {
    await batch.commit();
  }
}

/** Idempotent daily token refresh (client; first app open after UTC day change refills to caps). */
export async function ensureDailyTokenReset(uid) {
  const u = String(uid);
  const today = utcDayKey();
  await runTransaction(db, async (tx) => {
    const pubSnap = await tx.get(publicProfileRef(u));
    const privSnap = await tx.get(privateProfileRef(u));
    if (!pubSnap.exists() || !privSnap.exists()) return;
    const level = levelFromTotalXp(Number(pubSnap.data().xp) || 0);
    const priv = privSnap.data() ?? {};
    if (String(priv.lastTokenResetUtcDay || '') === today) return;
    const caps = dailyTokenCaps(level);
    tx.update(privateProfileRef(u), {
      ...caps,
      lastTokenResetUtcDay: today,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function applyStreakShield(uid, yesterdayDayKey) {
  const u = String(uid);
  await runTransaction(db, async (tx) => {
    const pubSnap = await tx.get(publicProfileRef(u));
    const privSnap = await tx.get(privateProfileRef(u));
    if (!pubSnap.exists() || !privSnap.exists()) throw new Error('Profile missing');
    const shields = Number(privSnap.data()?.streakShields ?? 0);
    if (shields <= 0) throw new Error('No streak shields');
    const level = levelFromTotalXp(Number(pubSnap.data().xp) || 0);
    if (level < 8) throw new Error('Streak shields unlock at level 8');
    tx.update(privateProfileRef(u), {
      streakShields: shields - 1,
      updatedAt: serverTimestamp(),
    });
    tx.update(publicProfileRef(u), {
      streakGraceDayKey: String(yesterdayDayKey),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function clearStreakGrace(uid) {
  await setDoc(
    publicProfileRef(uid),
    { streakGraceDayKey: null, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Award XP, recompute level (elite badge), mirror leaderboard.
 * @returns {{ level: number, xpGained: number, crossedMilestone: number|null, leveledUp: boolean, previousLevel: number, newLevel: number }}
 */
export async function awardXp(uid, amount) {
  const u = String(uid);
  const xpGained = Math.max(0, Math.floor(Number(amount) || 0));
  if (!xpGained) {
    const pub = await getDoc(publicProfileRef(u));
    const prog = levelProgressFromTotalXp(Number(pub.data()?.xp) || 0);
    const lv = prog.level;
    return {
      level: lv,
      xpGained: 0,
      crossedMilestone: null,
      leveledUp: false,
      previousLevel: lv,
      newLevel: lv,
    };
  }
  const out = {
    crossedMilestone: null,
    leveledUp: false,
    previousLevel: null,
    newLevel: null,
  };
  await runTransaction(db, async (tx) => {
    const pubRef = publicProfileRef(u);
    const pubSnap = await tx.get(pubRef);
    if (!pubSnap.exists()) return;
    const prevXp = Number(pubSnap.data().xp) || 0;
    const nextXp = prevXp + xpGained;
    const before = levelProgressFromTotalXp(prevXp);
    const after = levelProgressFromTotalXp(nextXp);
    out.previousLevel = before.level;
    out.newLevel = after.level;
    out.leveledUp = after.level > before.level;
    if (after.level > before.level) {
      for (const m of [10, 25, 50]) {
        if (before.level < m && after.level >= m) out.crossedMilestone = m;
      }
    }
    const badges = Array.isArray(pubSnap.data().badges) ? [...pubSnap.data().badges] : [];
    const activeTitle = pubSnap.data().activeTitle ?? null;
    const newBadges = computeNewBadgeIds({
      badges,
      ...badgeMetricsFromPubDoc(pubSnap.data(), { level: after.level }),
    });
    for (const id of newBadges) {
      if (!badges.includes(id)) badges.push(id);
    }
    const nextTitle = pickDefaultActiveTitle(badges, activeTitle);
    tx.update(pubRef, {
      xp: nextXp,
      level: after.level,
      badges,
      activeTitle: nextTitle,
      updatedAt: serverTimestamp(),
    });
    tx.set(
      leaderboardRef(u),
      leaderboardMirrorWrite({
        ...pubSnap.data(),
        xp: nextXp,
        level: after.level,
        badges,
        activeTitle: nextTitle,
      }),
      { merge: true }
    );
  });
  const pub = await getDoc(publicProfileRef(u));
  const prog = levelProgressFromTotalXp(Number(pub.data()?.xp) || 0);
  const lv = prog.level;
  return {
    level: lv,
    xpGained,
    crossedMilestone: out.crossedMilestone,
    leveledUp: Boolean(out.leveledUp),
    previousLevel: out.previousLevel ?? lv,
    newLevel: out.newLevel ?? lv,
  };
}

export async function awardXpAndRead(uid, amount) {
  return awardXp(uid, amount);
}

/** One answered question: +1 attempts, optional correct breakdown, badge check (streak/month badges sync separately). */
export async function recordPracticeAnswer(uid, { subject, correct }) {
  const u = String(uid);
  const sub = String(subject || '');
  await runTransaction(db, async (tx) => {
    const ref = publicProfileRef(u);
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const d = snap.data();
    const qn = Math.max(0, Number(d.questionsAnswered) || 0) + 1;
    let correctTotal = Math.max(0, Number(d.correctTotal) || 0);
    let correctMath = Math.max(0, Number(d.correctMath) || 0);
    let correctEnglish = Math.max(0, Number(d.correctEnglish) || 0);
    if (correct) {
      correctTotal += 1;
      if (sub === 'Math') correctMath += 1;
      else if (sub === 'English') correctEnglish += 1;
    }
    const level = levelFromTotalXp(Number(d.xp) || 0);
    const badges = Array.isArray(d.badges) ? [...d.badges] : [];
    const newIds = computeNewBadgeIds({
      badges,
      ...badgeMetricsFromPubDoc(d, {
        questionsAnswered: qn,
        level,
        correctTotal,
        correctMath,
        correctEnglish,
      }),
    });
    for (const id of newIds) {
      if (!badges.includes(id)) badges.push(id);
    }
    const activeTitle = pickDefaultActiveTitle(badges, d.activeTitle ?? null);
    tx.update(ref, {
      questionsAnswered: qn,
      correctTotal,
      correctMath,
      correctEnglish,
      badges,
      activeTitle,
      updatedAt: serverTimestamp(),
    });
    tx.set(
      leaderboardRef(u),
      leaderboardMirrorWrite({
        ...d,
        questionsAnswered: qn,
        correctTotal,
        correctMath,
        correctEnglish,
        badges,
        activeTitle,
      }),
      { merge: true }
    );
  });
}

export async function syncBadgesFromMetrics(uid, metrics = {}) {
  const u = String(uid);
  await runTransaction(db, async (tx) => {
    const pubRef = publicProfileRef(u);
    const snap = await tx.get(pubRef);
    if (!snap.exists()) return;
    const d = snap.data();
    const badges = Array.isArray(d.badges) ? [...d.badges] : [];
    const newBadges = computeNewBadgeIds({
      badges,
      currentStreak: Number(metrics.currentStreak) || 0,
      longestStreak: Number(metrics.longestStreak) || 0,
      activeDaysLast30: Number(metrics.activeDaysLast30) || 0,
      questionsAnswered: Number(metrics.questionsAnswered ?? d.questionsAnswered) || 0,
      level: Number(metrics.level) || levelFromTotalXp(Number(d.xp) || 0),
      correctTotal: Number(metrics.correctTotal ?? d.correctTotal) || 0,
      correctMath: Number(metrics.correctMath ?? d.correctMath) || 0,
      correctEnglish: Number(metrics.correctEnglish ?? d.correctEnglish) || 0,
    });
    let changed = false;
    for (const id of newBadges) {
      if (!badges.includes(id)) {
        badges.push(id);
        changed = true;
      }
    }
    if (!changed) return;
    const activeTitle = pickDefaultActiveTitle(badges, snap.data().activeTitle ?? null);
    tx.update(pubRef, { badges, activeTitle, updatedAt: serverTimestamp() });
    tx.set(
      leaderboardRef(u),
      leaderboardMirrorWrite({
        ...snap.data(),
        badges,
        activeTitle,
      }),
      { merge: true }
    );
  });
}

export async function setActiveTitle(uid, title) {
  await setDoc(
    publicProfileRef(uid),
    { activeTitle: title ? String(title).slice(0, 80) : null, updatedAt: serverTimestamp() },
    { merge: true }
  );
  const pub = await getDoc(publicProfileRef(uid));
  const d = pub.data() ?? {};
  await setDoc(
    leaderboardRef(uid),
    leaderboardMirrorWrite({
      ...d,
      activeTitle: title ? String(title).slice(0, 80) : null,
    }),
    { merge: true }
  );
}

export async function setAvatarAppearance(uid, { avatarColor, avatarSymbol }) {
  const u = String(uid);
  const { avatarColor: color, avatarSymbol: symbol } = sanitizeAvatar({ avatarColor, avatarSymbol });
  await setDoc(
    publicProfileRef(u),
    { avatarColor: color, avatarSymbol: symbol, updatedAt: serverTimestamp() },
    { merge: true }
  );
  const pub = await getDoc(publicProfileRef(u));
  await setDoc(leaderboardRef(u), leaderboardMirrorWrite(pub.data() ?? {}), { merge: true });
}

/** Updates public profile + leaderboard name; syncs Firebase Auth displayName when it matches this uid. */
export async function setDisplayName(uid, rawName) {
  const u = String(uid);
  let name = String(rawName ?? '').trim().slice(0, 80);
  if (!name) name = 'Student';
  await setDoc(publicProfileRef(u), { displayName: name, updatedAt: serverTimestamp() }, { merge: true });
  const pub = await getDoc(publicProfileRef(u));
  await setDoc(leaderboardRef(u), leaderboardMirrorWrite(pub.data() ?? {}), { merge: true });
  try {
    if (auth.currentUser && auth.currentUser.uid === u) {
      await updateProfile(auth.currentUser, { displayName: name });
    }
  } catch {
    /* Firestore is source of truth in-app; Auth name is best-effort for header / new devices */
  }
}

export async function setStrongestSubject(uid, subject) {
  await setDoc(
    publicProfileRef(uid),
    { strongestSubject: String(subject || '').slice(0, 80), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function setFriendIds(uid, friendIds) {
  const ids = [...new Set((friendIds || []).map((x) => String(x)).filter(Boolean))].slice(0, 200);
  await setDoc(publicProfileRef(uid), { friendIds: ids, updatedAt: serverTimestamp() }, { merge: true });
}

export async function fetchLeaderboardTop(n = 50) {
  const q = query(collection(db, COL_LEADER), orderBy('xp', 'desc'), limit(n));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => normalizeLeaderboardRow(d.id, d.data()));
  return rows.sort((a, b) => (b.xp || 0) - (a.xp || 0));
}

export async function fetchLeaderboardForIds(ids) {
  const out = [];
  for (const id of ids) {
    const s = await getDoc(leaderboardRef(id));
    if (s.exists()) out.push(normalizeLeaderboardRow(id, s.data()));
  }
  return out.sort((a, b) => (b.level || 0) - (a.level || 0) || (b.xp || 0) - (a.xp || 0));
}

const DAILY_FIRST_CORRECT_BONUS = 5;

/** +5 XP first time each UTC day you answer something correctly (same tx as XP add). */
export async function tryGrantDailyFirstCorrectBonus(uid) {
  const u = String(uid);
  const today = utcDayKey();
  let granted = 0;
  await runTransaction(db, async (tx) => {
    const pubRef = publicProfileRef(u);
    const privRef = privateProfileRef(u);
    const [pubSnap, privSnap] = await Promise.all([tx.get(pubRef), tx.get(privRef)]);
    if (!pubSnap.exists() || !privSnap.exists()) return;
    if (String(privSnap.data()?.lastDailyXpBonusDay || '') === today) return;
    const prevXp = Number(pubSnap.data().xp) || 0;
    const nextXp = prevXp + DAILY_FIRST_CORRECT_BONUS;
    const after = levelProgressFromTotalXp(nextXp);
    const badges = Array.isArray(pubSnap.data().badges) ? [...pubSnap.data().badges] : [];
    const newBadges = computeNewBadgeIds({
      badges,
      ...badgeMetricsFromPubDoc(pubSnap.data(), { level: after.level }),
    });
    for (const id of newBadges) {
      if (!badges.includes(id)) badges.push(id);
    }
    const nextTitle = pickDefaultActiveTitle(badges, pubSnap.data().activeTitle ?? null);
    tx.update(privRef, { lastDailyXpBonusDay: today, updatedAt: serverTimestamp() });
    tx.update(pubRef, {
      xp: nextXp,
      level: after.level,
      badges,
      activeTitle: nextTitle,
      updatedAt: serverTimestamp(),
    });
    tx.set(
      leaderboardRef(u),
      leaderboardMirrorWrite({
        ...pubSnap.data(),
        xp: nextXp,
        level: after.level,
        badges,
        activeTitle: nextTitle,
      }),
      { merge: true }
    );
    granted = DAILY_FIRST_CORRECT_BONUS;
  });
  return granted;
}

export function baseXpForCorrect(difficulty) {
  const d = String(difficulty || '');
  const tier = d === 'Hard' ? 10 : d === 'Medium' ? 5 : 0;
  return 10 + tier;
}
