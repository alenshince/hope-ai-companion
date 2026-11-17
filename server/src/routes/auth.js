import express from 'express';
import { dbRepo } from '../services/db/repository.js';
import {
  signToken,
  setAuthCookie,
  clearAuthCookie,
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginAttempts,
  requireAuth
} from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user with email and password
 */
router.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existing = dbRepo.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = dbRepo.createUser({ email, password, name });
    const token = signToken(user);
    setAuthCookie(res, token);

    return res.status(201).json({
      message: 'Account created successfully',
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Registration failed', details: err.message });
  }
});

/**
 * POST /api/auth/login
 * Rate-limited login with bcrypt password comparison & httpOnly JWT cookie
 */
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local';

    // 1. Check rate limit
    const rateLimit = checkLoginRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterMinutes} minute(s).`
      });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 2. Lookup user and verify hash
    const user = dbRepo.findUserByEmail(email);
    if (!user || !dbRepo.verifyPassword(user, password)) {
      recordFailedLogin(clientIp);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Reset rate limit on success and issue token
    resetLoginAttempts(clientIp);
    const token = signToken(user);
    setAuthCookie(res, token);

    return res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

/**
 * POST /api/auth/logout
 * Clears authentication session cookie
 */
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  return res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Returns current authenticated user profile
 */
router.get('/me', requireAuth, (req, res) => {
  const user = dbRepo.findUserById(req.user.id) || req.user;
  return res.json({
    user: { id: user.id, email: user.email, name: user.name }
  });
});

export default router;
