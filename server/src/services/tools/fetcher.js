import * as cheerio from 'cheerio';
import dns from 'dns/promises';

/**
 * Checks if an IP address belongs to private/internal networks (SSRF prevention).
 */
export function isPrivateIP(ip) {
  if (!ip) return true;
  // IPv4 private & loopback ranges
  if (
    ip === '127.0.0.1' ||
    ip === '0.0.0.0' ||
    ip === '::1' ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('169.254.') || // Link-local & cloud metadata
    ip.startsWith('127.')
  ) {
    return true;
  }
  // 172.16.0.0 – 172.31.255.255
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    const second = Number(parts[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

/**
 * Validates a target URL against SSRF attacks.
 */
export async function validateSafeUrl(urlString) {
  let parsed;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block obvious internal hosts
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan')
  ) {
    throw new Error('Access to local/internal network hosts is prohibited');
  }

  // Resolve hostname to check IP
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    for (const addr of addresses) {
      if (isPrivateIP(addr.address)) {
        throw new Error(`Access to private IP (${addr.address}) is prohibited`);
      }
    }
  } catch (err) {
    if (err.message.includes('prohibited')) throw err;
    throw new Error(`DNS resolution failed for host: ${hostname}`);
  }

  return parsed.href;
}

/**
 * Fetches and extracts clean, readable text from a verified web page.
 */
export async function fetchWebPage(urlString, { maxChars = 4000, timeoutMs = 8000 } = {}) {
  const safeUrl = await validateSafeUrl(urlString);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(safeUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) HopeCompanionResearchBot/2.0',
        'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.9'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Failed to fetch page (HTTP ${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/json')) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, iframes, navigation, headers, footers
    $('script, style, noscript, iframe, nav, header, footer, svg, form, [role="navigation"]').remove();

    // Extract title
    const title = $('title').text().trim() || $('h1').first().text().trim() || safeUrl;

    // Extract main text
    let mainText = $('article, main, .content, #content, body').text() || '';
    mainText = mainText.replace(/\s+/g, ' ').trim();

    return {
      url: safeUrl,
      title,
      content: mainText.slice(0, maxChars)
    };
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error(`Page fetch timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}

