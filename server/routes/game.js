const express = require('express');
const {
  findProfileById,
  updateProfile,
  sanitizeProfile,
  getLeaderboard
} = require('../db/store');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const OUTFIT_COSTS = {
  classic: { coins: 0, diamonds: 0 },
  royal: { coins: 150, diamonds: 0 },
  shadow: { coins: 350, diamonds: 0 },
  jungle: { coins: 600, diamonds: 0 },
  solar: { coins: 1000, diamonds: 5 }
};

// GET /api/game/leaderboard (public)
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await getLeaderboard(10);
    return res.json({ leaderboard });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to load leaderboard.' });
  }
});

// PUT /api/game/sync (sync run outcome or merge local progress)
router.put('/sync', requireAuth, async (req, res) => {
  try {
    const current = await findProfileById(req.user.id);
    if (!current) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const {
      runScore = 0,
      runCoins = 0,
      runDiamonds = 0,
      runDistance = 0,
      incrementGames = false,
      high_score,
      coins,
      diamonds,
      equipped_outfit,
      unlocked_outfits
    } = req.body || {};

    const nextHighScore = Math.max(
      Number(current.high_score || 0),
      Number(runScore || 0),
      Number(high_score || 0)
    );

    const nextCoins =
      coins !== undefined
        ? Math.max(Number(current.coins || 0), Number(coins || 0)) + Number(runCoins || 0)
        : Number(current.coins || 0) + Number(runCoins || 0);

    const nextDiamonds =
      diamonds !== undefined
        ? Math.max(Number(current.diamonds || 0), Number(diamonds || 0)) + Number(runDiamonds || 0)
        : Number(current.diamonds || 0) + Number(runDiamonds || 0);

    const nextDistance = Number(current.total_distance || 0) + Number(runDistance || 0);
    const nextGamesPlayed =
      Number(current.games_played || 0) + (incrementGames ? 1 : 0);

    const existingUnlocked = Array.isArray(current.unlocked_outfits)
      ? current.unlocked_outfits
      : ['classic'];
    const mergedUnlocked = Array.from(
      new Set([
        'classic',
        ...existingUnlocked,
        ...(Array.isArray(unlocked_outfits) ? unlocked_outfits : [])
      ])
    );

    const nextEquipped =
      equipped_outfit && mergedUnlocked.includes(equipped_outfit)
        ? equipped_outfit
        : current.equipped_outfit || 'classic';

    const updated = await updateProfile(req.user.id, {
      high_score: nextHighScore,
      coins: nextCoins,
      diamonds: nextDiamonds,
      total_distance: nextDistance,
      games_played: nextGamesPlayed,
      unlocked_outfits: mergedUnlocked,
      equipped_outfit: nextEquipped
    });

    return res.json({ user: updated });
  } catch (err) {
    console.error('[Game Sync Error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to sync progress.' });
  }
});

// POST /api/game/unlock-outfit
router.post('/unlock-outfit', requireAuth, async (req, res) => {
  try {
    const { outfitId } = req.body || {};
    const cost = OUTFIT_COSTS[outfitId];
    if (!cost) {
      return res.status(400).json({ error: 'Unknown outfit ID.' });
    }

    const current = await findProfileById(req.user.id);
    if (!current) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const unlocked = Array.isArray(current.unlocked_outfits)
      ? current.unlocked_outfits
      : ['classic'];

    if (unlocked.includes(outfitId)) {
      const updated = await updateProfile(req.user.id, { equipped_outfit: outfitId });
      return res.json({ user: updated });
    }

    if (Number(current.coins || 0) < cost.coins) {
      return res.status(400).json({ error: `Not enough gold coins (need ${cost.coins}).` });
    }
    if (Number(current.diamonds || 0) < cost.diamonds) {
      return res.status(400).json({ error: `Not enough diamonds (need ${cost.diamonds}).` });
    }

    const updated = await updateProfile(req.user.id, {
      coins: Number(current.coins || 0) - cost.coins,
      diamonds: Number(current.diamonds || 0) - cost.diamonds,
      unlocked_outfits: [...unlocked, outfitId],
      equipped_outfit: outfitId
    });

    return res.json({ user: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to unlock outfit.' });
  }
});

// POST /api/game/equip-outfit
router.post('/equip-outfit', requireAuth, async (req, res) => {
  try {
    const { outfitId } = req.body || {};
    const current = await findProfileById(req.user.id);
    if (!current) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const unlocked = Array.isArray(current.unlocked_outfits)
      ? current.unlocked_outfits
      : ['classic'];

    if (!unlocked.includes(outfitId)) {
      return res.status(400).json({ error: 'Outfit is locked.' });
    }

    const updated = await updateProfile(req.user.id, {
      equipped_outfit: outfitId
    });
    return res.json({ user: sanitizeProfile(updated) });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to equip outfit.' });
  }
});

module.exports = router;
