import dns from 'dns/promises';
import { URL } from 'url';

// Allowed hosts for personal profile integration
const ALLOWED_HOSTS = new Set([
  'github.com',
  'www.github.com',
  'api.github.com',
  'linkedin.com',
  'www.linkedin.com',
  'instagram.com',
  'www.instagram.com'
]);

// Blocked tracking parameters to strip
const TRACKING_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref', 'ref_src', 'si', 'fbclid', 'igshid', 'gclid', 'trk', 'originalSubdomain'
];

/**
 * Checks whether an IP address belongs to private/internal/cloud-metadata ranges.
 */
export function isPrivateOrReservedIP(ip) {
  if (!ip || typeof ip !== 'string') return true;

  // IPv6 loopback and private
  if (ip === '::1' || ip === '::' || ip.startsWith('fc00:') || ip.startsWith('fe80:')) {
    return true;
  }

  // IPv4 mapped IPv6 (::ffff:127.0.0.1)
  const cleanIp = ip.replace(/^::ffff:/, '');

  const parts = cleanIp.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true;
  }

  const [a, b] = parts;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local / AWS & Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  return false;
}

/**
 * Validates, normalizes, strips tracking params, and checks DNS SSRF safety for profile URLs.
 * @param {string} rawUrl
 * @returns {Promise<{ valid: boolean, normalizedUrl?: string, platform?: 'github'|'linkedin'|'instagram', error?: string }>}
 */
export async function validateAndNormalizeProfileUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string' };
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch (err) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // 1. Enforce HTTPS only (blocks http, file, ftp, javascript, data schemes)
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only secure HTTPS URLs are permitted' };
  }

  // 2. Validate against Host Allowlist
  const hostname = parsed.hostname.toLowerCase();
  if (!ALLOWED_HOSTS.has(hostname)) {
    return {
      valid: false,
      error: `Host "${hostname}" is not allowed. Only official GitHub, LinkedIn, and Instagram URLs are permitted.`
    };
  }

  // 3. DNS Resolution check to block SSRF / DNS rebinding
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateOrReservedIP(addr.address)) {
        return { valid: false, error: `Host resolves to blocked private address: ${addr.address}` };
      }
    }
  } catch (dnsErr) {
    return { valid: false, error: `Could not resolve domain: ${dnsErr.message}` };
  }

  // 4. Strip tracking parameters
  for (const param of TRACKING_PARAMS) {
    parsed.searchParams.delete(param);
  }

  // 5. Detect platform
  let platform = 'unknown';
  if (hostname.includes('github.com')) platform = 'github';
  else if (hostname.includes('linkedin.com')) platform = 'linkedin';
  else if (hostname.includes('instagram.com')) platform = 'instagram';

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    platform,
    hostname
  };
}

