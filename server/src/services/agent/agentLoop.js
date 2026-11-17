import { getLLMProvider } from '../llm/index.js';
import { TOOL_DEFINITIONS, executeTool } from '../tools/index.js';
import { evaluateRedFlagTriage } from '../health/triage.js';

const MAX_TOOL_CALLS = 5;

/**
 * Classifies whether a user query requires fast direct flash answering
 * or deeper multi-step pro reasoning / web verification.
 */
export function classifyIntent(query) {
  const q = query.trim().toLowerCase();

  // Fast direct matches: greetings, simple acknowledgments, emotional check-in
  const isDirectGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|namaskaram|enthokke|sukhamaano|how\s*are\s*you)[.!?]*$/i.test(q);
  if (isDirectGreeting) {
    return { isComplex: false, modelType: 'flash', needsResearch: false, isHealth: false, reason: 'conversational_greeting' };
  }

  // Math calculation detection
  const isMath = /calculate|compute|\bsum\b|\bmultiply\b|\bsqrt\b|\bpercentage\b|[-+*/^]{2,}|\d+\s*[-+*/^]\s*\d+/.test(q);
  if (isMath) {
    return { isComplex: true, modelType: 'flash', needsResearch: false, needsMath: true, isHealth: false, reason: 'calculation' };
  }

  // Health / medical inquiry detection
  const healthSignals = [
    'symptom', 'fever', 'headache', 'medicine', 'tablet', 'cough', 'cold', 'infection',
    'blood pressure', 'sugar', 'diabetes', 'allergy', 'stomach', 'vomiting', 'pain',
    'doctor', 'treatment', 'dose', 'diet', 'vitamin', 'exercise', 'health', 'sleep'
  ];
  const isHealth = healthSignals.some(s => q.includes(s));

  // Research / current facts / citations needed
  const researchSignals = [
    'who is', 'what is the latest', 'recent', 'news', 'update', 'price of', 'weather',
    'compare', 'difference between', 'research', 'explain how', 'why did', 'event', '2025', '2026',
    'statistics', 'study', 'scientific', 'paper', 'guideline'
  ];

  const hasResearchSignal = researchSignals.some(s => q.includes(s)) || isHealth;
  const isUrlInquiry = /https?:\/\/[^\s]+/.test(q);
  const isComplex = hasResearchSignal || isUrlInquiry || q.length > 120 || q.includes('why') || q.includes('how to');

  return {
    isComplex,
    modelType: isComplex ? 'pro' : 'flash',
    needsResearch: hasResearchSignal || isUrlInquiry,
    isHealth,
    reason: isHealth ? 'health_guidance' : (isComplex ? 'deep_reasoning_or_research' : 'direct_chat')
  };
}

/**
 * Runs the Agent Reasoning Loop with tool calling, verification, and streaming.
 */
export async function runAgentLoop({
  query,
  conversationHistory = [],
  systemInstruction = '',
  onStatus = () => {},
  onDelta = () => {},
  provider = getLLMProvider()
}) {
  // 1. Red-Flag Emergency & Crisis Triage Check (Halts normal flow immediately for safety)
  const triage = evaluateRedFlagTriage(query);
  if (triage.isRedFlag) {
    onStatus('');
    onDelta(triage.response);
    return {
      reply: triage.response,
      sources: [],
      usedModel: 'triage_safety_engine',
      toolCallCount: 0,
      intent: { isComplex: false, modelType: 'flash', needsResearch: false, isRedFlag: true, triageType: triage.type }
    };
  }

  const intent = classifyIntent(query);
  const accumulatedSources = [];
  let toolCallCount = 0;
  let usedModel = provider.getModelName ? provider.getModelName(intent.modelType) : provider.name;

  // Initial status notification
  if (intent.isComplex) {
    onStatus(intent.isHealth ? 'Reviewing trusted clinical guidelines...' : 'Analyzing question and determining necessary references...');
  }

  // Build working message history
  const messages = [
    ...conversationHistory.map(h => ({
      role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content || h.text || ''
    })),
    { role: 'user', content: query }
  ];

  // Tool calling loop (max 5 turns)
  while (toolCallCount < MAX_TOOL_CALLS) {
    let stepResult;
    try {
      stepResult = await provider.generate({
        messages,
        systemInstruction,
        modelType: intent.modelType,
        tools: TOOL_DEFINITIONS,
        temperature: 0.5
      });
    } catch (err) {
      console.warn('Agent LLM call error, retrying with flash fallback:', err.message);
      stepResult = await provider.generate({
        messages,
        systemInstruction,
        modelType: 'flash',
        tools: TOOL_DEFINITIONS,
        temperature: 0.5
      });
    }

    if (stepResult.model) usedModel = stepResult.model;

    // Check if the model requested tool calls
    if (stepResult.toolCalls && stepResult.toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: stepResult.content || '',
        toolCalls: stepResult.toolCalls
      });

      for (const tc of stepResult.toolCalls) {
        toolCallCount++;

        if (tc.name === 'web_search') {
          onStatus(`Searching trusted sources for: "${tc.args?.query || query}"...`);
        } else if (tc.name === 'url_fetch') {
          onStatus(`Inspecting document at: ${tc.args?.url}...`);
        } else if (tc.name === 'calculator') {
          onStatus(`Evaluating expression: ${tc.args?.expression}...`);
        }

        let toolOutput;
        try {
          toolOutput = await executeTool(tc.name, tc.args);

          if (tc.name === 'web_search' && toolOutput.results) {
            for (const r of toolOutput.results) {
              if (!accumulatedSources.some(s => s.url === r.url)) {
                accumulatedSources.push(r);
              }
            }
          }
        } catch (err) {
          toolOutput = { error: err.message };
        }

        messages.push({
          role: 'tool',
          name: tc.name,
          toolCallId: tc.id,
          content: JSON.stringify(toolOutput)
        });

        if (toolCallCount >= MAX_TOOL_CALLS) break;
      }

      onStatus('Cross-checking evidence and synthesizing answer...');
      continue;
    }

    break;
  }

  // Clear thinking banner
  onStatus('');

  // Prepare system instruction reinforcing source citations and medical disclaimers
  let finalSystemInstruction = systemInstruction;
  if (accumulatedSources.length > 0) {
    const verifiedSourceList = accumulatedSources.map((s, idx) => `[${idx + 1}] "${s.title}" (${s.domain}) -> ${s.url}\nExcerpt: ${s.snippet}`).join('\n\n');
    finalSystemInstruction += `\n\n### Cross-Checked Research Sources:\n${verifiedSourceList}\n\nIMPORTANT GUIDELINES:
1. Ground your answer in the provided verified sources (e.g. WHO, ICMR, MoHFW, NHS, PubMed).
2. Cross-check claims across at least 2 sources where possible.
3. Cite sources with Markdown links in-text: [Source Title](URL).
4. If facts cannot be verified or sources conflict, say "I am not sure" rather than guessing. Never invent URLs or facts.`;
  }

  if (intent.isHealth) {
    finalSystemInstruction += `\n\n### STRICT HEALTH RULES:
- You are Hope, an AI companion, NOT a medical doctor.
- Provide general evidence-based educational information only.
- Never diagnose conditions, never prescribe medications, and never advise changing medication dosages.
- Always conclude with this brief disclaimer: "*Hope provides general wellness information and is not a medical doctor. Consult a healthcare provider for medical concerns.*"`;
  }

  let finalStreamResult;
  try {
    finalStreamResult = await provider.stream({
      messages,
      systemInstruction: finalSystemInstruction,
      modelType: intent.modelType,
      tools: [],
      onDelta,
      temperature: 0.6
    });
  } catch (err) {
    console.warn('Streaming error, falling back to direct generate:', err.message);
    finalStreamResult = await provider.generate({
      messages,
      systemInstruction: finalSystemInstruction,
      modelType: 'flash',
      tools: []
    });
    if (finalStreamResult.content) {
      onDelta(finalStreamResult.content);
    }
  }

  return {
    reply: finalStreamResult.content,
    sources: accumulatedSources,
    usedModel,
    toolCallCount,
    intent
  };
}
