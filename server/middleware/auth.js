const jwt = require('jsonwebtoken');

function getJwtSecret() {
  return process.env.JWT_SECRET || 'pratham_temple_escape_fallback_secret_key_2026';
}

function signToken(profile) {
  return jwt.sign(
    { id: profile.id, email: profile.email, full_name: profile.full_name },
    getJwtSecret(),
    { expiresIn: '30d' }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

module.exports = { signToken, requireAuth };
