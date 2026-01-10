// Simple in-memory rate limiter for serverless
// Note: This resets on cold starts. For production, consider Upstash Redis.

const rateLimitMap = new Map();

// Clean up old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.windowStart > 60000) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

/**
 * Rate limit check
 * @param {string} identifier - IP address or user ID
 * @param {number} limit - Max requests per window
 * @param {number} windowMs - Window size in milliseconds
 * @returns {{ success: boolean, remaining: number, resetIn: number }}
 */
function checkRateLimit(identifier, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;

  let data = rateLimitMap.get(key);

  if (!data || now - data.windowStart > windowMs) {
    // New window
    data = { count: 1, windowStart: now };
    rateLimitMap.set(key, data);
    return { success: true, remaining: limit - 1, resetIn: windowMs };
  }

  if (data.count >= limit) {
    const resetIn = windowMs - (now - data.windowStart);
    return { success: false, remaining: 0, resetIn };
  }

  data.count++;
  return { success: true, remaining: limit - data.count, resetIn: windowMs - (now - data.windowStart) };
}

/**
 * Stricter rate limit for auth endpoints
 * @param {string} identifier - IP address
 * @returns {{ success: boolean, remaining: number, resetIn: number }}
 */
function checkAuthRateLimit(identifier) {
  // 5 attempts per minute for login/register
  return checkRateLimit(`auth:${identifier}`, 5, 60000);
}

/**
 * General API rate limit
 * @param {string} identifier - IP or user ID
 * @returns {{ success: boolean, remaining: number, resetIn: number }}
 */
function checkApiRateLimit(identifier) {
  // 100 requests per minute for general API
  return checkRateLimit(`api:${identifier}`, 100, 60000);
}

/**
 * Get client IP from request
 * @param {object} req - Request object
 * @returns {string} IP address
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         'unknown';
}

module.exports = { checkRateLimit, checkAuthRateLimit, checkApiRateLimit, getClientIp };
