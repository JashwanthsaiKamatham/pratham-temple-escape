const express = require('express');
const bcrypt = require('bcryptjs');
const {
  findProfileByEmail,
  findProfileById,
  createProfile,
  sanitizeProfile
} = require('../db/store');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name, guestStats } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await findProfileByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const password_hash = await bcrypt.hash(String(password), 10);
    const profile = await createProfile({
      email,
      full_name: full_name || email.split('@')[0],
      password_hash,
      initialStats: guestStats || {}
    });

    const token = signToken(profile);
    return res.status(201).json({ token, user: profile });
  } catch (err) {
    console.error('[Auth Signup Error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const existing = await findProfileByEmail(email);
    if (!existing || !existing.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(String(password), existing.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const profile = sanitizeProfile(existing);
    const token = signToken(profile);
    return res.json({ token, user: profile });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: err.message || 'Failed to log in.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const existing = await findProfileById(req.user.id);
    if (!existing) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    return res.json({ user: sanitizeProfile(existing) });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to fetch session.' });
  }
});

module.exports = router;
