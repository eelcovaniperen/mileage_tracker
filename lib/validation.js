// Input validation utilities

/**
 * Validate email format
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  // RFC 5322 compliant email regex (simplified but robust)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, normalized: trimmed };
}

/**
 * Validate password strength
 * @param {string} password
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password is too long' };
  }

  // Check for at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return { valid: false, error: 'Password must contain at least one letter and one number' };
  }

  // Check for common weak passwords
  const weakPasswords = [
    'password', '12345678', '123456789', 'qwerty123', 'password1',
    'iloveyou1', 'admin123', 'welcome1', 'monkey123', 'dragon123'
  ];

  if (weakPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common. Please choose a stronger password' };
  }

  return { valid: true };
}

/**
 * Sanitize string input (trim and limit length)
 * @param {string} input
 * @param {number} maxLength
 * @returns {string|null}
 */
function sanitizeString(input, maxLength = 255) {
  if (!input || typeof input !== 'string') {
    return null;
  }
  return input.trim().slice(0, maxLength);
}

module.exports = { validateEmail, validatePassword, sanitizeString };
