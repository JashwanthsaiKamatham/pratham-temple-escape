import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  api,
  getToken,
  setToken,
  loadLocalProgress,
  saveLocalProgress
} from './api';
import { OUTFITS } from '../game/constants';

const SessionContext = createContext(null);

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
};

function fromUser(user) {
  return {
    high_score: Number(user.high_score || 0),
    coins: Number(user.coins || 0),
    diamonds: Number(user.diamonds || 0),
    total_distance: Number(user.total_distance || 0),
    games_played: Number(user.games_played || 0),
    equipped_outfit: user.equipped_outfit || 'classic',
    unlocked_outfits: Array.isArray(user.unlocked_outfits) && user.unlocked_outfits.length
      ? user.unlocked_outfits
      : ['classic']
  };
}

export function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(() => loadLocalProgress());
  const [booting, setBooting] = useState(true);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!getToken()) {
        setBooting(false);
        setIsGuest(true);
        return;
      }
      try {
        const data = await api.me();
        if (cancelled) return;
        setUser(data.user);
        setProgress(fromUser(data.user));
        setIsGuest(false);
      } catch {
        setToken('');
        if (!cancelled) setIsGuest(true);
      } finally {
        if (!cancelled) setBooting(false);
      }
    }
    boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistLocal = useCallback((next) => {
    setProgress(next);
    if (!getToken()) saveLocalProgress(next);
  }, []);

  const signup = useCallback(async ({ email, password, full_name }) => {
    const guestStats = loadLocalProgress();
    const data = await api.signup({ email, password, full_name, guestStats });
    setToken(data.token);
    setUser(data.user);
    setProgress(fromUser(data.user));
    setIsGuest(false);
    return data.user;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await api.login({ email, password });
    setToken(data.token);
    setUser(data.user);
    setProgress(fromUser(data.user));
    setIsGuest(false);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setUser(null);
    setIsGuest(true);
    setProgress(loadLocalProgress());
  }, []);

  const playAsGuest = useCallback(() => {
    setToken('');
    setUser(null);
    setIsGuest(true);
    setProgress(loadLocalProgress());
  }, []);

  // Persist a completed run (works for both guests & logged-in adventurers)
  const finishRun = useCallback(
    async ({ score = 0, coins = 0, diamonds = 0, distance = 0 }) => {
      const local = loadLocalProgress();
      if (getToken() && user) {
        // Optimistic local update first
        setProgress((prev) => ({
          ...prev,
          coins: prev.coins + coins,
          diamonds: prev.diamonds + diamonds,
          high_score: Math.max(prev.high_score, score),
          total_distance: prev.total_distance + distance,
          games_played: prev.games_played + 1
        }));
        try {
          const data = await api.syncGame({
            runScore: score,
            runCoins: coins,
            runDiamonds: diamonds,
            runDistance: distance,
            incrementGames: true
          });
          setUser(data.user);
          setProgress(fromUser(data.user));
          return { synced: true, progress: fromUser(data.user) };
        } catch (err) {
          return { synced: false, error: err.message, progress: null };
        }
      }

      const next = {
        ...local,
        coins: local.coins + coins,
        diamonds: local.diamonds + diamonds,
        high_score: Math.max(local.high_score, score),
        total_distance: local.total_distance + distance,
        games_played: local.games_played + 1
      };
      persistLocal(next);
      return { synced: false, guest: true, progress: next };
    },
    [persistLocal, user]
  );

  const unlockOutfit = useCallback(
    async (outfitId) => {
      const outfit = OUTFITS.find((o) => o.id === outfitId);
      if (!outfit) throw new Error('Unknown outfit');

      if (getToken() && user) {
        const data = await api.unlockOutfit(outfitId);
        setUser(data.user);
        setProgress(fromUser(data.user));
        return fromUser(data.user);
      }

      const local = loadLocalProgress();
      if (local.coins < outfit.coins) throw new Error(`Need ${outfit.coins - local.coins} more gold coins.`);
      if (local.diamonds < outfit.diamonds)
        throw new Error(`Need ${outfit.diamonds - local.diamonds} more diamonds.`);

      const next = {
        ...local,
        coins: local.coins - outfit.coins,
        diamonds: local.diamonds - outfit.diamonds,
        unlocked_outfits: Array.from(new Set([...local.unlocked_outfits, outfitId])),
        equipped_outfit: outfitId
      };
      persistLocal(next);
      return next;
    },
    [persistLocal, user]
  );

  const equipOutfit = useCallback(
    async (outfitId) => {
      if (getToken() && user) {
        const data = await api.equipOutfit(outfitId);
        setUser(data.user);
        setProgress(fromUser(data.user));
        return fromUser(data.user);
      }
      const local = loadLocalProgress();
      if (!local.unlocked_outfits.includes(outfitId)) throw new Error('Outfit is locked.');
      const next = { ...local, equipped_outfit: outfitId };
      persistLocal(next);
      return next;
    },
    [persistLocal, user]
  );

  const value = useMemo(
    () => ({
      user,
      progress,
      booting,
      isGuest,
      isAuthed: Boolean(user),
      signup,
      login,
      logout,
      playAsGuest,
      finishRun,
      unlockOutfit,
      equipOutfit
    }),
    [
      user,
      progress,
      booting,
      isGuest,
      signup,
      login,
      logout,
      playAsGuest,
      finishRun,
      unlockOutfit,
      equipOutfit
    ]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
