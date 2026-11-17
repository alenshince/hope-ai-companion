import { EdgeTTS } from 'node-edge-tts';
import { BaseTTSProvider } from './provider.interface.js';

export const FEMALE_VOICES = {
  malayalam: 'ml-IN-SobhanaNeural',
  english: 'en-IN-NeerjaNeural'
};

export class EdgeTTSProvider extends BaseTTSProvider {
  constructor() {
    super('edge-tts');
  }

  /**
   * Converts speed multiplier (e.g. 0.75, 1.0, 1.25) to Edge TTS rate string (e.g. "-25%", "+0%", "+25%")
   */
  formatRate(speed = 1.0) {
    const percent = Math.round((speed - 1.0) * 100);
    return percent >= 0 ? `+${percent}%` : `${percent}%`;
  }

  /**
   * Synthesize text using Edge TTS neural streaming
   * @param {string} text
   * @param {object} options
   * @param {string} [options.voice]
   * @param {string} [options.language]
   * @param {number} [options.speed=1.0]
   * @returns {Promise<Buffer>}
   */
  async synthesize(text, { voice, language = 'auto', speed = 1.0 } = {}) {
    if (!text || typeof text !== 'string') {
      throw new Error('Text to synthesize is required');
    }

    // Determine voice
    let selectedVoice = voice;
    if (!selectedVoice) {
      const isMalayalam = /[\u0D00-\u0D7F]/.test(text) || language === 'malayalam';
      selectedVoice = isMalayalam ? FEMALE_VOICES.malayalam : FEMALE_VOICES.english;
    }

    const rate = this.formatRate(speed);

    const tts = new EdgeTTS({
      voice: selectedVoice,
      rate,
      timeout: 10000
    });

    const chunks = [];
    for await (const chunk of tts.streamAudio(text)) {
      if (Buffer.isBuffer(chunk)) {
        chunks.push(chunk);
      }
    }

    if (chunks.length === 0) {
      throw new Error('TTS synthesis produced no audio data');
    }

    return Buffer.concat(chunks);
  }

  async isAvailable() {
    return true;
  }
}

