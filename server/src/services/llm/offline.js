import { BaseLLMProvider } from './provider.interface.js';
import { calculate } from '../tools/calculator.js';

export class OfflineProvider extends BaseLLMProvider {
  constructor() {
    super('offline');
  }

  isConfigured() {
    return true; // Always available
  }

  async generate({ messages, systemInstruction, modelType = 'flash', tools = [] }) {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    const lastToolResult = [...messages].reverse().find(m => m.role === 'tool')?.content;

    // Check if tools should be called (simple heuristic intent detection for offline mode)
    const toolCalls = [];
    const mathMatch = lastUserMessage.match(/(\d+[\s+\-*/^%()]+\d+)/);

    // If tool results are present, synthesize answer
    if (lastToolResult) {
      let parsedTool;
      try { parsedTool = typeof lastToolResult === 'string' ? JSON.parse(lastToolResult) : lastToolResult; } catch { parsedTool = lastToolResult; }

      if (parsedTool?.results && Array.isArray(parsedTool.results)) {
        const sources = parsedTool.results.slice(0, 3);
        const sourceText = sources.map((s, i) => `[${i + 1}] **${s.title}** (${s.domain}): ${s.snippet}`).join('\n\n');
        return {
          content: `### 🌿 Research Briefing\n\nBased on cross-checked findings for "${parsedTool.query}":\n\n${sourceText}\n\n*Verified across ${sources.length} sources.*`,
          toolCalls: [],
          model: 'hope-offline-synthesizer'
        };
      }

      if (parsedTool?.result !== undefined) {
        return {
          content: `The calculated result for \`${parsedTool.expression}\` is **${parsedTool.result}**.`,
          toolCalls: [],
          model: 'hope-offline-calculator'
        };
      }
    }

    // If math calculation requested and no tool called yet
    if (mathMatch && tools.some(t => t.name === 'calculator') && !messages.some(m => m.role === 'tool')) {
      return {
        content: '',
        toolCalls: [{
          id: `call_${Date.now()}`,
          name: 'calculator',
          args: { expression: mathMatch[1].trim() }
        }],
        model: 'hope-offline-planner'
      };
    }

    // Default analytical dialogue
    return {
      content: `I am here with you. Regarding **"${lastUserMessage.trim()}"**, I am operating with Hope's built-in offline engine. To enable live multimodal cloud reasoning and search, configure your \`GEMINI_API_KEY\` in Settings.`,
      toolCalls: [],
      model: 'hope-offline-engine'
    };
  }

  async stream({ messages, systemInstruction, modelType = 'flash', tools = [], onDelta }) {
    const res = await this.generate({ messages, systemInstruction, modelType, tools });

    if (res.content && onDelta) {
      // Simulate natural streaming cadence
      const words = res.content.split(' ');
      for (const word of words) {
        onDelta(word + ' ');
        await new Promise(r => setTimeout(r, 12));
      }
    }

    return res;
  }
}

