const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Not authenticated.' } });
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Not authenticated.' } });
  }
}

module.exports = requireAuth;
