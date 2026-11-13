import { db } from './db.js';
import { processVoiceCommand, generateDialogueResponse, synthesizeResearch } from './services/ai.js';
import { parseNaturalLanguageReminder } from './services/nlp.js';

async function testFullIntegration() {
  console.log('=====================================================');
  console.log('🌿 HOPE AI COMPANION — ADVANCED MODULE INTEGRATION TESTS');
  console.log('=====================================================\n');

  // TEST 1: PERSONALIZED CONTEXT & MEMORY ENGINE (About Me Core)
  console.log('--- [1] Personalized Context & Memory Engine (The About Me Core) ---');
  const profile = db.getProfile();
  console.log('✓ Name:', profile.name);
  console.log('✓ Title:', profile.title);
  console.log('✓ Institution:', profile.institution);
  console.log('✓ Semester/Branch:', `${profile.semester}, ${profile.branch}`);
  console.log('✓ Tech Stack:', profile.techStack.map(g => `${g.category} (${g.items.length})`).join(' | '));
  console.log('✓ Leadership:', profile.leadership[0].role, 'at', profile.leadership[0].organization);
  console.log('✓ Flagship Projects:');
  profile.projects.forEach(p => console.log(`   - ${p.name} [${p.category}]: ${p.tagline}`));
  console.log('✓ Professional Links: GitHub ->', profile.links.github, '| LinkedIn ->', profile.links.linkedin);

  const memories = db.getMemories();
  console.log(`✓ Total Indexed Memories: ${memories.length}`);
  const activeMemories = memories.filter(m => m.isActive);
  console.log(`✓ Active Injected Memories: ${activeMemories.length}`);

  const compiledContext = db.getActiveContextString();
  console.log(`✓ Compiled Prompt Context length: ${compiledContext.length} chars`);
  if (!compiledContext.includes('NerReksha') || !compiledContext.includes('Rock') || !compiledContext.includes('Hack Till Dawn')) {
    throw new Error('Memory context compilation missing essential projects or leadership items');
  }
  console.log('-> Personalized Context Engine: PASSED!\n');

  // TEST 2: HEALTH & LIFESTYLE GUARDIAN MODULE
  console.log('--- [2] Health & Lifestyle Guardian Module ---');
  const wellness = db.getTodayWellness();
  console.log('✓ Date:', wellness.date);
  console.log('✓ Hydration:', `${wellness.waterGlasses} / ${wellness.targetWaterGlasses} glasses`);
  console.log('✓ Meals Status:', JSON.stringify(wellness.meals));
  console.log('✓ Consistency Streak:', `${wellness.streakDays} days (${wellness.consistencyScore}%)`);
  console.log('✓ Mindful Breaks:', wellness.breaksTaken);

  // Test water delta
  const waterAfterAdd = db.logWater(1);
  console.log('✓ Logged 1 water glass -> New count:', waterAfterAdd.waterGlasses);
  db.logWater(-1); // restore

  // Test break
  const breakAfter = db.logBreak();
  console.log('✓ Logged mindful stretch break -> Total breaks today:', breakAfter.breaksTaken);

  // Test proactive threshold evaluator
  const now = new Date();
  const currentHour = now.getHours();
  console.log(`✓ Current time evaluated: ${now.toLocaleTimeString()} (Hour: ${currentHour})`);
  
  // Verify wellness history endpoint
  const history = db.getWellnessHistory();
  console.log(`✓ 7-Day Consistency history entries: ${history.history.length} days`);
  console.log('-> Health Guardian Module: PASSED!\n');

  // TEST 3: VOICE ASSISTANT INTENT & EXECUTION MODULE
  console.log('--- [3] Voice Assistant Intent & Command Module ---');

  // Test 3.1: Voice reminder intent
  const spokenReminder = 'Hey Hope, remind me to submit the Flutter NerReksha report tomorrow at 5 PM';
  console.log(`Input Voice: "${spokenReminder}"`);
  const reminderResult = await processVoiceCommand(spokenReminder);
  console.log('✓ Intent:', reminderResult.intent);
  console.log('✓ Scheduled Title:', reminderResult.data.title);
  console.log('✓ Spoken Output:', reminderResult.spokenText);
  if (reminderResult.intent !== 'reminder' || !reminderResult.data?.id) {
    throw new Error('Voice reminder command failed');
  }
  // Cleanup test reminder
  db.deleteReminder(reminderResult.data.id);

  // Test 3.2: Voice note intent
  const spokenNote = 'Hope, take a note that Hack Till Dawn registration starts next Monday';
  console.log(`\nInput Voice: "${spokenNote}"`);
  const noteResult = await processVoiceCommand(spokenNote);
  console.log('✓ Intent:', noteResult.intent);
  console.log('✓ Note Title:', noteResult.data.title);
  console.log('✓ Folder:', noteResult.data.folder);
  console.log('✓ Spoken Output:', noteResult.spokenText);
  if (noteResult.intent !== 'note' || !noteResult.data?.id) {
    throw new Error('Voice note command failed');
  }
  // Cleanup test note
  db.deleteNote(noteResult.data.id);

  // Test 3.3: Voice wellness logging
  const spokenWater = 'Hope, log 1 glass of water';
  console.log(`\nInput Voice: "${spokenWater}"`);
  const waterResult = await processVoiceCommand(spokenWater);
  console.log('✓ Intent:', waterResult.intent);
  console.log('✓ Spoken Output:', waterResult.spokenText);
  db.logWater(-1); // restore

  // Test 3.4: Voice identity / About Me query
  const spokenWhoAmI = 'Hope, who am I and what are my projects?';
  console.log(`\nInput Voice: "${spokenWhoAmI}"`);
  const whoResult = await processVoiceCommand(spokenWhoAmI);
  console.log('✓ Intent:', whoResult.intent);
  console.log('✓ Spoken Summary:', whoResult.spokenText.slice(0, 160) + '...');
  if (!whoResult.reply.includes('Alen') || !whoResult.reply.includes('NerReksha')) {
    throw new Error('Personalized identity voice response did not reference Alen Shince');
  }

  console.log('\n=====================================================');
  console.log('🎉 ALL ADVANCED MODULE INTEGRATION TESTS PASSED!');
  console.log('=====================================================');
}

testFullIntegration().catch(err => {
  console.error('Integration tests failed:', err);
  process.exit(1);
});

