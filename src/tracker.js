// tracker.js — Submission status tracking (YAML file)

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parse, stringify } from 'yaml';

const TRACKER_FILE = 'submissions.yaml';

export function loadTracker() {
  if (!existsSync(TRACKER_FILE)) {
    return { submissions: [] };
  }
  return parse(readFileSync(TRACKER_FILE, 'utf-8')) || { submissions: [] };
}

export function saveTracker(data) {
  writeFileSync(TRACKER_FILE, stringify(data), 'utf-8');
}

export function recordSubmission(site, status, details = {}) {
  const tracker = loadTracker();
  tracker.submissions.push({
    site,
    status,
    timestamp: new Date().toISOString(),
    ...details,
  });
  saveTracker(tracker);
}

export async function showStatus(opts = {}) {
  const tracker = loadTracker();

  if (opts.json) {
    console.log(JSON.stringify(tracker, null, 2));
    return;
  }

  if (!tracker.submissions?.length) {
    console.log('No submissions recorded yet.');
    return;
  }

  console.log('\n📊 Submission Status\n');

  const byStatus = {};
  for (const s of tracker.submissions) {
    const key = s.status || 'unknown';
    byStatus[key] = (byStatus[key] || 0) + 1;
  }

  for (const [status, count] of Object.entries(byStatus)) {
    const icon = status === 'submitted' ? '✅' : status === 'failed' ? '❌' : '⏳';
    console.log(`  ${icon} ${status}: ${count}`);
  }

  console.log(`\n  Total: ${tracker.submissions.length} submissions\n`);

  // Show recent 10
  console.log('Recent:');
  for (const s of tracker.submissions.slice(-10)) {
    const date = new Date(s.timestamp).toLocaleDateString();
    const icon = s.status === 'submitted' ? '✅' : s.status === 'failed' ? '❌' : '⏳';
    console.log(`  ${icon} ${s.site} — ${s.status} (${date})`);
  }
}
