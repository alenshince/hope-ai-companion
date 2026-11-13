import * as chrono from 'chrono-node';

/**
 * Parses natural language input for reminders and task creation.
 * Example inputs:
 *  - "Remind me to review research on quantum computing tomorrow at 5 PM"
 *  - "Call Sarah in 2 hours #urgent"
 *  - "Buy groceries on Sunday at 11am"
 */
export function parseNaturalLanguageReminder(input, referenceDate = new Date()) {
  if (!input || typeof input !== 'string') {
    throw new Error('Input text is required');
  }

  const raw = input.trim();
  let cleanText = raw;

  // 1. Detect and strip priority markers
  let priority = 'normal';
  if (/\b(urgent|asap|critical|emergency)\b/i.test(cleanText)) {
    priority = 'urgent';
    cleanText = cleanText.replace(/\b(urgent|asap|critical|emergency)\b/gi, '').trim();
  } else if (/\b(important|high\s*priority|vital)\b/i.test(cleanText)) {
    priority = 'high';
    cleanText = cleanText.replace(/\b(important|high\s*priority|vital)\b/gi, '').trim();
  } else if (/\b(low\s*priority|someday|optional|when\s*free)\b/i.test(cleanText)) {
    priority = 'low';
    cleanText = cleanText.replace(/\b(low\s*priority|someday|optional|when\s*free)\b/gi, '').trim();
  }

  // 2. Parse Date & Time using chrono
  const parsedResults = chrono.parse(cleanText, referenceDate, { forwardDate: true });
  let dueAt = null;
  let timePhrase = '';

  if (parsedResults.length > 0) {
    const firstResult = parsedResults[0];
    dueAt = firstResult.start.date().toISOString();
    timePhrase = firstResult.text;

    // Remove the time phrase from the text to isolate the actual task
    // e.g., "tomorrow at 5 PM" removed from "review research on quantum computing tomorrow at 5 PM"
    cleanText = cleanText.replace(timePhrase, ' ').trim();
  } else {
    // Default to 1 hour from reference if no time specified
    const defaultTime = new Date(referenceDate.getTime() + 60 * 60 * 1000);
    dueAt = defaultTime.toISOString();
  }

  // 3. Clean up common conversational prefixes
  cleanText = cleanText
    .replace(/^(remind\s+me\s+to|remind\s+me\s+that|please\s+remind\s+me\s+to|reminder\s*:?|set\s+a\s+reminder\s+to|set\s+a\s+reminder\s+for|don't\s+forget\s+to|remember\s+to|task\s*:?)\s+/i, '')
    .replace(/^(at|on|by|for)\s+/i, '')
    .replace(/\s+(at|on|by|for)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // If text became empty or punctuation only, fallback to a sensible title
  if (!cleanText || /^[\s.,!?;:-]+$/.test(cleanText)) {
    cleanText = raw;
  }

  // Capitalize first letter
  cleanText = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);

  // 4. Infer Category
  let category = 'General';
  const lower = cleanText.toLowerCase();
  if (/\b(research|paper|study|quantum|ai|model|read|article|thesis|science)\b/i.test(lower)) {
    category = 'Research';
  } else if (/\b(call|email|message|meet|meeting|sync|interview|zoom|slack)\b/i.test(lower)) {
    category = 'Communication';
  } else if (/\b(water|workout|gym|stretch|walk|meditate|sleep|doctor|pill|health|medicine)\b/i.test(lower)) {
    category = 'Wellness';
  } else if (/\b(code|deploy|fix|bug|review|git|pr|commit|server|database|test|refactor)\b/i.test(lower)) {
    category = 'Projects';
  } else if (/\b(buy|groceries|shopping|order|cook|clean|laundry|errand|bills|rent)\b/i.test(lower)) {
    category = 'Personal';
  }

  return {
    title: cleanText,
    dueAt,
    priority,
    category,
    originalInput: raw,
    extractedTimePhrase: timePhrase || '1 hour from now'
  };
}

