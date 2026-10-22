const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { normalizeEmail, validateCredentials } = require('../utils/validators');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/jwt');

const BCRYPT_ROUNDS = 10;

function toPublicUser(row) {
  return { id: row.id, email: row.email, role: row.role };
}

async function register(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const validationError = validateCredentials(email, password);
    if (validationError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: validationError } });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let result;
    try {
      result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, role',
        [email, passwordHash]
      );
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: { code: 'EMAIL_IN_USE', message: 'Email is already registered.' } });
      }
      throw err;
    }

    const user = toPublicUser(result.rows[0]);
    const token = signToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({ user });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;

    const validationError = validateCredentials(email, password);
    if (validationError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: validationError } });
    }

    const result = await pool.query(
      'SELECT id, email, password_hash, role, is_active FROM users WHERE email = $1',
      [email]
    );
    const row = result.rows[0];

    const invalidCredentials = () =>
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } });

    if (!row) {
      return invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(password, row.password_hash);
    if (!passwordMatches) {
      return invalidCredentials();
    }

    if (!row.is_active) {
      return res.status(403).json({ error: { code: 'ACCOUNT_DEACTIVATED', message: 'This account has been deactivated.' } });
    }

    const user = toPublicUser(row);
    const token = signToken(user);
    setAuthCookie(res, token);
    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({ ok: true });
}

async function me(req, res, next) {
  try {
    const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [req.user.id]);
    const row = result.rows[0];
    if (!row) {
      return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Not authenticated.' } });
    }
    return res.status(200).json({ user: toPublicUser(row) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, logout, me };
