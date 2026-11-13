import { searchWeb } from './services/search.js';
import { synthesizeResearch, cleanUpNoteText, summarizeNote, extractTags, processVoiceCommand } from './services/ai.js';
import { parseNaturalLanguageReminder } from './services/nlp.js';
import { db } from './db.js';

async function runTests() {
  console.log('--- Starting Hope Backend Core Loop Tests ---');

  // 1. Test NLP Reminder Parsing
  console.log('\n[1] Testing Natural Language Reminder Parsing:');
  const nlpTestString = "Remind me to review research on quantum computing tomorrow at 5 PM";
  const parsed = parseNaturalLanguageReminder(nlpTestString);
  console.log('Input:', nlpTestString);
  console.log('Parsed Title:', parsed.title);
  console.log('Parsed Due At:', parsed.dueAt);
  console.log('Parsed Priority:', parsed.priority);
  console.log('Parsed Category:', parsed.category);
  if (!parsed.title || !parsed.dueAt || parsed.category !== 'Research') {
    throw new Error('NLP Parsing test failed expectation');
  }
  console.log('✓ NLP Reminder Parsing passed!');

  // 2. Test Search Service
  console.log('\n[2] Testing Web Search Service:');
  const searchResults = await searchWeb('quantum computing error correction');
  console.log(`Found ${searchResults.length} search results:`);
  searchResults.forEach((r, i) => {
    console.log(`  [${i + 1}] ${r.title} (${r.domain}) -> ${r.url}`);
  });
  if (searchResults.length === 0) {
    throw new Error('Search failed to return results');
  }
  console.log('✓ Web search passed!');

  // 3. Test AI Research Synthesis
  console.log('\n[3] Testing Research Synthesis:');
  const synthesis = await synthesizeResearch({
    query: 'quantum computing error correction',
    searchResults
  });
  console.log('Synthesis model:', synthesis.usedModel);
  console.log('Synthesis snippet:', synthesis.reply.slice(0, 150) + '...');
  console.log('Suggested follow-ups:', synthesis.suggestedFollowUps);
  if (!synthesis.reply || synthesis.sources.length === 0) {
    throw new Error('Synthesis failed expectation');
  }
  console.log('✓ Research Synthesis passed!');

  // 4. Test "One-Click to Notes" Flow
  console.log('\n[4] Testing "One-Click to Notes" Flow:');
  const createdNote = db.createNote({
    title: 'Research: Quantum Computing Error Correction',
    content: synthesis.reply,
    folder: 'Research',
    tags: ['research', 'quantum', 'qec'],
    summary: 'Synthesized findings on quantum error correction architectures and logical qubits.',
    sources: synthesis.sources
  });
  console.log('Created Note ID:', createdNote.id);
  console.log('Created Note Title:', createdNote.title);
  console.log('Created Note Folder:', createdNote.folder);
  console.log('Created Note Sources count:', createdNote.sources.length);
  const fetchedNote = db.getNote(createdNote.id);
  if (!fetchedNote || fetchedNote.title !== createdNote.title) {
    throw new Error('Note storage verification failed');
  }
  console.log('✓ One-Click to Notes flow passed!');

  // 5. Test AI Clean Up & Summarization
  console.log('\n[5] Testing AI Note Clean Up & Auto-Summarization:');
  const messyThought = `
  need to think about quantum computers
  todo: check surface codes
  todo: read ibm paper
  neutral atoms are getting better with tweezers
  `;
  const cleaned = await cleanUpNoteText(messyThought);
  const summary = await summarizeNote(cleaned);
  const tags = await extractTags(cleaned);
  console.log('Cleaned snippet:\n', cleaned.slice(0, 180));
  console.log('Summary:', summary);
  console.log('Extracted tags:', tags);
  console.log('✓ AI Note Clean Up & Summarization passed!');

  // 6. Test Personalized Context & Memory Engine (The "About Me" Core)
  console.log('\n[6] Testing Personalized Context & Memory Engine:');
  const profile = db.getProfile();
  console.log('User Name:', profile.name);
  console.log('Title:', profile.title);
  console.log('Institution:', profile.institution);
  console.log('Tech Stack Categories:', profile.techStack?.length);
  console.log('Projects count:', profile.projects?.length);
  const contextStr = db.getActiveContextString();
  console.log('Compiled Context length:', contextStr.length);
  if (!profile.name.includes('Alen') || !contextStr.includes('NerReksha') || !contextStr.includes('Rock')) {
    throw new Error('Profile and memory context verification failed');
  }
  console.log('✓ Personalized Profile & Context Engine passed!');

  // 7. Test Health & Lifestyle Guardian Module
  console.log('\n[7] Testing Health & Lifestyle Guardian:');
  const initialWellness = db.getTodayWellness();
  console.log('Initial Water Glasses:', initialWellness.waterGlasses);
  const updatedWater = db.logWater(1);
  console.log('Updated Water Glasses:', updatedWater.waterGlasses);
  if (updatedWater.waterGlasses !== initialWellness.waterGlasses + 1) {
    throw new Error('Water logging failed');
  }
  // Revert water back
  db.logWater(-1);

  // 8. Test Voice Assistant Intent Engine
  console.log('\n[8] Testing Voice Assistant Command Processing:');
  const voiceReminderRes = await processVoiceCommand('Hey Hope, remind me to review the Flutter UI assignment tomorrow at 4 PM');
  console.log('Voice Reminder Intent:', voiceReminderRes.intent);
  console.log('Voice Spoken Output:', voiceReminderRes.spokenText);
  if (voiceReminderRes.intent !== 'reminder' || !voiceReminderRes.data?.title) {
    throw new Error('Voice reminder command failed');
  }
  // Clean up created reminder
  db.deleteReminder(voiceReminderRes.data.id);

  const voiceIdentityRes = await processVoiceCommand('Hope, who am I and what projects have I built?');
  console.log('Voice Identity Intent:', voiceIdentityRes.intent);
  console.log('Voice Identity Reply snippet:', voiceIdentityRes.reply.slice(0, 160) + '...');
  if (!voiceIdentityRes.reply.includes('Alen') || !voiceIdentityRes.reply.includes('NerReksha')) {
    throw new Error('Voice identity response failed to recall context');
  }
  console.log('✓ Voice Assistant Command Engine passed!');

  // Clean up test note
  db.deleteNote(createdNote.id);

  console.log('\n🎉 ALL BACKEND CORE LOOPS VALIDATED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

