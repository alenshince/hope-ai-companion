import React, { useState, useEffect } from 'react';
import {
  User,
  Brain,
  Code2,
  Sparkles,
  ExternalLink,
  Github,
  Linkedin,
  Layers,
  Award,
  Plus,
  Trash2,
  Check,
  ToggleLeft,
  ToggleRight,
  Search,
  Eye,
  Edit3,
  Flame,
  Shield,
  FolderGit2,
  BookmarkCheck,
  Instagram,
  RefreshCw,
  ShieldAlert,
  Link,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { api } from '../../api';

export default function AboutMeDashboard({ addToast }) {
  const [profile, setProfile] = useState(null);
  const [memories, setMemories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemoryOpen, setIsAddMemoryOpen] = useState(false);
  const [isContextPreviewOpen, setIsContextPreviewOpen] = useState(false);
  const [compiledContext, setCompiledContext] = useState('');
  const [githubUrlInput, setGithubUrlInput] = useState('');
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [linkedinSummaryInput, setLinkedinSummaryInput] = useState('');
  const [instagramBioInput, setInstagramBioInput] = useState('');
  const [isEditingPastedData, setIsEditingPastedData] = useState(false);

  // New Memory Form State
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('projects');
  const [newTags, setNewTags] = useState('');
  const [newImportance, setNewImportance] = useState('high');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [profileRes, memoriesRes, contextRes] = await Promise.all([
        api.getProfile(),
        api.getMemories(),
        api.getAIContext()
      ]);
      setProfile(profileRes.profile);
      setGithubUrlInput(profileRes.profile?.links?.github || 'https://github.com/alenshince');
      setLinkedinSummaryInput(profileRes.profile?.externalData?.linkedinSummary || '');
      setInstagramBioInput(profileRes.profile?.externalData?.instagramBio || '');
      setMemories(memoriesRes);
      setCompiledContext(contextRes.context);
    } catch (err) {
      console.error('Failed to load About Me data:', err);
      if (addToast) addToast({ type: 'error', title: 'Error', message: 'Could not fetch profile and memories' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleMemory = async (id, currentStatus) => {
    try {
      const updated = await api.updateMemory(id, { isActive: !currentStatus });
      setMemories(prev => prev.map(m => m.id === id ? updated : m));
      // Refresh compiled context
      const contextRes = await api.getAIContext();
      setCompiledContext(contextRes.context);
      if (addToast) {
        addToast({
          type: 'success',
          title: updated.isActive ? 'Memory Active' : 'Memory Muted',
          message: `Context "${updated.title}" ${updated.isActive ? 'is now used by Hope' : 'is paused'}.`
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      await api.deleteMemory(id);
      setMemories(prev => prev.filter(m => m.id !== id));
      const contextRes = await api.getAIContext();
      setCompiledContext(contextRes.context);
      if (addToast) addToast({ type: 'success', title: 'Memory Deleted', message: 'Context removed from Hope.' });
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const tagsArray = newTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      const created = await api.createMemory({
        title: newTitle || 'Personal Note',
        content: newContent.trim(),
        category: newCategory,
        tags: tagsArray,
        importance: newImportance,
        isActive: true
      });

      setMemories(prev => [created, ...prev]);
      const contextRes = await api.getAIContext();
      setCompiledContext(contextRes.context);
      setIsAddMemoryOpen(false);
      setNewTitle('');
      setNewContent('');
      setNewTags('');

      if (addToast) {
        addToast({
          type: 'success',
          title: 'Memory Indexed 🌿',
          message: `Hope now remembers: "${created.title}"`
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Error', message: err.message });
    }
  };

  const handleSyncGitHub = async () => {
    if (!githubUrlInput.trim()) return;
    setIsSyncingGitHub(true);
    try {
      const validation = await api.validateProfileUrl(githubUrlInput.trim());
      if (!validation.valid || validation.platform !== 'github') {
        throw new Error(validation.error || 'Please enter a valid https://github.com/username URL.');
      }

      const res = await api.syncGitHub(validation.normalizedUrl, true);
      setProfile(res.profile);
      const contextRes = await api.getAIContext();
      setCompiledContext(contextRes.context);

      if (addToast) {
        addToast({
          type: 'success',
          title: 'GitHub Synced Successfully 🐙',
          message: `Indexed @${res.github.username} with ${res.github.publicReposCount} public repos & languages (${res.github.languages.join(', ') || 'Code'}).`
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'GitHub Sync Failed', message: err.message });
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  const handleSavePastedData = async (platform, content) => {
    try {
      const res = await api.savePastedProfileData(platform, content);
      setProfile(res.profile);
      const contextRes = await api.getAIContext();
      setCompiledContext(contextRes.context);
      if (addToast) {
        addToast({
          type: 'success',
          title: `${platform.toUpperCase()} Context Updated`,
          message: 'Saved securely with prompt-injection defense.'
        });
      }
    } catch (err) {
      if (addToast) addToast({ type: 'error', title: 'Save Failed', message: err.message });
    }
  };

  const handleClearExternalData = async () => {
    if (confirm('Clear all imported GitHub and pasted profile data from Hope?')) {
      try {
        const res = await api.clearExternalProfileData();
        setProfile(res.profile);
        setLinkedinSummaryInput('');
        setInstagramBioInput('');
        const contextRes = await api.getAIContext();
        setCompiledContext(contextRes.context);
        if (addToast) addToast({ type: 'info', title: 'External Context Cleared', message: 'Removed all external data.' });
      } catch (err) {
        if (addToast) addToast({ type: 'error', title: 'Error', message: err.message });
      }
    }
  };

  const categories = [
    { id: 'all', label: 'All Memories' },
    { id: 'identity', label: 'Identity & Academics' },
    { id: 'tech_stack', label: 'Tech Stack' },
    { id: 'leadership', label: 'HIVE & Events' },
    { id: 'projects', label: 'Projects' },
    { id: 'profiles', label: 'Profiles & Links' },
    { id: 'design', label: 'Design Philosophy' }
  ];

  const filteredMemories = memories.filter(m => {
    const matchesCat = activeCategory === 'all' || m.category.toLowerCase() === activeCategory.toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      m.title.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q) ||
      (m.tags && m.tags.some(t => t.toLowerCase().includes(q)));
    return matchesCat && matchesSearch;
  });

  if (isLoading || !profile) {
    return (
      <div className="flex-1 h-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-hope-100 flex items-center justify-center text-hope-600 animate-spin">
            <Brain className="w-5 h-5" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Assembling Alen's Memory Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-50/70 p-6 md:p-8 space-y-6">
      {/* Top Profile Hero Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-hope-100/60 via-indigo-50/40 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-hope-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-hope-500/25 ring-4 ring-hope-50">
              AS
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{profile.name}</h1>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-hope-100 text-hope-800 border border-hope-200/60">
                  {profile.semester} • {profile.branch}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200/60 flex items-center gap-1">
                  <Award className="w-3 h-3 text-indigo-600" />
                  HIVE Creative Lead
                </span>
              </div>

              <p className="text-sm text-slate-600 font-medium mb-1 flex items-center gap-1.5">
                <span>{profile.institution}</span>
              </p>
              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                {profile.bio}
              </p>
            </div>
          </div>

          {/* Social & AI Context Links */}
          <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
            <a
              href={profile.links?.github}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Github className="w-4 h-4" />
              <span>GitHub / alenshince</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <a
              href={profile.links?.linkedin}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-sky-700 text-white hover:bg-sky-800 transition-colors shadow-sm"
            >
              <Linkedin className="w-4 h-4" />
              <span>LinkedIn Profile</span>
              <ExternalLink className="w-3 h-3 text-sky-200" />
            </a>

            <button
              onClick={() => setIsContextPreviewOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium bg-hope-50 hover:bg-hope-100 text-hope-800 border border-hope-200 transition-colors"
            >
              <Eye className="w-3.5 h-3.5 text-hope-600" />
              <span>Inspect AI Context ({memories.filter(m => m.isActive).length} active)</span>
            </button>
          </div>
        </div>

        {/* Tech Stack Pills Bar */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {profile.techStack?.map((group, idx) => (
            <div key={idx} className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                {group.category}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((tech, tidx) => (
                  <span
                    key={tidx}
                    className="text-xs font-medium px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Project Ecosystem */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-hope-600" />
              Flagship Project Ecosystem
            </h2>
            <p className="text-xs text-slate-500">
              Key projects indexed in Hope's context for tailored assistance & code generation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profile.projects?.map((proj) => (
            <div
              key={proj.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:border-hope-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-hope-700 bg-hope-50 px-2 py-0.5 rounded-md border border-hope-200/60">
                    {proj.category}
                  </span>
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {proj.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base">{proj.name}</h3>
                <p className="text-xs text-hope-800 font-medium mb-2">{proj.tagline}</p>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  {proj.description}
                </p>
              </div>

              <div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {proj.tech?.map((t, idx) => (
                    <span key={idx} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
                {proj.links?.github && (
                  <a
                    href={proj.links.github}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-hope-600 hover:text-hope-800 font-medium"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>View Repository</span>
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leadership & Events Highlight */}
      <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-hope-950 text-white rounded-3xl p-6 md:p-7 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-indigo-300 ring-2 ring-white/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-wider uppercase text-indigo-300">
                Leadership & Coordination
              </span>
              <h3 className="text-lg font-bold text-white">HIVE Creative Team Lead & Event Coordinator</h3>
              <p className="text-xs text-slate-300">Mar Baselios Christian College of Engineering & Technology (MBCCET)</p>
            </div>
          </div>
          <span className="text-xs bg-white/10 text-white font-medium px-3 py-1 rounded-full border border-white/20">
            Flagship Coordinator
          </span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed mb-4 max-w-3xl">
          Leading the creative identity and event infrastructure for the CSE community. Spearheaded organization, brand language, and technical hackathon execution for major collegiate milestones:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur p-3.5 rounded-2xl border border-white/10">
            <div className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-400" />
              Hack Till Dawn
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              24-hour overnight collegiate hackathon coordinating 100+ student developers with complete branding and logistics.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur p-3.5 rounded-2xl border border-white/10">
            <div className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              Smart India Hackathon (SIH)
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Coordinated internal college selections, mentorship rounds, and pitch readiness evaluations for national competition.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur p-3.5 rounded-2xl border border-white/10">
            <div className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-hope-300" />
              UI/UX & Tech Bootcamps
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Hands-on sessions on Figma prototyping, Flutter architecture, and design-to-code workflows for junior students.
            </p>
          </div>
        </div>
      </div>

      {/* Connected Public Profiles & Official Data Sync */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
              <Link className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Connected Profiles & External Context
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Prompt-Injection Protected
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Official REST API syncing with zero unauthorized scraping and strict SSRF defenses.
              </p>
            </div>
          </div>

          {profile.externalData && Object.keys(profile.externalData).length > 0 && (
            <button
              onClick={handleClearExternalData}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 transition-colors"
            >
              Clear External Data
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* GitHub Official REST API Sync */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Github className="w-4 h-4 text-slate-900" />
                <span>GitHub Public Portfolio</span>
              </div>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Official REST API (v3)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hope queries the official public GitHub REST API with your consent (no scraping) to index your public repositories, primary languages, and contributions.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-700 block">GitHub Profile URL (HTTPS only):</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={githubUrlInput}
                  onChange={(e) => setGithubUrlInput(e.target.value)}
                  placeholder="https://github.com/alenshince"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-hope-500/20"
                />
                <button
                  type="button"
                  disabled={isSyncingGitHub}
                  onClick={handleSyncGitHub}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGitHub ? 'animate-spin' : ''}`} />
                  <span>{isSyncingGitHub ? 'Syncing...' : 'Sync GitHub'}</span>
                </button>
              </div>
            </div>

            {/* GitHub Sync Status Card */}
            {profile.externalData?.github ? (
              <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">
                    @{profile.externalData.github.username}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Synced: {new Date(profile.externalData.github.fetchedAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Public Repos</span>
                    <span className="font-bold text-slate-800">{profile.externalData.github.publicReposCount}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Followers</span>
                    <span className="font-bold text-slate-800">{profile.externalData.github.followers}</span>
                  </div>
                  <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[10px]">Languages</span>
                    <span className="font-bold text-hope-700 truncate">{profile.externalData.github.languages?.length || 0}</span>
                  </div>
                </div>
                {profile.externalData.github.languages && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {profile.externalData.github.languages.map((l, i) => (
                      <span key={i} className="text-[10px] font-mono bg-hope-50 text-hope-800 px-2 py-0.5 rounded-md border border-hope-200">
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-400 italic">
                No GitHub data synced yet. Tap "Sync GitHub" to pull your repositories.
              </div>
            )}
          </div>

          {/* LinkedIn & Instagram Manual Import (No Scraping Policy) */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Linkedin className="w-4 h-4 text-sky-700" />
                <Instagram className="w-4 h-4 text-pink-600" />
                <span>LinkedIn & Instagram Data</span>
              </div>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Terms of Service Protected (No Scraping)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              To respect user privacy and platform Terms of Service, Hope <strong>never scrapes LinkedIn or Instagram</strong>. Securely paste your headline or creative focus below to personalize career advice:
            </p>

            {/* LinkedIn Paste */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>LinkedIn Headline & About:</span>
                <button
                  type="button"
                  onClick={() => handleSavePastedData('linkedin', linkedinSummaryInput)}
                  className="text-hope-600 hover:text-hope-800 text-[11px] font-bold"
                >
                  Save LinkedIn
                </button>
              </label>
              <textarea
                rows={2}
                value={linkedinSummaryInput}
                onChange={(e) => setLinkedinSummaryInput(e.target.value)}
                placeholder="Paste your LinkedIn headline, skills, or career objective..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-hope-500/20"
              />
            </div>

            {/* Instagram Paste */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                <span>Instagram Creative Bio:</span>
                <button
                  type="button"
                  onClick={() => handleSavePastedData('instagram', instagramBioInput)}
                  className="text-hope-600 hover:text-hope-800 text-[11px] font-bold"
                >
                  Save Instagram
                </button>
              </label>
              <input
                type="text"
                value={instagramBioInput}
                onChange={(e) => setInstagramBioInput(e.target.value)}
                placeholder="Paste your Instagram creative focus (e.g. Design Lead • UI/UX Prototyper)..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-hope-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Memory Core & Indexed Context Bank */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Brain className="w-4 h-4 text-hope-600" />
              Personalized Memory Engine (Indexed Facts)
            </h2>
            <p className="text-xs text-slate-500">
              Episodic and semantic memories Hope leverages to personalize research, suggestions, and answers.
            </p>
          </div>

          <button
            onClick={() => setIsAddMemoryOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-hope-600 hover:bg-hope-700 text-white shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Teach Hope a New Fact</span>
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-hope-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
            />
          </div>
        </div>

        {/* Memory Items List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMemories.map((mem) => (
            <div
              key={mem.id}
              className={`p-4 rounded-2xl border transition-all ${
                mem.isActive
                  ? 'bg-white border-slate-200/80 shadow-sm'
                  : 'bg-slate-100/60 border-dashed border-slate-300 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-hope-50 text-hope-800 border border-hope-200/60">
                    {mem.category}
                  </span>
                  <h4 className="text-sm font-bold text-slate-800">{mem.title}</h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggleMemory(mem.id, mem.isActive)}
                    className="p-1 rounded-lg text-slate-400 hover:text-hope-600 transition-colors"
                    title={mem.isActive ? 'Deactivate from AI Context' : 'Activate in AI Context'}
                  >
                    {mem.isActive ? (
                      <ToggleRight className="w-5 h-5 text-hope-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteMemory(mem.id)}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {mem.content}
              </p>

              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap gap-1">
                  {mem.tags?.map((t, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono text-[10px]">
                      #{t}
                    </span>
                  ))}
                </div>
                <span className="capitalize text-[10px]">Importance: {mem.importance}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Memory Modal */}
      {isAddMemoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-lg p-6">
            <h3 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
              <Brain className="w-4 h-4 text-hope-600" />
              Teach Hope a New Context Memory
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a personal fact, current project update, or preference. Hope will automatically index this into context.
            </p>

            <form onSubmit={handleAddMemory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Current Hackathon Topic or Preference"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
                  >
                    <option value="projects">Projects</option>
                    <option value="tech_stack">Tech Stack</option>
                    <option value="leadership">Leadership & Events</option>
                    <option value="preferences">Preferences & Workflow</option>
                    <option value="identity">Identity & Bio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Importance</label>
                  <select
                    value={newImportance}
                    onChange={(e) => setNewImportance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Memory Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Detail the memory or fact for Hope..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="flutter, hackathon, pwa"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-hope-500/20 focus:border-hope-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddMemoryOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-hope-600 hover:bg-hope-700 text-white shadow-sm transition-colors"
                >
                  Save & Index
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Context Preview Modal */}
      {isContextPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 w-full max-w-2xl p-6 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Brain className="w-4 h-4 text-hope-600" />
                Live AI Prompt Memory Context
              </h3>
              <button
                onClick={() => setIsContextPreviewOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-medium"
              >
                Close
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              This exact background memory block is injected into Hope's AI system instructions for tailored reasoning.
            </p>

            <pre className="flex-1 overflow-y-auto bg-slate-900 text-slate-100 p-4 rounded-2xl text-xs font-mono whitespace-pre-wrap leading-relaxed border border-slate-800">
              {compiledContext}
            </pre>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
              <span>Token overhead: ~450 tokens • Status: Active & Injected</span>
              <button
                onClick={() => setIsContextPreviewOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-hope-600 text-white text-xs font-semibold hover:bg-hope-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

