import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a 32-byte master encryption key from environment variable or local system secret.
 */
function getMasterKey() {
  const envKey = process.env.HEALTH_DATA_KEY || process.env.APP_SECRET || 'hope-health-companion-default-secret-key-32b!';
  // Hash to ensure strictly 32 bytes (256 bits)
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts a plain JavaScript object or string using AES-256-GCM.
 * @param {object|string} data
 * @returns {string} base64 encoded payload: iv + tag + ciphertext
 */
export function encryptHealthData(data) {
  if (data === null || data === undefined) return null;

  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getMasterKey();

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  // Combine IV (12 bytes) + Auth Tag (16 bytes) + Encrypted Data
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts an AES-256-GCM encrypted base64 payload.
 * @param {string} base64Payload
 * @returns {any} decrypted object or string
 */
export function decryptHealthData(base64Payload) {
  if (!base64Payload || typeof base64Payload !== 'string') return null;

  try {
    const combined = Buffer.from(base64Payload, 'base64');
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted payload length');
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const tag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encryptedText = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const key = getMasterKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    const str = decrypted.toString('utf8');

    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  } catch (err) {
    console.warn('Failed decrypting health data payload:', err.message);
    return null;
  }
}

