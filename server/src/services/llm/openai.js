import { BaseLLMProvider } from './provider.interface.js';

export class OpenAIProvider extends BaseLLMProvider {
  constructor({
    apiKey = process.env.OPENAI_API_KEY,
    baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    flashModel = process.env.OPENAI_FLASH_MODEL || 'gpt-4o-mini',
    proModel = process.env.OPENAI_PRO_MODEL || 'gpt-4o'
  } = {}) {
    super('openai');
    this.apiKey = apiKey;
    this.baseURL = baseURL.replace(/\/+$/, '');
    this.flashModel = flashModel;
    this.proModel = proModel;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  getModelName(modelType = 'flash') {
    return modelType === 'pro' ? this.proModel : this.flashModel;
  }

  formatMessages({ messages, systemInstruction }) {
    const formatted = [];
    if (systemInstruction) {
      formatted.push({ role: 'system', content: systemInstruction });
    }
    for (const msg of messages) {
      formatted.push({
        role: msg.role === 'tool' ? 'tool' : msg.role,
        content: msg.content,
        tool_call_id: msg.toolCallId,
        ...(msg.toolCalls ? {
          tool_calls: msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.args || {}) }
          }))
        } : {})
      });
    }
    return formatted;
  }

  async generate({ messages, systemInstruction, modelType = 'flash', tools = [], temperature = 0.7 }) {
    if (!this.isConfigured()) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const model = this.getModelName(modelType);
    const body = {
      model,
      messages: this.formatMessages({ messages, systemInstruction }),
      temperature
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));
    }

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI API Error (${res.status}): ${err}`);
    }

    const data = await res.json();
    const message = data.choices?.[0]?.message;

    const toolCalls = (message?.tool_calls || []).map(tc => {
      let args = {};
      try { args = JSON.parse(tc.function.arguments); } catch {}
      return { id: tc.id, name: tc.function.name, args };
    });

    return {
      content: message?.content || '',
      toolCalls,
      model,
      usage: data.usage
    };
  }

  async stream({ messages, systemInstruction, modelType = 'flash', tools = [], onDelta, temperature = 0.7 }) {
    if (!this.isConfigured()) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const model = this.getModelName(modelType);
    const body = {
      model,
      messages: this.formatMessages({ messages, systemInstruction }),
      temperature,
      stream: true
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map(t => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }
      }));
    }

    const res = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45000)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI Stream Error (${res.status}): ${err}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullContent = '';
    const toolCallsMap = new Map();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const json = line.slice(6).trim();
        if (json === '[DONE]') continue;

        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            fullContent += delta.content;
            if (onDelta) onDelta(delta.content);
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallsMap.has(idx)) {
                toolCallsMap.set(idx, { id: tc.id || `call_${idx}`, name: tc.function?.name || '', argStr: '' });
              }
              const item = toolCallsMap.get(idx);
              if (tc.function?.name) item.name = tc.function.name;
              if (tc.function?.arguments) item.argStr += tc.function.arguments;
            }
          }
        } catch {}
      }
    }

    const toolCalls = Array.from(toolCallsMap.values()).map(tc => {
      let args = {};
      try { args = JSON.parse(tc.argStr); } catch {}
      return { id: tc.id, name: tc.name, args };
    });

    return {
      content: fullContent,
      toolCalls,
      model
    };
  }
}

