/**
 * Base Abstract TTS Provider Interface
 */
export class BaseTTSProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Synthesize text to an audio buffer (MP3)
   * @param {string} text
   * @param {object} options
   * @param {string} [options.voice]
   * @param {string} [options.language]
   * @param {number} [options.speed]
   * @returns {Promise<Buffer>}
   */
  async synthesize(text, options = {}) {
    throw new Error('Method synthesize() not implemented');
  }

  /**
   * Returns whether this provider is currently available/configured
   */
  async isAvailable() {
    return true;
  }
}

