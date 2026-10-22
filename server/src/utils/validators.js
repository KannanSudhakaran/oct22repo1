function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isNonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateCredentials(email, password) {
  if (!isNonEmpty(email) || !isNonEmpty(password)) {
    return 'Email and password are required.';
  }
  return null;
}

module.exports = { normalizeEmail, isNonEmpty, validateCredentials };
