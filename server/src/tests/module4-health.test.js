import assert from 'node:assert/strict';
import { evaluateRedFlagTriage, EMERGENCY_NUMBERS } from '../services/health/triage.js';
import { encryptHealthData, decryptHealthData } from '../services/health/crypto.js';
import { db } from '../db.js';

console.log('==================================================');
console.log('🧪 RUNNING MODULE 4 TESTS: HEALTH & WELLBEING GUARDIAN');
console.log('==================================================\n');

// 1. Red-Flag Emergency Triage Tests
console.log('[1/4] Testing Red-Flag Emergency & Crisis Triage Engine...');

// Test 1a: Cardiac emergency
const chestPainTest = evaluateRedFlagTriage('I have severe crushing chest pain radiating to my left arm', 'IN');
assert.strictEqual(chestPainTest.isRedFlag, true, 'Cardiac chest pain must trigger red-flag triage');
assert.strictEqual(chestPainTest.type, 'cardiac');
assert.ok(chestPainTest.response.includes('108') || chestPainTest.response.includes('112'), 'Must advise calling 108/112');
assert.ok(chestPainTest.response.includes('not a doctor'), 'Must emphasize Hope is not a doctor');
console.log('  ✓ Cardiac emergency correctly intercepted with 108/112 triage.');

// Test 1b: Stroke warning signs
const strokeTest = evaluateRedFlagTriage('My mother has sudden face drooping and slurred speech', 'IN');
assert.strictEqual(strokeTest.isRedFlag, true, 'FAST stroke symptoms must trigger red-flag triage');
assert.strictEqual(strokeTest.type, 'stroke');
console.log('  ✓ Stroke FAST warning signs correctly intercepted.');

// Test 1c: Mental health & self-harm crisis (English)
const suicideTestEn = evaluateRedFlagTriage('I feel completely hopeless and want to end my life', 'IN');
assert.strictEqual(suicideTestEn.isRedFlag, true, 'Self-harm statements must trigger immediate crisis support');
assert.strictEqual(suicideTestEn.type, 'mental_health_crisis');
assert.ok(suicideTestEn.response.includes('14416'), 'Must provide Tele-MANAS hotline 14416');
assert.ok(suicideTestEn.response.includes('not alone'), 'Must provide empathetic compassionate support');
console.log('  ✓ English mental health crisis intercepted with Tele-MANAS (14416).');

// Test 1d: Mental health crisis (Malayalam Script)
const suicideTestMl = evaluateRedFlagTriage('എനിക്ക് ജീവനൊടുക്കാൻ തോന്നുന്നു, ആരും കൂടെയില്ല', 'IN');
assert.strictEqual(suicideTestMl.isRedFlag, true, 'Malayalam self-harm statements must trigger crisis support');
assert.strictEqual(suicideTestMl.type, 'mental_health_crisis');
assert.ok(suicideTestMl.response.includes('14416'), 'Must provide Tele-MANAS hotline in Malayalam response');
assert.ok(suicideTestMl.response.includes('ഒറ്റയ്ക്കല്ല'), 'Must provide reassuring Malayalam compassionate response');
console.log('  ✓ Malayalam mental health crisis intercepted with Tele-MANAS (14416).');

// Test 1e: Non-emergency query
const normalQuery = evaluateRedFlagTriage('Can you suggest some good breathing exercises for focus?', 'IN');
assert.strictEqual(normalQuery.isRedFlag, false, 'Non-emergency health query should not trigger triage');
console.log('  ✓ Normal wellness inquiry allowed through without false positive.');

// 2. Sensitive Health Encryption at Rest (AES-256-GCM)
console.log('\n[2/4] Testing Health Data Encryption at Rest (AES-256-GCM)...');
const privateNote = { note: 'Had high stress today during SIH event coordination. Blood pressure slightly elevated.' };
const encrypted = encryptHealthData(privateNote);

assert.ok(encrypted, 'Encryption should return a base64 string');
assert.ok(!encrypted.includes('SIH event'), 'Ciphertext must never contain plain text');
assert.ok(!encrypted.includes('Blood pressure'), 'Ciphertext must be completely opaque');

const decrypted = decryptHealthData(encrypted);
assert.deepStrictEqual(decrypted, privateNote, 'Decrypted payload should perfectly match original object');

// Tamper test
const tampered = encrypted.slice(0, -6) + 'AAAAAA';
const tamperedResult = decryptHealthData(tampered);
assert.strictEqual(tamperedResult, null, 'Tampered ciphertext with bad auth tag must be rejected');
console.log('  ✓ AES-256-GCM encryption and authenticated decryption verified.');

// 3. Medicine Scheduling & Tracking
console.log('\n[3/4] Testing Medicine Scheduling & Management...');
const med = db.addMedicine({
  name: 'Vitamin D3',
  dosage: '60,000 IU once weekly',
  time: '10:00'
});
assert.ok(med.id, 'Created medicine must have an ID');
assert.strictEqual(med.name, 'Vitamin D3');
assert.strictEqual(med.takenToday, false);

const toggled = db.toggleMedicine(med.id);
assert.strictEqual(toggled.takenToday, true, 'Should toggle takenToday to true');

const untoggled = db.toggleMedicine(med.id);
assert.strictEqual(untoggled.takenToday, false, 'Should toggle takenToday back to false');

db.deleteMedicine(med.id);
const allMeds = db.getMedicines();
assert.ok(!allMeds.some(m => m.id === med.id), 'Medicine should be deleted from schedule');
console.log('  ✓ Medicine creation, daily toggle, and deletion verified.');

// 4. DPDP Act & GDPR Data Rights (Export and Erasure)
console.log('\n[4/4] Testing Data Portability & Right to Erasure...');
db.addMoodJournalEntry({ rating: 'calm', note: 'Feeling grateful for today progress.' });
const exportedData = db.exportAllHealthData();

assert.ok(exportedData.standard.includes('India DPDP Act'), 'Export must declare DPDP Act standard');
assert.ok(Array.isArray(exportedData.moodJournal), 'Must export mood journal');
assert.ok(exportedData.wellnessSummary, 'Must export wellness summary');
console.log('  ✓ DPDP/GDPR Data Portability export verified.');

// Clean test record
console.log('\n==================================================');
console.log('🎉 ALL MODULE 4 TESTS PASSED SUCCESSFULLY!');
console.log('==================================================');

