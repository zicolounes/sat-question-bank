const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function dailyTokenCaps(level) {
  const L = Math.max(1, Math.floor(Number(level) || 1));
  return {
    hints: 0,
    skips: 0,
    secondChances: 0,
    streakShields: L >= 8 ? 1 : 0,
  };
}

/**
 * Daily UTC refresh of consumable token balances (mirrors client `ensureDailyTokenReset`).
 * Reads each user's level from `userProfilePublic` and writes caps to `userProfilePrivate`.
 */
exports.dailyTokenReset = onSchedule(
  {
    schedule: '5 0 * * *',
    timeZone: 'Etc/UTC',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const today = utcDayKey();
    const privSnap = await db.collection('userProfilePrivate').get();
    let batch = db.batch();
    let ops = 0;

    for (const doc of privSnap.docs) {
      const priv = doc.data() || {};
      if (String(priv.lastTokenResetUtcDay || '') === today) continue;

      const uid = doc.id;
      const pubSnap = await db.collection('userProfilePublic').doc(uid).get();
      const level = pubSnap.exists ? Number(pubSnap.data().level) || 1 : 1;
      const caps = dailyTokenCaps(level);

      batch.update(doc.ref, {
        ...caps,
        lastTokenResetUtcDay: today,
        updatedAt: FieldValue.serverTimestamp(),
      });
      ops += 1;

      if (ops >= 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }
  }
);
