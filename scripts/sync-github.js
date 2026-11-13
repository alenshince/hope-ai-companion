import { execSync } from 'child_process';

const commitMsg = process.argv.slice(2).join(' ') || `Update Hope AI Companion (${new Date().toLocaleString()})`;

function run(cmd) {
  try {
    return execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    process.exit(1);
  }
}

console.log('🌿 Syncing Hope AI Companion to GitHub...');
console.log('-----------------------------------------');

// Check status
try {
  const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
  if (status) {
    console.log('1. Staging changes...');
    run('git add .');

    console.log(`2. Committing with message: "${commitMsg}"...`);
    run(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  } else {
    console.log('No local unstaged file changes detected.');
  }

  console.log('3. Pushing commits to GitHub (origin main)...');
  run('git push -u origin main');

  console.log('\n✨ GitHub repository is up to date!');
} catch (err) {
  console.error('\n❌ Sync failed:', err.message);
}

