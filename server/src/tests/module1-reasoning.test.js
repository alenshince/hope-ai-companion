import assert from 'assert';
import { calculate } from '../services/tools/calculator.js';
import { isPrivateIP, validateSafeUrl } from '../services/tools/fetcher.js';
import { executeTool } from '../services/tools/index.js';
import { getLLMProvider } from '../services/llm/index.js';
import { classifyIntent, runAgentLoop } from '../services/agent/agentLoop.js';

async function runModule1Tests() {
  console.log('==================================================');
  console.log('🧪 RUNNING MODULE 1 TESTS: REASONING & RESEARCH ENGINE');
  console.log('==================================================\n');

  // 1. Calculator Tool Tests
  console.log('[1/5] Testing Calculator Tool...');
  assert.strictEqual(calculate('2 + 3 * 4'), 14, 'Precedence failed');
  assert.strictEqual(calculate('(2 + 3) * 4'), 20, 'Parentheses failed');
  assert.strictEqual(calculate('2 ^ 3'), 8, 'Power operator failed');
  assert.strictEqual(calculate('sqrt(64) + abs(-5)'), 13, 'Math functions failed');
  assert.strictEqual(calculate('pi * 2'), Number((Math.PI * 2).toFixed(8)), 'Constant failed');

  let divByZeroThrew = false;
  try {
    calculate('10 / 0');
  } catch (err) {
    divByZeroThrew = true;
    assert.match(err.message, /Division by zero/i);
  }
  assert.strictEqual(divByZeroThrew, true, 'Division by zero did not throw');

  let dangerousCodeThrew = false;
  try {
    calculate('process.exit(1)');
  } catch (err) {
    dangerousCodeThrew = true;
  }
  assert.strictEqual(dangerousCodeThrew, true, 'Malicious expression was not rejected');
  console.log('  ✓ Calculator passed all precision, precedence, and security tests.');

  // 2. SSRF Protection Tests
  console.log('\n[2/5] Testing SSRF Protection & URL Validation...');
  assert.strictEqual(isPrivateIP('127.0.0.1'), true, 'Should block loopback');
  assert.strictEqual(isPrivateIP('10.0.0.5'), true, 'Should block 10.x.x.x');
  assert.strictEqual(isPrivateIP('192.168.1.1'), true, 'Should block 192.168.x.x');
  assert.strictEqual(isPrivateIP('172.20.0.1'), true, 'Should block 172.16-31.x.x');
  assert.strictEqual(isPrivateIP('169.254.169.254'), true, 'Should block cloud metadata IP');
  assert.strictEqual(isPrivateIP('8.8.8.8'), false, 'Should allow public IP');

  let localhostThrew = false;
  try {
    await validateSafeUrl('http://localhost:5001/admin');
  } catch (err) {
    localhostThrew = true;
    assert.match(err.message, /prohibited/i);
  }
  assert.strictEqual(localhostThrew, true, 'localhost was not blocked');
  console.log('  ✓ SSRF validator successfully rejects private, loopback, and metadata IPs.');

  // 3. Tool Dispatcher Tests
  console.log('\n[3/5] Testing Tool Dispatcher...');
  const calcOutput = await executeTool('calculator', { expression: '150 * 4' });
  assert.strictEqual(calcOutput.result, 600);

  const searchOutput = await executeTool('web_search', { query: 'quantum computing' });
  assert.strictEqual(typeof searchOutput.count, 'number');
  assert.strictEqual(Array.isArray(searchOutput.results), true);
  console.log(`  ✓ Tool dispatcher executed calculator and web_search (${searchOutput.results.length} results).`);

  // 4. Intent Classification & Model Routing
  console.log('\n[4/5] Testing Intent Classification & Fast/Pro Routing...');
  const greeting = classifyIntent('hello Hope');
  assert.strictEqual(greeting.isComplex, false, 'Greeting should be direct');
  assert.strictEqual(greeting.modelType, 'flash', 'Greeting should use fast flash model');

  const mathIntent = classifyIntent('compute 25 * 40');
  assert.strictEqual(mathIntent.needsMath, true);

  const researchIntent = classifyIntent('what is the latest research on fault-tolerant quantum error correction in 2026?');
  assert.strictEqual(researchIntent.isComplex, true, 'Research inquiry should be complex');
  assert.strictEqual(researchIntent.modelType, 'pro', 'Research inquiry should use pro model');
  assert.strictEqual(researchIntent.needsResearch, true);
  console.log('  ✓ Intent classifier routes simple to flash and research/reasoning to pro.');

  // 5. Agent Reasoning Loop & Tool Integration
  console.log('\n[5/5] Testing Agent Reasoning Loop...');
  const statuses = [];
  const deltas = [];

  const provider = getLLMProvider('offline'); // Test deterministic agent loop
  const agentResult = await runAgentLoop({
    query: 'Calculate 45 * 8',
    provider,
    onStatus: (st) => statuses.push(st),
    onDelta: (d) => deltas.push(d)
  });

  assert.strictEqual(typeof agentResult.reply, 'string');
  assert.strictEqual(agentResult.reply.length > 0, true);
  assert.strictEqual(agentResult.reply.includes('360'), true, 'Agent should compute and include 360');
  console.log(`  ✓ Agent completed reasoning loop. Statuses emitted: ${statuses.length}, Deltas: ${deltas.length}.`);
  console.log(`  ✓ Reply: "${agentResult.reply.trim()}"`);

  console.log('\n==================================================');
  console.log('🎉 ALL MODULE 1 TESTS PASSED SUCCESSFULLY!');
  console.log('==================================================\n');
}

runModule1Tests().catch(err => {
  console.error('\n❌ MODULE 1 TEST FAILED:', err);
  process.exit(1);
});

