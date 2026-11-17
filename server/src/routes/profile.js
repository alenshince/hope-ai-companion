import express from 'express';
import { db } from '../db.js';
import { validateAndNormalizeProfileUrl } from '../services/profile/urlValidator.js';
import { fetchPublicGitHubProfile } from '../services/profile/github.js';
import { buildUserContextProfile } from '../services/profile/contextBuilder.js';

const router = express.Router();

// GET /api/profile - Fetch full user profile & active memories
router.get('/', (req, res) => {
  try {
    const profile = db.getProfile();
    const memories = db.getMemories();
    res.json({
      profile,
      memoriesCount: memories.length,
      activeMemoriesCount: memories.filter(m => m.isActive).length
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
});

// PUT /api/profile - Update user profile information
router.put('/', (req, res) => {
  try {
    const updated = db.updateProfile(req.body);
    res.json({
      message: 'Profile updated successfully',
      profile: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

// POST /api/profile/validate-url - Validates, strips tracking params, and blocks SSRF for profile links
router.post('/validate-url', async (req, res) => {
  try {
    const { url } = req.body;
    const result = await validateAndNormalizeProfileUrl(url);
    if (!result.valid) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/sync-github - Syncs public profile info via official GitHub REST API (no scraping)
router.post('/sync-github', async (req, res) => {
  try {
    const { githubUrl, consent } = req.body;
    if (!consent) {
      return res.status(400).json({ error: 'Consent is required to query public GitHub REST API' });
    }

    const currentProfile = db.getProfile();
    const targetUrl = githubUrl || currentProfile.links?.github;
    if (!targetUrl) {
      return res.status(400).json({ error: 'No GitHub profile URL provided' });
    }

    const githubData = await fetchPublicGitHubProfile(targetUrl, { userConsent: true });

    // Update profile with validated GitHub link and external data
    const externalData = currentProfile.externalData || {};
    externalData.github = githubData;

    const updated = db.updateProfile({
      ...currentProfile,
      links: {
        ...currentProfile.links,
        github: githubData.profileUrl
      },
      externalData
    });

    res.json({
      success: true,
      github: githubData,
      profile: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'GitHub sync failed', details: err.message });
  }
});

// POST /api/profile/pasted-data - Safely saves pasted headline/summary for LinkedIn / Instagram (no scraping)
router.post('/pasted-data', (req, res) => {
  try {
    const { platform, content } = req.body;
    if (!platform || !['linkedin', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'Valid platform required (linkedin or instagram)' });
    }

    const currentProfile = db.getProfile();
    const externalData = currentProfile.externalData || {};

    if (platform === 'linkedin') {
      externalData.linkedinSummary = content || '';
    } else if (platform === 'instagram') {
      externalData.instagramBio = content || '';
    }

    const updated = db.updateProfile({
      ...currentProfile,
      externalData
    });

    res.json({
      success: true,
      message: `${platform.toUpperCase()} summary saved safely.`,
      profile: updated
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save summary', details: err.message });
  }
});

// DELETE /api/profile/external-data - Clears all external profile data
router.delete('/external-data', (req, res) => {
  try {
    const currentProfile = db.getProfile();
    const updated = db.updateProfile({
      ...currentProfile,
      externalData: {}
    });
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear external data', details: err.message });
  }
});

// GET /api/profile/context-profile - Returns user-visible, editable context profile summary
router.get('/context-profile', (req, res) => {
  try {
    const profile = db.getProfile();
    const memories = db.getMemories();
    const contextText = buildUserContextProfile({ profile, memories });

    res.json({
      summary: profile.bio || profile.title,
      skills: profile.techStack || [],
      projects: profile.projects || [],
      interests: ['Flutter', 'Python', 'UI/UX Design', 'Hackathon Organizing (HIVE)', 'Disaster Tech'],
      communicationStyle: 'Intellectual, warm, encouraging, sisterly tone with natural Malayalam/English code-switching',
      rawContextString: contextText,
      externalData: profile.externalData || {}
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to build context profile', details: err.message });
  }
});

// GET /api/profile/memories - List all indexed memories
router.get('/memories', (req, res) => {
  try {
    const { category, search } = req.query;
    let memories = db.getMemories();

    if (category) {
      memories = memories.filter(m => m.category.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const q = search.toLowerCase();
      memories = memories.filter(m => 
        m.title.toLowerCase().includes(q) || 
        m.content.toLowerCase().includes(q) ||
        (m.tags && m.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    res.json(memories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch memories', details: err.message });
  }
});

// POST /api/profile/memories - Add new indexed memory
router.post('/memories', (req, res) => {
  try {
    const { category, title, content, tags, importance, isActive } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Memory content is required' });
    }

    const newMemory = db.createMemory({
      category: category || 'general',
      title: title || 'Personal Note',
      content: content.trim(),
      tags: Array.isArray(tags) ? tags : [],
      importance: importance || 'normal',
      isActive: isActive !== undefined ? isActive : true
    });

    res.status(201).json(newMemory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create memory', details: err.message });
  }
});

// PUT /api/profile/memories/:id - Update or toggle memory
router.put('/memories/:id', (req, res) => {
  try {
    const updated = db.updateMemory(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update memory', details: err.message });
  }
});

// DELETE /api/profile/memories/:id - Delete memory
router.delete('/memories/:id', (req, res) => {
  try {
    db.deleteMemory(req.params.id);
    res.json({ success: true, message: 'Memory deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete memory', details: err.message });
  }
});

// GET /api/profile/context - Raw context string used for AI injection
router.get('/context', (req, res) => {
  try {
    const profile = db.getProfile();
    const memories = db.getMemories();
    const contextString = buildUserContextProfile({ profile, memories });
    res.json({ context: contextString });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assemble context', details: err.message });
  }
});

export default router;
