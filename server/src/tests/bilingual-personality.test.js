import assert from 'node:assert/strict';
import { detectLanguage, hasMalayalamScript, countManglishTokens } from '../services/language/detector.js';
import { buildBilingualCompanionPrompt } from '../services/personality/prompts.js';

console.log('🧪 Starting Module 2 Bilingual & Personality Tests (20 Conversation Scenarios)...');

const TEST_CASES = [
  // 1. Malayalam Script - Casual Greeting
  {
    id: 1,
    input: 'നമസ്കാരം ചേച്ചീ, എന്തൊക്കെയുണ്ട് വിശേഷങ്ങൾ?',
    expectedType: 'malayalam',
    description: 'Malayalam script greeting'
  },
  // 2. Malayalam Script - Daily Life / Food
  {
    id: 2,
    input: 'ഞാൻ ഭക്ഷണം കഴിച്ചു, ചേച്ചി കഴിച്ചോ?',
    expectedType: 'malayalam',
    description: 'Malayalam script meal check'
  },
  // 3. Malayalam Script - Exam Stress
  {
    id: 3,
    input: 'എനിക്ക് എക്സാം ആലോചിച്ച് ഭയങ്കര ടെൻഷൻ ആകുന്നു, എന്തു ചെയ്യണം?',
    expectedType: 'malayalam',
    description: 'Malayalam script exam stress'
  },
  // 4. Malayalam Script + English tech terms
  {
    id: 4,
    input: 'ഫ്ലട്ടറിൽ ഒരു പുതിയ ആപ്പ് ഉണ്ടാക്കാൻ എനിക്ക് കുറച്ചു ഐഡിയ പറഞ്ഞു തരാമോ?',
    expectedType: 'malayalam',
    description: 'Malayalam script with technical terms'
  },
  // 5. Malayalam Script - Health symptom
  {
    id: 5,
    input: 'തലവേദന വന്നിട്ട് കുറച്ചു സമയമായി, എന്തെങ്കിലും പരിഹാരമുണ്ടോ?',
    expectedType: 'malayalam',
    description: 'Malayalam script headache query'
  },
  // 6. Manglish - Casual Greeting
  {
    id: 6,
    input: 'enthokke undu vishesham? sukhamano?',
    expectedType: 'manglish',
    description: 'Manglish informal greeting'
  },
  // 7. Manglish - Daily Routine
  {
    id: 7,
    input: 'innu nalla thirakk aayirunnu, ippozha free aayath',
    expectedType: 'manglish',
    description: 'Manglish busy day update'
  },
  // 8. Manglish - Meal check
  {
    id: 8,
    input: 'chaaya kudicho? njan innu lunch kazhikan late aayi',
    expectedType: 'manglish',
    description: 'Manglish lunch and tea check'
  },
  // 9. Manglish - Tired / Demotivated
  {
    id: 9,
    input: 'enikku padikan oru mood illa, valare tired aanu',
    expectedType: 'manglish',
    description: 'Manglish tiredness and low mood'
  },
  // 10. Manglish - Reassurance & Gratitude
  {
    id: 10,
    input: 'thank you chechi, saramilla tto, njan nokkam',
    expectedType: 'manglish',
    description: 'Manglish gratitude to sister persona'
  },
  // 11. English - Friendly Greeting
  {
    id: 11,
    input: "Hey Hope! How's your day going?",
    expectedType: 'english',
    description: 'Clean English greeting'
  },
  // 12. English - Tech / Portfolio inquiry
  {
    id: 12,
    input: 'Can you suggest some good open source projects in Flutter and Python for my portfolio?',
    expectedType: 'english',
    description: 'English career and portfolio question'
  },
  // 13. English - Late night coding
  {
    id: 13,
    input: "It's 2 AM and I'm still debugging this Java backend error.",
    expectedType: 'english',
    description: 'English late-night work statement'
  },
  // 14. English - Critical Red Flag Emergency
  {
    id: 14,
    input: 'I have severe sudden crushing chest pain radiating to my left arm.',
    expectedType: 'english',
    description: 'English emergency symptom'
  },
  // 15. English - Celebrating Milestone
  {
    id: 15,
    input: 'I managed to complete my Hackathon presentation today! We won second place.',
    expectedType: 'english',
    description: 'English achievement sharing'
  },
  // 16. Mixed - Manglish + English code switching
  {
    id: 16,
    input: 'Ente project deadline naale aanu, but still some UI bugs baaki undu.',
    expectedType: 'mixed',
    description: 'Mixed Manglish and English work stress'
  },
  // 17. Mixed - Malayalam script + English sentence
  {
    id: 17,
    input: 'ഈ React state management എനിക്ക് ഒട്ടും മനസ്സിലാകുന്നില്ല, can you simplify it?',
    expectedType: 'mixed',
    description: 'Mixed Malayalam script and English request'
  },
  // 18. Mixed - Manglish + English inquiry
  {
    id: 18,
    input: 'Hey Hope, innu evening oru walk povan planning undu, weather enganeyundu?',
    expectedType: 'mixed',
    description: 'Mixed weather check and evening walk'
  },
  // 19. Mixed - Malayalam script + GitHub tech
  {
    id: 19,
    input: 'എന്റെ GitHub profile-ൽ പുതിയ പ്രോജക്ട് add ചെയ്യാൻ help ചെയ്യാമോ?',
    expectedType: 'mixed',
    description: 'Mixed Malayalam script with GitHub request'
  },
  // 20. Mixed - Emotional vulnerability
  {
    id: 20,
    input: 'Life is feeling very stressful ippol, aarum koode illatha pole thonnunnu.',
    expectedType: 'mixed',
    description: 'Mixed emotional distress and loneliness'
  }
];

let passedCases = 0;

for (const tc of TEST_CASES) {
  const result = detectLanguage(tc.input, 'auto');
  const isMatch = result.detected === tc.expectedType ||
    (tc.expectedType === 'mixed' && (result.detected === 'mixed' || result.detected === 'manglish')) ||
    (tc.expectedType === 'manglish' && (result.detected === 'manglish' || result.detected === 'mixed'));

  console.log(`[Test ${tc.id.toString().padStart(2, '0')}] ${tc.description}`);
  console.log(`  Input:    "${tc.input.length > 50 ? tc.input.slice(0, 50) + '...' : tc.input}"`);
  console.log(`  Detected: ${result.detected} (expected: ${tc.expectedType}, script: ${result.script})`);

  assert.ok(isMatch, `Test ${tc.id} failed: expected ${tc.expectedType}, got ${result.detected}`);
  passedCases++;
}

console.log(`\n✅ All 20 conversation classification tests passed! (${passedCases}/20)\n`);

// Test 21: Verify User Setting Override (Auto / Malayalam / English / Mixed)
console.log('Testing User Setting Override...');
const malayalamOverride = detectLanguage('Hello Hope, how are you?', 'malayalam');
assert.strictEqual(malayalamOverride.targetReplyLanguage, 'malayalam', 'User setting preference should override reply language to malayalam');

const englishOverride = detectLanguage('സുഖമാണോ ചേച്ചീ?', 'english');
assert.strictEqual(englishOverride.targetReplyLanguage, 'english', 'User setting preference should override reply language to english');

const mixedOverride = detectLanguage('Good morning!', 'mixed');
assert.strictEqual(mixedOverride.targetReplyLanguage, 'mixed', 'User setting preference should override reply language to mixed');
console.log('✅ User language preference override verified.');

// Test 22: Verify System Prompt Personality Guardrails & Non-Human Constraints
console.log('Testing System Prompt Generation and Guardrails...');
const promptMal = buildBilingualCompanionPrompt({
  targetLanguage: 'malayalam',
  userContext: 'Alen Shince, S5 CSE student at MBCCET',
  wellnessStatus: { waterGlasses: 4, meals: { dinner: { logged: false } }, streakDays: 3 }
});

assert.ok(promptMal.includes('REPLY LANGUAGE: MALAYALAM SCRIPT'), 'Must contain Malayalam script guidance');
assert.ok(promptMal.includes('സംസാര ഭാഷ'), 'Must encourage spoken Malayalam');
assert.ok(promptMal.includes('Clear Non-Human Identity'), 'Must explicitly preserve non-human identity');
assert.ok(promptMal.includes('Zero Guilt-Tripping'), 'Must explicitly forbid guilt-tripping');
assert.ok(promptMal.includes('Encourage Real-Life Human Bonds'), 'Must encourage real-life human relationships');
assert.ok(promptMal.includes('Health Guardrails'), 'Must prohibit medical diagnosis and prescription');
assert.ok(promptMal.includes('112') && promptMal.includes('14416'), 'Must include national emergency crisis numbers');
assert.ok(promptMal.includes('Alen Shince'), 'Must inject user context');
assert.ok(promptMal.includes('Hydration: 4 glasses'), 'Must inject wellness status');
console.log('✅ Companion Persona and Safety Guardrails verified in system prompt.');

console.log('\n🎉 ALL MODULE 2 TESTS PASSED SUCCESSFULLY!');

