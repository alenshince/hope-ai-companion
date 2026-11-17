import jwt from 'jsonwebtoken';
import { dbRepo, DEFAULT_USER_ID } from '../services/db/repository.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hope-jwt-super-secret-key-32-chars-long!';
const COOKIE_NAME = 'hope_token';

// Rate limiting on login: max 5 failed attempts per IP per 15 minutes
const loginAttempts = new Map();
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;

export function checkLoginRateLimit(clientIp) {
  const now = Date.now();
  const attempts = (loginAttempts.get(clientIp) || []).filter(ts => now - ts < ATTEMPT_WINDOW_MS);

  if (attempts.length >= MAX_FAILED_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterMinutes: Math.ceil((ATTEMPT_WINDOW_MS - (now - attempts[0])) / 60000)
    };
  }

  return { allowed: true, remaining: MAX_FAILED_ATTEMPTS - attempts.length };
}

export function recordFailedLogin(clientIp) {
  const now = Date.now();
  const attempts = (loginAttempts.get(clientIp) || []).filter(ts => now - ts < ATTEMPT_WINDOW_MS);
  attempts.push(now);
  loginAttempts.set(clientIp, attempts);
}

export function resetLoginAttempts(clientIp) {
  loginAttempts.delete(clientIp);
}

/**
 * Signs a secure JWT token for a user
 */
export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Sets httpOnly, secure, SameSite JWT cookie on response
 */
export function setAuthCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  });
}

/**
 * Clears JWT cookie on logout
 */
export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

/**
 * Extracts and verifies user from JWT in cookie or Authorization header.
 * Attaches req.user or falls back to default user for seamless local single-user experience.
 */
export function requireAuth(req, res, next) {
  let token = req.cookies?.[COOKIE_NAME];

  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }

  if (!token) {
    // If not authenticated, in development/desktop single-user mode, automatically fallback to default Alen user
    req.user = { id: DEFAULT_USER_ID, email: 'alen@hope.local', name: 'Alen Shince' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    req.user = { id: DEFAULT_USER_ID, email: 'alen@hope.local', name: 'Alen Shince' };
    return next();
  }
}
