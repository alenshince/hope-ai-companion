import { BaseLLMProvider } from './provider.interface.js';

export class GeminiProvider extends BaseLLMProvider {
  constructor({
    apiKey = process.env.GEMINI_API_KEY,
    flashModel = process.env.GEMINI_FLASH_MODEL || 'gemini-2.0-flash',
    proModel = process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro'
  } = {}) {
    super('gemini');
    this.apiKey = apiKey;
    this.flashModel = flashModel;
    this.proModel = proModel;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  getModelName(modelType = 'flash') {
    return modelType === 'pro' ? this.proModel : this.flashModel;
  }

  formatPayload({ messages, systemInstruction, tools = [], temperature = 0.7 }) {
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'tool') {
        contents.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: msg.name || 'tool_response',
              response: { content: msg.content }
            }
          }]
        });
      } else {
        const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
        const parts = [];

        if (msg.toolCalls && msg.toolCalls.length > 0) {
          for (const tc of msg.toolCalls) {
            parts.push({
              functionCall: {
                name: tc.name,
                args: tc.args || {}
              }
            });
          }
        }

        if (msg.content) {
          parts.push({ text: msg.content });
        }

        if (parts.length > 0) {
          contents.push({ role, parts });
        }
      }
    }

    const payload = {
      contents,
      generationConfig: {
        temperature: temperature ?? 0.7
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    if (tools && tools.length > 0) {
      payload.tools = [{
        functionDeclarations: tools.map(t => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters
        }))
      }];
    }

    return payload;
  }

  async fetchWithRetry(url, options, maxRetries = 2) {
    let delay = 1000;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(url, options);
        if (res.ok) return res;

        // Retry on 429 (rate limit) or 503 (service unavailable)
        if ((res.status === 429 || res.status === 503 || res.status === 500) && attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delay));
          delay *= 2;
          continue;
        }

        const errText = await res.text();
        throw new Error(`Gemini API Error (${res.status}): ${errText}`);
      } catch (err) {
        if (attempt >= maxRetries) throw err;
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      }
    }
  }

  async generate({ messages, systemInstruction, modelType = 'flash', tools = [], temperature = 0.7 }) {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const model = this.getModelName(modelType);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    const payload = this.formatPayload({ messages, systemInstruction, tools, temperature });

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000)
    });

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    let content = '';
    const toolCalls = [];

    for (const part of parts) {
      if (part.text) content += part.text;
      if (part.functionCall) {
        toolCalls.push({
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: part.functionCall.name,
          args: part.functionCall.args || {}
        });
      }
    }

    return {
      content,
      toolCalls,
      model,
      usage: data.usageMetadata
    };
  }

  async stream({ messages, systemInstruction, modelType = 'flash', tools = [], onDelta, temperature = 0.7 }) {
    if (!this.isConfigured()) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    const model = this.getModelName(modelType);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const payload = this.formatPayload({ messages, systemInstruction, tools, temperature });

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(45000)
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let fullContent = '';
    const toolCalls = [];
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const parts = parsed.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.text) {
              fullContent += part.text;
              if (onDelta) onDelta(part.text);
            }
            if (part.functionCall) {
              toolCalls.push({
                id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                name: part.functionCall.name,
                args: part.functionCall.args || {}
              });
            }
          }
        } catch {
          // ignore partial JSON parse error
        }
      }
    }

    return {
      content: fullContent,
      toolCalls,
      model
    };
  }
}

