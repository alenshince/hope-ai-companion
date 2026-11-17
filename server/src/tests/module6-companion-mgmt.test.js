import assert from 'node:assert/strict';
import { dbRepo } from '../services/db/repository.js';
import { checkLoginRateLimit, recordFailedLogin, resetLoginAttempts, signToken } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

console.log('==================================================');
console.log('🧪 RUNNING MODULE 6 TESTS: COMPANION MGMT & MULTI-USER ISOLATION');
console.log('==================================================\n');

// 1. Multi-User Creation & Data Isolation
console.log('[1/4] Testing User Registration & Data Isolation...');
const user1Email = `testuser1_${Date.now()}@hope.local`;
const user2Email = `testuser2_${Date.now()}@hope.local`;

const user1 = dbRepo.createUser({ email: user1Email, password: 'SecurePassword123!', name: 'User One' });
const user2 = dbRepo.createUser({ email: user2Email, password: 'SecurePassword456!', name: 'User Two' });

assert.ok(user1.id, 'User 1 must have an ID');
assert.ok(user2.id, 'User 2 must have an ID');
assert.notStrictEqual(user1.id, user2.id, 'User IDs must be unique');

// Create private data for User 1
const note1 = dbRepo.createNote(user1.id, { title: 'User 1 Confidential Research', content: 'Secret formulas' });
const memory1 = dbRepo.createMemory(user1.id, { title: 'User 1 Career Goal', content: 'Targeting Google DeepMind' });

// Verify User 2 CANNOT see User 1's data (Data Isolation)
const user2Notes = dbRepo.getNotes(user2.id);
const user2Memories = dbRepo.getMemories(user2.id);

assert.strictEqual(user2Notes.some(n => n.id === note1.id), false, "User 2 must NOT access User 1's private notes");
assert.strictEqual(user2Memories.some(m => m.id === memory1.id), false, "User 2 must NOT access User 1's memories");
console.log('  ✓ Multi-user isolation verified: Each user data is strictly partitioned by user_id.');

// 2. Authentication, Password Hashing & Rate Limiting
console.log('\n[2/4] Testing Password Hashing, JWT & Login Rate Limiter...');
const foundUser = dbRepo.findUserByEmail(user1Email);
assert.ok(foundUser, 'Must find registered user');
assert.ok(foundUser.password_hash.startsWith('$2'), 'Password must be hashed with bcrypt ($2a/b/y)');
assert.notStrictEqual(foundUser.password_hash, 'SecurePassword123!', 'Plain password must never be stored');

const validPass = dbRepo.verifyPassword(foundUser, 'SecurePassword123!');
assert.strictEqual(validPass, true, 'Correct password must verify');

const wrongPass = dbRepo.verifyPassword(foundUser, 'WrongPassword!');
assert.strictEqual(wrongPass, false, 'Incorrect password must fail verification');

// JWT verification
const token = signToken(user1);
const decoded = jwt.decode(token);
assert.strictEqual(decoded.id, user1.id, 'JWT must contain user ID');
assert.strictEqual(decoded.email, user1.email, 'JWT must contain email');

// Login Rate Limiter (Max 5 failed attempts per 15 mins)
const testIp = '10.200.5.15';
resetLoginAttempts(testIp);
for (let i = 0; i < 5; i++) {
  recordFailedLogin(testIp);
}
const rateLimitCheck = checkLoginRateLimit(testIp);
assert.strictEqual(rateLimitCheck.allowed, false, '6th login attempt must be rate-limited');
assert.ok(rateLimitCheck.retryAfterMinutes > 0, 'Retry after minutes must be positive');
resetLoginAttempts(testIp);
assert.strictEqual(checkLoginRateLimit(testIp).allowed, true, 'Rate limit should reset on success');
console.log('  ✓ Password hashing (bcrypt), JWT tokens, and login brute-force rate limiter verified.');

// 3. Quiet Hours Detection
console.log('\n[3/4] Testing Quiet Hours Configuration & Logic...');
dbRepo.updateSettings(user1.id, {
  quietHoursEnabled: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
});

const settings = dbRepo.getSettings(user1.id);
assert.strictEqual(settings.quietHoursEnabled, true);
assert.strictEqual(settings.quietHoursStart, '22:00');
assert.strictEqual(settings.quietHoursEnd, '07:00');

// Test isQuietHours evaluation
const isQuiet = dbRepo.isQuietHours(user1.id);
assert.strictEqual(typeof isQuiet, 'boolean', 'isQuietHours must return a boolean');
console.log(`  ✓ Quiet hours configured and verified (currently active: ${isQuiet}).`);

// 4. Memory Management ("Forget This" & Toggle)
console.log('\n[4/4] Testing Memory "Forget This" & Mute Capabilities...');
const tempMem = dbRepo.createMemory(user1.id, {
  title: 'Temporary Goal',
  content: 'Prepare for hackathon registration',
  isActive: true
});

// Toggle memory active -> inactive (muted)
const muted = dbRepo.updateMemory(user1.id, tempMem.id, { isActive: false });
assert.strictEqual(muted.isActive, false, 'Memory should be muted');

// Delete / "Forget This"
dbRepo.deleteMemory(user1.id, tempMem.id);
const refreshedMemories = dbRepo.getMemories(user1.id);
assert.strictEqual(refreshedMemories.some(m => m.id === tempMem.id), false, 'Memory must be permanently deleted ("forgotten")');
console.log('  ✓ Memory mute and "forget this" deletion verified.');

console.log('\n==================================================');
console.log('🎉 ALL MODULE 6 TESTS PASSED SUCCESSFULLY!');
console.log('==================================================');
