import { validateAndNormalizeProfileUrl } from './urlValidator.js';

/**
 * Extracts public GitHub username from a normalized GitHub URL.
 * e.g. https://github.com/alenshince -> alenshince
 */
export function extractGitHubUsername(githubUrl) {
  if (!githubUrl || typeof githubUrl !== 'string') return null;
  try {
    const url = new URL(githubUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length > 0 && parts[0] !== 'orgs' && parts[0] !== 'settings') {
      return parts[0];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches public user profile and repositories using the official GitHub REST API (no scraping).
 * @param {string} githubUrl
 * @param {{ userConsent: boolean }} options
 * @returns {Promise<object>}
 */
export async function fetchPublicGitHubProfile(githubUrl, { userConsent = false } = {}) {
  if (!userConsent) {
    throw new Error('Explicit user consent is required before querying the public GitHub REST API.');
  }

  const validation = await validateAndNormalizeProfileUrl(githubUrl);
  if (!validation.valid || validation.platform !== 'github') {
    throw new Error(validation.error || 'Invalid GitHub profile URL');
  }

  const username = extractGitHubUsername(validation.normalizedUrl);
  if (!username) {
    throw new Error('Could not identify a valid public username in GitHub URL');
  }

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Hope-AI-Companion/1.0 (Public Profile Integration)'
  };

  // Optional: Use GITHUB_TOKEN if present in environment for higher rate limits
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // 1. Fetch user public profile
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
  if (!userRes.ok) {
    if (userRes.status === 404) {
      throw new Error(`GitHub user "${username}" not found.`);
    } else if (userRes.status === 403) {
      throw new Error('GitHub API rate limit exceeded. Please try again later.');
    }
    throw new Error(`GitHub API error (HTTP ${userRes.status})`);
  }
  const userData = await userRes.json();

  // 2. Fetch public repositories (top 6 sorted by recent activity)
  let reposData = [];
  try {
    const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6`, { headers });
    if (reposRes.ok) {
      reposData = await reposRes.json();
    }
  } catch (err) {
    console.warn('Failed fetching GitHub repos:', err.message);
  }

  const topRepos = (reposData || []).map(r => ({
    name: r.name,
    description: r.description || 'No description provided',
    language: r.language || 'Code',
    stars: r.stargazers_count || 0,
    forks: r.forks_count || 0,
    url: r.html_url,
    updatedAt: r.updated_at
  }));

  // Aggregate unique languages used across projects
  const languages = Array.from(new Set(topRepos.map(r => r.language).filter(Boolean)));

  return {
    platform: 'github',
    username: userData.login,
    name: userData.name || userData.login,
    bio: userData.bio || '',
    publicReposCount: userData.public_repos || 0,
    followers: userData.followers || 0,
    following: userData.following || 0,
    location: userData.location || '',
    company: userData.company || '',
    blog: userData.blog || '',
    profileUrl: userData.html_url,
    topRepos,
    languages,
    fetchedAt: new Date().toISOString()
  };
}

