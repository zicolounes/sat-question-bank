import React from 'react';
import { onSnapshot } from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { levelFromTotalXp } from '../lib/xpLevel';
import {
  ensureUserProfilesExist,
  ensureDailyTokenReset,
  syncProgressionFromXp,
  publicProfileRef,
  privateProfileRef,
} from '../lib/userProfile';

const UserProfileContext = React.createContext(null);

export function UserProfileProvider({ uid, children }) {
  const [publicProfile, setPublicProfile] = React.useState(null);
  const [privateProfile, setPrivateProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (!uid) {
      setPublicProfile(null);
      setPrivateProfile(null);
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const u = auth.currentUser;
        await ensureUserProfilesExist(uid, u);
        await ensureDailyTokenReset(uid);
        await syncProgressionFromXp(uid);
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const unsubPub = onSnapshot(
      publicProfileRef(uid),
      (snap) => {
        if (!cancelled) {
          if (!snap.exists()) {
            setPublicProfile(null);
            return;
          }
          const data = snap.data();
          const xp = Number(data.xp) || 0;
          setPublicProfile({
            id: snap.id,
            ...data,
            level: levelFromTotalXp(xp),
          });
        }
      },
      (e) => {
        if (!cancelled) setError(e);
      }
    );
    const unsubPriv = onSnapshot(
      privateProfileRef(uid),
      (snap) => {
        if (!cancelled) setPrivateProfile(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      },
      (e) => {
        if (!cancelled) setError(e);
      }
    );

    return () => {
      cancelled = true;
      unsubPub();
      unsubPriv();
    };
  }, [uid]);

  const value = React.useMemo(
    () => ({
      uid,
      publicProfile,
      privateProfile,
      loading,
      error,
      refreshTokens: () => uid && ensureDailyTokenReset(uid),
    }),
    [uid, publicProfile, privateProfile, loading, error]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile() {
  const ctx = React.useContext(UserProfileContext);
  if (!ctx) {
    return {
      uid: null,
      publicProfile: null,
      privateProfile: null,
      loading: false,
      error: null,
      refreshTokens: async () => {},
    };
  }
  return ctx;
}
