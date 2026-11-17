import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { OfflineProvider } from './offline.js';

let cachedProvider = null;
let currentProviderName = null;

export function getLLMProvider(requestedName) {
  const providerName = requestedName || process.env.LLM_PROVIDER || 'gemini';

  // Return cached instance if matching
  if (cachedProvider && currentProviderName === providerName) {
    return cachedProvider;
  }

  currentProviderName = providerName;

  switch (providerName.toLowerCase()) {
    case 'gemini': {
      const gemini = new GeminiProvider();
      if (gemini.isConfigured()) {
        cachedProvider = gemini;
        return gemini;
      }
      console.warn('⚠️ GEMINI_API_KEY is not configured. Falling back to Hope built-in offline engine.');
      cachedProvider = new OfflineProvider();
      return cachedProvider;
    }
    case 'openai': {
      const openai = new OpenAIProvider();
      if (openai.isConfigured()) {
        cachedProvider = openai;
        return openai;
      }
      console.warn('⚠️ OPENAI_API_KEY is not configured. Falling back to Hope built-in offline engine.');
      cachedProvider = new OfflineProvider();
      return cachedProvider;
    }
    case 'offline':
    default: {
      cachedProvider = new OfflineProvider();
      return cachedProvider;
    }
  }
}

export function resetLLMProvider() {
  cachedProvider = null;
  currentProviderName = null;
}

