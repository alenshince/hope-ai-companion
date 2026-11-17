/**
 * LLM Provider Base Interface
 * Defines standard contract for all model providers (Gemini, OpenAI, Anthropic, Offline)
 */
export class BaseLLMProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Generates a complete text response or tool calls.
   * @param {Object} options
   * @param {Array<{role: 'user'|'assistant'|'system'|'tool', content: string, toolCallId?: string}>} options.messages
   * @param {string} [options.systemInstruction]
   * @param {'flash'|'pro'} [options.modelType='flash']
   * @param {Array} [options.tools]
   * @param {number} [options.temperature]
   * @returns {Promise<{content: string, toolCalls: Array, model: string}>}
   */
  async generate(options) {
    throw new Error('generate() must be implemented by subclass');
  }

  /**
   * Streams token chunks and tool call events.
   * @param {Object} options
   * @param {Function} options.onDelta - callback(textChunk)
   * @returns {Promise<{content: string, toolCalls: Array, model: string}>}
   */
  async stream(options) {
    throw new Error('stream() must be implemented by subclass');
  }
}

