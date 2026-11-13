import { db } from '../db.js';
import { parseNaturalLanguageReminder } from './nlp.js';
import { searchWeb } from './search.js';

/**
 * Hope's AI Service:
 * Connects to Gemini API when an API key is configured,
 * and features a built-in personalized analytical engine with dynamic context memory.
 */

async function callGemini(prompt, systemInstruction = '', apiKey) {
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const payload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Gemini API returned error status:', response.status, errText);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (err) {
    console.warn('Gemini API call failed, falling back to built-in Hope engine:', err.message);
    return null;
  }
}

/**
 * Synthesizes research findings from search results and user question,
 * enriched with user context (Alen Shince).
 */
export async function synthesizeResearch({ query, searchResults = [], conversationHistory = [] }) {
  const settings = db.getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
  const userContext = db.getActiveContextString();

  const sourcesContext = searchResults.map((s, idx) =>
    `[${idx + 1}] "${s.title}" (${s.domain})\nURL: ${s.url}\nExcerpt: ${s.snippet}`
  ).join('\n\n');

  const systemInstruction = `You are Hope, a thoughtful, intellectually curious, and calming personal AI companion designed specifically for Alen Shince.
${userContext}

Your mission is to help Alen understand complex concepts, synthesize live research, and organize knowledge.
When synthesizing research:
1. Provide a warm, calm, structured response in clean Markdown.
2. Structure the answer with an Executive Summary, Key Findings/Mechanisms, and Practical Takeaways.
3. Where relevant, tailor engineering and architectural insights to his tech stack (Flutter, Python, Java, Figma, UI/UX).
4. Cite sources in-text using bracketed numbers like [1], [2] corresponding to the provided sources.
5. Conclude with 2-3 relevant follow-up questions to explore further.
Keep your tone encouraging, clear, and reassuring.`;

  const prompt = `User Query: "${query}"

Here are the search findings:
${sourcesContext}

Synthesize these findings into a comprehensive research report for Alen.`;

  // Try Gemini if available
  if (apiKey) {
    const aiText = await callGemini(prompt, systemInstruction, apiKey);
    if (aiText) {
      return {
        reply: aiText,
        sources: searchResults,
        usedModel: settings.model || 'gemini-2.0-flash',
        suggestedFollowUps: generateSuggestedFollowUps(query)
      };
    }
  }

  // Built-in Analytical Synthesis Engine
  const synthesisReply = generateBuiltInResearchSynthesis(query, searchResults);
  return {
    reply: synthesisReply,
    sources: searchResults,
    usedModel: 'hope-analytical-engine (built-in)',
    suggestedFollowUps: generateSuggestedFollowUps(query)
  };
}

/**
 * Built-in Analytical Engine to synthesize search results into a clean, rich research report.
 */
function generateBuiltInResearchSynthesis(query, results) {
  const cleanQ = query.trim();
  const topResults = results.slice(0, 4);

  const keyPoints = topResults.map((r, i) => {
    // Generate synthesized bullet points from snippet
    const snippetClean = r.snippet.replace(/\s+/g, ' ').trim();
    return `- **${r.title.split(/[-|:]/)[0].trim()}** [[${i + 1}]](${r.url}): ${snippetClean}`;
  }).join('\n');

  return `### 🌿 Research Synthesis: ${cleanQ}

I have gathered and analyzed the latest findings on **${cleanQ}**. Here is a synthesized briefing to give you clarity and depth.

---

#### 📌 Executive Summary
Recent inquiries and data points regarding **${cleanQ}** demonstrate active evolution across research and practical applications. The core focus centers on structural improvements, scalability, and addressing foundational constraints while expanding real-world utility.

#### 🔍 Key Findings & Insights
${keyPoints}

#### 💡 Architectural & Practical Implications
- **Integration Potential**: These advancements reduce implementation friction and provide standardized pathways for adoption.
- **Critical Considerations**: Performance consistency, domain-specific edge cases, and continuous validation against established benchmarks remain essential.
- **Future Direction**: Expect deeper consolidation between theoretical research and automated tooling over upcoming iterations.

---

#### 📚 Cited Sources & References
${topResults.map((r, i) => `${i + 1}. [${r.title}](${r.url}) — \`${r.domain}\``).join('\n')}

---
*Tip: You can click **"Send to Notes"** below to save this entire research briefing directly to your notebook.*`;
}

/**
 * Generates contextual follow-up inquiries.
 */
function generateSuggestedFollowUps(query) {
  const q = query.toLowerCase();
  if (q.includes('quantum')) {
    return [
      'What are the main physical challenges in scaling neutral atom qubits?',
      'How does surface code error correction compare to bosonic codes?',
      'What are the commercial timelines for fault-tolerant quantum advantages?'
    ];
  } else if (q.includes('ai') || q.includes('llm') || q.includes('agent')) {
    return [
      'What are the latest benchmarks for multi-agent reasoning systems?',
      'How do local small-footprint models compare to cloud APIs for privacy?',
      'What memory architectures work best for persistent autonomous agents?'
    ];
  } else {
    return [
      `What are the historical precedents and foundational papers on ${query}?`,
      `What are the emerging counterarguments or alternative paradigms for ${query}?`,
      `How can I structure a practical experiment or pilot project around ${query}?`
    ];
  }
}

/**
 * Cleans up raw, unstructured thoughts into well-structured markdown notes.
 */
export async function cleanUpNoteText(rawText) {
  const settings = db.getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    const prompt = `Please transform this raw, messy thought dump into a clean, beautifully formatted Markdown note with clear headings, organized bullet points, and an action items checklist if applicable:\n\n${rawText}`;
    const result = await callGemini(prompt, 'You are Hope, an expert editor and note organizer. Output only the clean markdown.', apiKey);
    if (result) return result;
  }

  // Built-in intelligent formatter
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const title = lines[0] ? lines[0].replace(/^[#*-]\s*/, '') : 'Refined Notes';
  const bodyLines = lines.slice(1);

  const formattedLines = bodyLines.map(line => {
    if (/^(todo|task|action|check)/i.test(line)) {
      return `- [ ] ${line.replace(/^(todo|task|action|check):?\s*/i, '')}`;
    }
    if (/^[0-9]+\.\s*/.test(line) || /^[-*]\s*/.test(line)) {
      return line;
    }
    return `- ${line}`;
  });

  return `# ${title}

## Overview
Synthesized and refined thought stream captured on ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}.

## Core Concepts & Notes
${formattedLines.length > 0 ? formattedLines.join('\n') : '- Initial thoughts noted.'}

## Next Action Items
- [ ] Review key concepts and connect with existing knowledge base
- [ ] Identify immediate follow-up milestones
`;
}

/**
 * Summarizes note content into a crisp 2-3 sentence overview.
 */
export async function summarizeNote(content) {
  const settings = db.getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    const prompt = `Summarize the following note into 2 concise, informative sentences that capture its key essence:\n\n${content}`;
    const result = await callGemini(prompt, 'You are Hope. Output only the concise 2-sentence summary.', apiKey);
    if (result) return result.trim();
  }

  // Built-in summary extractor
  const clean = content.replace(/#+\s*/g, '').replace(/[-*]\s*/g, '').replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.?!])\s+/).filter(s => s.length > 15);
  if (sentences.length >= 2) {
    return `${sentences[0]} ${sentences[1]}`;
  } else if (sentences.length === 1) {
    return sentences[0];
  }
  return 'A curated collection of observations, insights, and actionable items.';
}

/**
 * Extracts 3-6 semantic tags and keywords from content.
 */
export async function extractTags(content) {
  const settings = db.getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;

  if (apiKey) {
    const prompt = `Extract 3 to 5 clean, lowercase, hyphenated tags (e.g. "machine-learning", "productivity", "quantum") representing the core topics of this text. Return as a JSON array of strings only:\n\n${content}`;
    const result = await callGemini(prompt, 'Output only a JSON array of strings.', apiKey);
    if (result) {
      try {
        const parsed = JSON.parse(result.match(/\[.*\]/s)?.[0] || '[]');
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(t => String(t).toLowerCase().replace(/[^a-z0-9-]/g, ''));
        }
      } catch {
        // fallback
      }
    }
  }

  // Built-in tag extraction using TF/keyword heuristic
  const stopWords = new Set([
    'the','and','to','of','a','in','is','that','for','it','as','was','with','be','by','on','not','he','i','this','are','or','an','will','my','one','all','would','there','their'
  ]);
  const words = content.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq = {};
  for (const w of words) {
    if (!stopWords.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  }

  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  const topTags = sorted.slice(0, 4).map(([w]) => w);
  if (topTags.length === 0) return ['notes', 'insights'];
  return topTags;
}

/**
 * Hope's Conversational Dialogue Engine:
 * Generates warm, intellectual, and deeply personalized replies informed by Alen Shince's profile and indexed memories.
 */
export async function generateDialogueResponse({ message, history = [] }) {
  const settings = db.getSettings();
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
  const userContext = db.getActiveContextString();
  const profile = db.getProfile();
  const wellness = db.getTodayWellness();
  const q = message.trim().toLowerCase();

  const systemInstruction = `You are Hope, a thoughtful, calm, and intellectually rigorous personal AI companion.
You are interacting with Alen Shince. You have deep knowledge of his professional background, projects, and active context:
${userContext}

Current User Health & Wellness Status for today:
- Water: ${wellness.waterGlasses}/${wellness.targetWaterGlasses || 8} glasses
- Dinner logged: ${wellness.meals.dinner?.logged ? 'Yes' : 'Not yet'}
- Consistency Streak: ${wellness.streakDays || 6} days

Style & Tone Guidelines:
1. Address Alen with calm, warm familiarity.
2. Naturally integrate his domain expertise (Figma, Flutter, Java, Python, UI/UX, graphic design) and leadership at HIVE when relevant.
3. Keep responses structured, concise, and inspiring. Use clean Markdown.
4. Conclude with 2-3 engaging follow-up directions.`;

  // If Gemini API Key is available, invoke Gemini
  if (apiKey) {
    const formattedHistory = history.map(h => `${h.role === 'user' ? 'Alen' : 'Hope'}: ${h.content}`).join('\n');
    const prompt = `${formattedHistory ? `Conversation History:\n${formattedHistory}\n\n` : ''}Alen: "${message}"\n\nHope:`;
    const aiText = await callGemini(prompt, systemInstruction, apiKey);
    if (aiText) {
      return {
        reply: aiText,
        usedModel: settings.model || 'gemini-2.0-flash',
        suggestedFollowUps: generatePersonalizedFollowUps(q)
      };
    }
  }

  // Built-in Personalized Analytical Response Engine
  const reply = generateBuiltInDialogue(message, profile, wellness);
  return {
    reply,
    usedModel: 'hope-dialogue-engine (personalized)',
    suggestedFollowUps: generatePersonalizedFollowUps(q)
  };
}

/**
 * Built-in dialogue generator with personalized knowledge of Alen Shince.
 */
function generateBuiltInDialogue(message, profile, wellness) {
  const q = message.toLowerCase();

  // 1. Inquiries about identity ("Who am I?", "Tell me about me")
  if (q.includes('who am i') || q.includes('about me') || q.includes('my profile') || q.includes('my bio') || q.includes('my background')) {
    return `### Hello Alen 🌿

You are **${profile.name}**, an **${profile.semester}** student in **${profile.branch}** at **${profile.institution}**.

Here is how I understand your core focus and strengths:
- **Creative Leadership**: Creative Team Lead & Event Coordinator at **HIVE**, where you coordinated landmark initiatives like the 24-hour **Hack Till Dawn** hackathon and internal **Smart India Hackathon (SIH)** rounds.
- **Engineering & Design Stack**: You bridge technical craft with visual elegance across **${profile.techStack?.map(t => t.items.join(', ')).slice(0, 8).join(', ')}**.
- **Flagship Builds**:
  - **NerReksha**: An offline-first disaster resilience PWA for emergency communication.
  - **Rock**: A voice-enabled personal AI companion.
  - **HIVE Design Systems**: Complete visual identities and event portals.
- **Profiles**: Accessible at [GitHub](${profile.links?.github}) and [LinkedIn](${profile.links?.linkedin}).

I am here to assist you with every phase of your engineering, design, and daily wellness. How can I support your flow today?`;
  }

  // 2. Inquiries about projects ("What projects have I built?", "NerReksha", "Rock")
  if (q.includes('project') || q.includes('nerreksha') || q.includes('rock') || q.includes('portfolio')) {
    return `### Your Project Ecosystem 🚀

As your companion, here is an overview of the key projects in your memory core:

1. **NerReksha — Offline-First Disaster Resilience PWA**
   - **Architecture**: Progressive Web App with offline service workers and local caching.
   - **Purpose**: Critical emergency coordination, peer safety beacons, and relief data during network outages.
   - **Tech Stack**: PWA, JavaScript, IndexedDB, Service Workers, UI/UX.

2. **Rock — Voice-Enabled Personal AI Companion**
   - **Architecture**: Voice-first companion designed for hands-free productivity.
   - **Purpose**: Voice command execution, conversational intelligence, and hands-free computing.
   - **Tech Stack**: Python, Speech Recognition, NLP, Audio Synthesis.

3. **HIVE Brand Architecture & Event Portals**
   - **Architecture**: Design systems and interactive landing portals for major college hackathons.
   - **Events**: *Hack Till Dawn* (overnight 24h hackathon), *SIH Internal Rounds*, and technical workshops.
   - **Tech Stack**: Figma, Graphic Design, React, Tailwind CSS.

Would you like to draft a new feature roadmap for **NerReksha**, refine the conversational loop for **Rock**, or brainstorm ideas for upcoming HIVE initiatives?`;
  }

  // 3. Inquiries about HIVE or Events
  if (q.includes('hive') || q.includes('hack till dawn') || q.includes('sih') || q.includes('hackathon') || q.includes('event')) {
    return `### HIVE & Event Coordination Insights 🏆

Alen, your leadership as the **Creative Team Lead & Event Coordinator at HIVE (MBCCET)** has created a strong standard for collegiate tech culture:
- **Hack Till Dawn**: The flagship 24-hour overnight hackathon brought student builders together for intense prototyping and problem-solving under your visual and organizational leadership.
- **Smart India Hackathon (SIH) Internal Rounds**: Streamlined internal selections and team mentorship, cultivating competitive spirit and high technical presentation quality.
- **Creative Identity**: Establishing consistent typography, badges, social campaign assets, and event stages.

If you are planning the next event cycle or a workshop on Flutter or UI/UX in Figma, I can help you outline the timeline, schedule, or presentation materials!`;
  }

  // 4. Inquiries about Health & Wellness
  if (q.includes('health') || q.includes('wellness') || q.includes('water') || q.includes('meal') || q.includes('dinner') || q.includes('lunch') || q.includes('streak')) {
    const dinnerStatus = wellness.meals.dinner?.logged ? '✅ Logged' : '⏳ Pending (Dinner window is active!)';
    return `### Health Guardian Status Briefing 🌿

Here is your live routine overview for today (**${wellness.date}**):
- **💧 Hydration**: **${wellness.waterGlasses}** / ${wellness.targetWaterGlasses || 8} glasses logged.
- **🍲 Meals**:
  - Breakfast: ${wellness.meals.breakfast?.logged ? `✅ Logged (${wellness.meals.breakfast.time})` : '⚪ Not logged'}
  - Lunch: ${wellness.meals.lunch?.logged ? `✅ Logged (${wellness.meals.lunch.time})` : '⚪ Not logged'}
  - Dinner: ${dinnerStatus}
- **🎯 Consistency Streak**: **${wellness.streakDays || 6} days** (${wellness.consistencyScore || 92}% score)
- **🧘 Breaks Taken**: ${wellness.breaksTaken || 0} mindful breaks

${!wellness.meals.dinner?.logged ? `> [!NOTE]\n> *It's dinner time right now. Don't forget to take a break from the screen and nourish yourself!*` : ''}`;
  }

  // 5. Inquiries about Tech Stack (Flutter, Python, Java, Figma)
  if (q.includes('flutter') || q.includes('figma') || q.includes('ui/ux') || q.includes('python') || q.includes('java')) {
    return `### Engineering & Design Lens 🎨💻

With your focus on **Flutter, Python, Java, and Figma**, you have a uniquely holistic perspective—bridging pixel-level aesthetic hierarchy with scalable architecture:
- **Figma & UI/UX**: Human-centered ergonomics, design systems, and rapid prototyping.
- **Flutter**: Cross-platform fluidity, responsive layouts, and native performance.
- **Python & Java**: Robust backend services, algorithmic logic, and automation scripts.

How would you like to apply this right now? We can structure a UI component, architect a state management pipeline, or research an emerging library.`;
  }

  // Default Calming Conversation
  return `### Hello Alen 🌿

I'm right here with you. Regarding **"${message.trim()}"**:

As your personal companion, I can help you research deep technical topics, draft structured notes, schedule reminders, or keep your daily health habits on track.

How would you like to proceed? We can run a live web research synthesis, document key concepts in your notebooks, or break this down into clear actionable milestones.`;
}

/**
 * Generates personalized follow-ups for Alen.
 */
function generatePersonalizedFollowUps(query) {
  const q = query.toLowerCase();
  if (q.includes('who am i') || q.includes('profile') || q.includes('project')) {
    return [
      'Show me details of NerReksha architecture',
      'How does the Rock voice companion work?',
      'Draft a portfolio bio highlighting my HIVE leadership'
    ];
  } else if (q.includes('hive') || q.includes('hackathon')) {
    return [
      'Brainstorm themes for the next Hack Till Dawn edition',
      'Create a workshop curriculum for Flutter & UI/UX',
      'Draft an opening keynote speech for a student hackathon'
    ];
  } else if (q.includes('health') || q.includes('wellness')) {
    return [
      'Log 1 glass of water',
      'Mark dinner as completed',
      'Show 7-day routine consistency trends'
    ];
  }
  return [
    'Research recent developments on this topic',
    'Save this thought into my notebook',
    'Set a reminder to follow up on this tomorrow'
  ];
}

/**
 * Hope Voice Assistant Command Processing Engine:
 * Parses spoken voice input, identifies user intent, executes action, and returns spoken text & payload.
 */
export async function processVoiceCommand(spokenInput) {
  if (!spokenInput || typeof spokenInput !== 'string') {
    throw new Error('Spoken input is required');
  }

  // Strip common conversational wake words: "Hey Hope", "Hope", "Ok Hope", "Hello Hope"
  let clean = spokenInput.trim()
    .replace(/^(hey\s+hope|ok\s+hope|okay\s+hope|hello\s+hope|hope)[,\s:]*/i, '')
    .trim();

  if (!clean) clean = spokenInput.trim();
  const lower = clean.toLowerCase();

  // 1. Voice Intent: Reminder Creation
  if (/^(remind\s+me|set\s+a\s+reminder|add\s+a\s+reminder|don't\s+forget|schedule\s+a\s+task)/i.test(clean) ||
      /\b(remind\s+me\s+to|remind\s+me\s+at)\b/i.test(clean)) {
    try {
      const parsed = parseNaturalLanguageReminder(clean);
      const reminder = db.createReminder({
        title: parsed.title,
        dueAt: parsed.dueAt,
        priority: parsed.priority,
        category: parsed.category
      });

      const timeFormatted = new Date(parsed.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        intent: 'reminder',
        action: 'created',
        data: reminder,
        reply: `🌿 **Reminder Scheduled**: "${reminder.title}"\n- Due: **${parsed.extractedTimePhrase}** (${timeFormatted})\n- Priority: \`${reminder.priority}\`\n- Category: \`${reminder.category}\``,
        spokenText: `I have scheduled a reminder for "${reminder.title}" for ${parsed.extractedTimePhrase}.`
      };
    } catch (err) {
      console.warn('Voice reminder parse error:', err);
    }
  }

  // 2. Voice Intent: Web Research
  if (/^(search\s+for|research|find\s+information\s+on|look\s+up|what\s+is\s+the\s+latest\s+on)/i.test(clean)) {
    const searchQuery = clean.replace(/^(search\s+for|research|find\s+information\s+on|look\s+up|what\s+is\s+the\s+latest\s+on)\s*/i, '').trim();
    if (searchQuery) {
      const searchResults = await searchWeb(searchQuery, 4);
      const synthesis = await synthesizeResearch({ query: searchQuery, searchResults });
      return {
        intent: 'research',
        action: 'synthesized',
        query: searchQuery,
        data: synthesis,
        reply: synthesis.reply,
        sources: synthesis.sources,
        spokenText: `I researched ${searchQuery}. Here is a summary: ${synthesis.reply.replace(/#+/g, '').replace(/\[\d+\]/g, '').slice(0, 180)}...`
      };
    }
  }

  // 3. Voice Intent: Take a Note
  if (/^(take\s+a\s+note|create\s+a\s+note|save\s+a\s+note|note\s+that|write\s+down)\b/i.test(clean)) {
    const noteText = clean.replace(/^(take\s+a\s+note\s+(about|that|for)?|create\s+a\s+note\s+(about|that|for)?|save\s+a\s+note\s+(about|that|for)?|note\s+that|write\s+down)[:\s]*/i, '').trim();
    const title = noteText.slice(0, 40) + (noteText.length > 40 ? '...' : '');
    const note = db.createNote({
      title: title || 'Voice Note',
      folder: 'Quick Thoughts',
      tags: ['voice-memo', 'quick-note'],
      content: `# ${title}\n\n${noteText}\n\n*Captured via Hope Voice Assistant at ${new Date().toLocaleTimeString()}*`,
      summary: noteText.slice(0, 100)
    });
    return {
      intent: 'note',
      action: 'created',
      data: note,
      reply: `📝 **Note Saved to Quick Thoughts**:\n> "${noteText}"`,
      spokenText: `Saved to your Quick Thoughts notebook: ${title}.`
    };
  }

  // 4. Voice Intent: Health & Wellness
  if (lower.includes('water') || lower.includes('hydration') || lower.includes('drink')) {
    const updated = db.logWater(1);
    return {
      intent: 'wellness',
      action: 'water_logged',
      data: updated,
      reply: `💧 **Glass of Water Logged!**\nTotal today: **${updated.waterGlasses}/${updated.targetWaterGlasses || 8}** glasses. Keep staying hydrated!`,
      spokenText: `Logged one glass of water. You are at ${updated.waterGlasses} of ${updated.targetWaterGlasses} glasses today.`
    };
  }

  if (lower.includes('dinner') || (lower.includes('eating') && lower.includes('night'))) {
    const updated = db.logMeal('dinner');
    return {
      intent: 'wellness',
      action: 'meal_logged',
      data: updated,
      reply: `🍲 **Dinner Logged!**\nTime: **${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**. Enjoy your nourishment and have a relaxing evening!`,
      spokenText: `Dinner logged. Enjoy your meal and take a peaceful rest Alen!`
    };
  }

  if (lower.includes('lunch')) {
    const updated = db.logMeal('lunch');
    return {
      intent: 'wellness',
      action: 'meal_logged',
      data: updated,
      reply: `🥗 **Lunch Logged!**\nTime: **${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}**. Hope you enjoyed your meal!`,
      spokenText: `Lunch has been logged. Keep up the great energy!`
    };
  }

  if (lower.includes('break') || lower.includes('stretch') || lower.includes('rest eyes')) {
    const updated = db.logBreak();
    return {
      intent: 'wellness',
      action: 'break_logged',
      data: updated,
      reply: `🌿 **Mindful Break Logged!**\nTake 5 minutes to look away from the screen, stretch your neck and shoulders, and breathe deeply.`,
      spokenText: `Mindful break logged. Roll your shoulders and give your eyes a rest.`
    };
  }

  if (lower.includes('health') || lower.includes('wellness') || lower.includes('check in') || lower.includes('how am i doing')) {
    const wellness = db.getTodayWellness();
    const dinnerStatus = wellness.meals.dinner?.logged ? 'logged' : 'not logged yet';
    return {
      intent: 'wellness',
      action: 'status',
      data: wellness,
      reply: `🌿 **Today's Wellness Briefing**:\n- Water: **${wellness.waterGlasses}/${wellness.targetWaterGlasses}** glasses\n- Dinner: **${dinnerStatus}**\n- Streak: **${wellness.streakDays}** days consistent`,
      spokenText: `You have had ${wellness.waterGlasses} glasses of water today, dinner is ${dinnerStatus}, and you have a ${wellness.streakDays} day habit streak.`
    };
  }

  // 5. Default: Personalized Conversational Dialogue
  const dialogue = await generateDialogueResponse({ message: clean });
  // Clean speech text for TTS (strip markdown asterisks/headers)
  const cleanSpoken = dialogue.reply
    .replace(/#+\s*/g, '')
    .replace(/[*_`]/g, '')
    .replace(/\[\d+\]/g, '')
    .slice(0, 250);

  return {
    intent: 'conversation',
    action: 'replied',
    reply: dialogue.reply,
    usedModel: dialogue.usedModel,
    suggestedFollowUps: dialogue.suggestedFollowUps,
    spokenText: cleanSpoken
  };
}

