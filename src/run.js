// run.js — Batch submission over targets.yaml
// Walks every runnable target in order, never stops on a failure,
// and prints/writes a report listing the successful ones.

import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { parse, parseDocument, isSeq, isMap } from 'yaml';
import { submit } from './submit.js';
import { loadTracker } from './tracker.js';

const TARGETS_FILE = 'targets.yaml';
const REPORT_DIR = 'reports';

function isYes(v) {
  return v === true || String(v).toLowerCase() === 'yes';
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

/**
 * Flatten targets.yaml into an ordered list of { name, submit_url, category, ... }
 */
export function loadTargets(file = TARGETS_FILE) {
  if (!existsSync(file)) throw new Error(`${file} not found`);
  const doc = parse(readFileSync(file, 'utf-8')) || {};
  const out = [];
  for (const [category, sites] of Object.entries(doc)) {
    if (!Array.isArray(sites)) continue;
    for (const s of sites) {
      if (s?.submit_url) out.push({ ...s, category });
    }
  }
  return out;
}

/**
 * Pick the targets a batch run should touch.
 *
 * opts.category    only this category (e.g. overseas_ai_directories)
 * opts.lang        only this lang (en | zh | multi)
 * opts.includeManual  also include auto: manual sites (they will mostly fail)
 * opts.retry       re-submit sites already marked submitted in submissions.yaml
 * opts.skipFailed  also skip sites that failed before (run only never-attempted ones)
 * opts.limit       stop after N targets
 * opts.productUrl  skip the user's own site if it is listed as a target
 */
export function selectTargets(targets, opts = {}) {
  const ownHost = opts.productUrl ? hostOf(opts.productUrl) : '';
  const all = loadTracker().submissions || [];
  // "Already submitted" is per product — a site used for another product is
  // still open for this one.
  const done = new Set(
    all.filter(s => s.status === 'submitted')
       .filter(s => !s.product || !opts.productUrl || hostOf(s.product) === ownHost)
       .map(s => s.site)
  );
  // "Failed before" is per site, any product — 404 / paid / login / no form
  // are properties of the site and will fail again for any product.
  const succeededEver = new Set(all.filter(s => s.status === 'submitted').map(s => s.site));
  const failedBefore = new Set(
    all.filter(s => s.status === 'failed' && !succeededEver.has(s.site))
       .filter(s => classifyFailure(s.error, { includeNoForm: true }))
       .map(s => s.site)
  );

  const skipped = [];
  let picked = targets.filter(t => {
    const skip = (reason) => { skipped.push({ ...t, reason }); return false; };

    if (opts.category && t.category !== opts.category) return false;
    if (opts.lang && t.lang !== opts.lang) return false;
    if (t.status) return skip(`status: ${t.status}`); // dead | paid | login | no-form ...
    if (t.type && t.type !== 'form') return skip(`type: ${t.type}`);
    if (!isYes(t.auto) && !(opts.includeManual && t.auto === 'manual')) return skip(`auto: ${t.auto}`);
    if (ownHost && hostOf(t.submit_url) === ownHost) return skip('own product site');
    if (!opts.retry && done.has(t.submit_url)) return skip('already submitted');
    // Default: skip sites that already failed (404 / paid / login / no form).
    // Pass retryFailed to try them again.
    if (!opts.retryFailed && failedBefore.has(t.submit_url)) return skip('failed before');
    return true;
  });

  if (opts.limit > 0) picked = picked.slice(0, opts.limit);
  return { picked, skipped };
}

function fmtDuration(ms) {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ${s % 60}s` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Does this error mean the browser itself is gone (not a site problem)?
 */
function isBrowserDown(err = '') {
  return /Chrome is not running|cannot connect to Chrome|not responding|No tab open/i.test(err);
}

function buildReport({ results, skipped, startedAt, finishedAt, aborted, total, title }) {
  const ok = results.filter(r => r.status === 'submitted');
  const failed = results.filter(r => r.status === 'failed');
  const lines = [];
  lines.push(`# ${title || `Backlink run — ${startedAt.toISOString()}`}`);
  lines.push('');
  lines.push(`- Started: ${startedAt.toISOString()}`);
  lines.push(`- ${aborted === 'in progress' ? 'Updated' : 'Finished'}: ${finishedAt.toISOString()} (${fmtDuration(finishedAt - startedAt)})`);
  lines.push(`- Processed: ${results.length}${total ? ` / ${total}` : ''}  ✅ ${ok.length}  ❌ ${failed.length}  ⏭ skipped ${skipped.length}`);
  if (aborted === 'in progress') lines.push(`- **Status:** in progress (or process was killed before finishing)`);
  else if (aborted) lines.push(`- **Aborted early:** ${aborted}`);
  lines.push('');
  lines.push(`## ✅ Successful (${ok.length})`);
  lines.push('');
  if (!ok.length) lines.push('_none_');
  for (const r of ok) {
    lines.push(`- ${r.name} — ${r.site}${r.confirmation ? ` — ${r.confirmation}` : ''}`);
  }
  lines.push('');
  lines.push(`## ❌ Failed (${failed.length})`);
  lines.push('');
  if (!failed.length) lines.push('_none_');
  for (const r of failed) {
    lines.push(`- ${r.name} — ${r.site} — ${r.error}`);
  }
  if (skipped.length) {
    lines.push('');
    lines.push(`## ⏭ Skipped (${skipped.length})`);
    lines.push('');
    for (const s of skipped) lines.push(`- ${s.name} — ${s.reason}`);
  }
  lines.push('');
  return lines.join('\n');
}

function printSummary(results, skipped) {
  const ok = results.filter(r => r.status === 'submitted');
  const failed = results.filter(r => r.status === 'failed');

  console.log('\n' + '='.repeat(60));
  console.log(`📊 Run summary: ${results.length} processed — ✅ ${ok.length} succeeded, ❌ ${failed.length} failed, ⏭ ${skipped.length} skipped`);
  console.log('='.repeat(60));

  console.log(`\n✅ Successful (${ok.length}):`);
  if (!ok.length) console.log('   (none)');
  for (const r of ok) console.log(`   • ${r.name} — ${r.site}`);

  if (failed.length) {
    console.log(`\n❌ Failed (${failed.length}):`);
    for (const r of failed) console.log(`   • ${r.name} — ${r.error}`);
  }
}

/**
 * Classify a recorded failure into a permanent site status, or null if the
 * failure might be transient / fixable (e.g. our own field detection).
 */
export function classifyFailure(error = '', { includeNoForm = false } = {}) {
  if (/timed out|Chrome may be unresponsive|not responding|No tab open/i.test(error)) return null;
  if (/404|submit page gone|page not found|Privacy error|403 Forbidden|522:|ExpiredDomains/i.test(error)) return 'dead';
  if (/HTTP 5\d\d|500 Server Error|site may be down|site appears down/i.test(error)) return 'dead';
  if (/payment page|no longer be free/i.test(error)) return 'paid';
  if (/redirected to login|requires an account/i.test(error)) return 'login';
  if (includeNoForm && /No recognizable form fields/i.test(error)) return 'no-form';
  return null;
}

const LOGIN_HOSTS = new Set([
  'f6s.com', 'stackshare.io', 'peerlist.io', 'betalist.com',
]);

/**
 * Classify a target as login/paid from its URL or notes, without a prior run.
 * Used to drop sheet entries that were never free/open after all.
 */
export function classifyTargetHeuristic(t) {
  const url = t.submit_url || '';
  const notes = t.notes || '';
  const host = hostOf(url);
  if (LOGIN_HOSTS.has(host)) return 'login';
  if (/\/(login|signin|sign-in|signup|sign-up|register|account|me\/|user\/)|select-plan/i.test(url)) return 'login';
  if (/\/(pricing|prices|select-listing)/i.test(url)) return 'paid';
  if (/\b(paid|pricing|buy now|\$\d+)\b/i.test(notes) && !/\bfree\b/i.test(notes)) return 'paid';
  if (/\b(log ?in|account required|requires (an )?account|sign ?in|sign ?up)\b/i.test(notes)) return 'login';
  return null;
}

/**
 * Mark (or delete) targets in targets.yaml that failed for a permanent
 * reason according to submissions.yaml. Comments/layout are preserved.
 *
 * opts.delete         remove the entries instead of setting status
 * opts.includeNoForm  also treat "No recognizable form fields" as permanent
 * opts.sheetOnly      only touch sheet_* categories (the newly imported list)
 * opts.heuristics     also drop unused entries whose URL/notes look login/paid
 * opts.dryRun         only print what would change
 */
export async function pruneTargets(opts = {}) {
  const file = opts.targetsFile || TARGETS_FILE;
  const all = loadTracker().submissions || [];
  const useHeuristics = opts.heuristics !== false;

  // Latest outcome per site; a site that ever succeeded is never pruned
  const succeeded = new Set(all.filter(s => s.status === 'submitted').map(s => s.site));
  const verdict = new Map();
  for (const s of all) {
    if (s.status !== 'failed' || succeeded.has(s.site)) continue;
    const status = classifyFailure(s.error, { includeNoForm: opts.includeNoForm });
    if (status) verdict.set(s.site, { status, error: (s.error || '').split('.')[0].slice(0, 80) });
  }

  const doc = parseDocument(readFileSync(file, 'utf-8'));
  const today = new Date().toISOString().slice(0, 10);
  const changes = [];

  for (const pair of doc.contents.items) {
    const category = String(pair.key);
    if (opts.sheetOnly && !category.startsWith('sheet_')) continue;
    const seq = pair.value;
    if (!isSeq(seq)) continue;
    for (let i = seq.items.length - 1; i >= 0; i--) {
      const node = seq.items[i];
      if (!isMap(node)) continue;
      const url = node.get('submit_url');
      if (succeeded.has(url)) continue;
      let v = verdict.get(url);
      if (!v && useHeuristics && !node.get('status')) {
        const guessed = classifyTargetHeuristic({
          submit_url: url,
          notes: node.get('notes') || '',
        });
        if (guessed === 'login' || guessed === 'paid') {
          v = { status: guessed, error: `URL/notes look like a ${guessed} page` };
        }
      }
      if (!v) continue;
      if (node.get('status') && !opts.delete) continue; // already marked
      const name = node.get('name');
      changes.push({ name, url, status: v.status, action: opts.delete ? 'deleted' : 'marked' });
      if (opts.dryRun) continue;
      if (opts.delete) {
        seq.items.splice(i, 1);
      } else {
        node.set('auto', 'no');
        node.set('status', v.status);
        node.set('notes', `${v.error} (as of ${today})`);
      }
    }
  }

  const by = {};
  for (const c of changes) by[c.status] = (by[c.status] || 0) + 1;
  console.log(`\n🧹 prune: ${changes.length} target(s) ${opts.dryRun ? 'would be ' : ''}${opts.delete ? 'deleted' : 'marked'}` +
    (changes.length ? ` — ${Object.entries(by).map(([k, n]) => `${k}: ${n}`).join(', ')}` : ''));
  for (const c of changes) console.log(`   ${c.status.padEnd(7)} ${c.name} — ${c.url}`);

  if (!opts.dryRun && changes.length) {
    const backup = `${file}.bak`;
    copyFileSync(file, backup);
    writeFileSync(file, doc.toString({ lineWidth: 0 }), 'utf-8');
    console.log(`\n✅ ${file} updated (backup: ${backup})`);
  }
  return changes;
}

/**
 * Rebuild a report from submissions.yaml — the source of truth, written after
 * every single submission — using the latest status per site.
 *
 * opts.since   ISO date/time; only consider entries at/after it
 * opts.product product URL to report on (default: all products)
 * opts.out     report path (default reports/report-<now>.md)
 */
export async function reportFromTracker(opts = {}) {
  const tracker = loadTracker();
  let entries = (tracker.submissions || []).filter(s => s.site?.startsWith('http') || s.name);
  if (opts.product) {
    const h = hostOf(opts.product);
    entries = entries.filter(s => !s.product || hostOf(s.product) === h);
  }
  if (opts.since) {
    const since = new Date(opts.since);
    if (isNaN(since)) throw new Error(`Invalid --since value: ${opts.since}`);
    entries = entries.filter(s => new Date(s.timestamp) >= since);
  }
  if (!entries.length) {
    console.log('No submissions found' + (opts.since ? ` since ${opts.since}` : '') + '.');
    return null;
  }

  // Latest entry per site wins (a later success supersedes an earlier failure)
  const latest = new Map();
  for (const s of entries) latest.set(s.site, s);
  const names = new Map(loadTargets(opts.targetsFile).map(t => [t.submit_url, t.name]));
  const results = [...latest.values()].map(s => ({
    ...s,
    name: s.name || names.get(s.site) || hostOf(s.site) || s.site,
  }));

  const startedAt = new Date(entries[0].timestamp);
  const finishedAt = new Date(entries[entries.length - 1].timestamp);
  printSummary(results, []);

  mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const reportPath = opts.out || `${REPORT_DIR}/report-${stamp}.md`;
  writeFileSync(reportPath, buildReport({
    results, skipped: [], startedAt, finishedAt,
    title: `Backlink submissions${opts.product ? ` for ${hostOf(opts.product)}` : ''}${opts.since ? ` since ${opts.since}` : ''} (from submissions.yaml)`,
  }), 'utf-8');
  console.log(`\n📝 Report written to ${reportPath}`);
  return { results, reportPath };
}

/**
 * Run submissions for every selected target, sequentially and in file order.
 * A failure on one site never stops the run; only a dead browser does.
 */
export async function runTargets(opts) {
  const { config } = opts;
  const targets = loadTargets(opts.targetsFile);
  const { picked, skipped } = selectTargets(targets, {
    category: opts.category,
    lang: opts.lang,
    includeManual: opts.includeManual,
    retry: opts.retry,
    retryFailed: opts.retryFailed,
    limit: Number(opts.limit) || 0,
    productUrl: config.product?.url,
  });

  const interval = opts.interval != null
    ? Number(opts.interval)
    : (config.pacing?.min_interval_ms ?? 60000);

  console.log(`\n🎯 ${picked.length} target(s) selected (${skipped.length} skipped)`);
  console.log(`   pacing: ${fmtDuration(interval)} between sites, est. ≥ ${fmtDuration(interval * Math.max(picked.length - 1, 0))} total`);

  if (opts.dryRun) {
    console.log('\n[DRY RUN] Would submit to, in order:');
    picked.forEach((t, i) => console.log(`  ${String(i + 1).padStart(3)}. ${t.name} — ${t.submit_url}`));
    if (opts.verbose && skipped.length) {
      console.log('\nSkipped:');
      for (const s of skipped) console.log(`   - ${s.name} — ${s.reason}`);
    }
    return { results: [], skipped };
  }

  if (!picked.length) {
    console.log('Nothing to do. Use --retry to re-submit already-submitted sites.');
    return { results: [], skipped };
  }

  const results = [];
  const startedAt = new Date();
  let aborted = null;
  let interrupted = false;

  // Report path is fixed up front and rewritten after every site, so a
  // killed process (closed terminal, sleep, crash) still leaves a report.
  mkdirSync(REPORT_DIR, { recursive: true });
  const stamp = startedAt.toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const reportPath = `${REPORT_DIR}/run-${stamp}.md`;
  const writeReport = (note) => {
    const body = buildReport({ results, skipped, startedAt, finishedAt: new Date(), aborted: note ?? aborted, total: picked.length });
    writeFileSync(reportPath, body, 'utf-8');
  };
  writeReport('in progress');

  const onSigint = () => {
    if (interrupted) process.exit(130);
    interrupted = true;
    console.log('\n⏹  Interrupted — finishing current site, then writing report (Ctrl+C again to force quit)');
  };
  process.on('SIGINT', onSigint);

  try {
    for (let i = 0; i < picked.length; i++) {
      if (interrupted) { aborted = 'interrupted by user'; break; }
      const t = picked[i];
      console.log(`\n[${i + 1}/${picked.length}] ${t.name} (${t.category})`);

      let r;
      try {
        r = await submit(t.submit_url, {
          config: { ...config },      // fresh copy: adapters mutate _engine/_targetUrl
          name: t.name,
          label: t.name,
          noExit: true,
        });
      } catch (e) {
        // submit() should not throw, but a bug must not kill the whole run
        r = { site: t.submit_url, status: 'failed', error: e.message };
        console.error(`❌ Unexpected error: ${e.message}`);
      }
      results.push({ ...r, name: t.name, category: t.category });
      writeReport('in progress');

      if (r.status === 'failed' && isBrowserDown(r.error)) {
        aborted = `browser unavailable: ${r.error.split('\n')[0]}`;
        console.error(`\n🛑 ${aborted} — stopping run. Start Chrome with: bb-browser open about:blank`);
        break;
      }

      if (i < picked.length - 1 && interval > 0 && !interrupted) {
        console.log(`  ⏳ waiting ${fmtDuration(interval)} before next site...`);
        await sleep(interval);
      }
    }
  } finally {
    process.off('SIGINT', onSigint);
  }

  printSummary(results, skipped);
  writeReport();
  console.log(`\n📝 Report written to ${reportPath}`);
  if (aborted) console.log(`⚠️  Run ended early: ${aborted}`);

  return { results, skipped, reportPath };
}
