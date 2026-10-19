#!/usr/bin/env node
// backlink-pilot CLI entry point

import { Command } from 'commander';
import { loadConfig } from './config.js';
import { scout } from './scout/discover.js';
import { submit } from './submit.js';
import { runTargets, reportFromTracker, pruneTargets } from './run.js';
import { generateAwesomeIssue } from './awesome/templates.js';
import { pingIndexNow } from './indexnow.js';
import { showStatus } from './tracker.js';
import { forceUpdate } from './bb-update.js';

const program = new Command();

program
  .name('backlink-pilot')
  .description('Automated backlink submission toolkit for indie hackers')
  .version('2.1.0');

program
  .command('scout <url>')
  .description('Discover submit pages and form fields on a site')
  .option('--deep', 'Follow links to find hidden submit pages')
  .option('--screenshot <path>', 'Save screenshot of submit page')
  .option('--engine <engine>', 'Browser engine: bb or playwright')
  .action(async (url, opts) => {
    const config = await loadConfig();
    if (opts.engine) config._engine = opts.engine;
    await scout(url, { ...opts, config });
  });

program
  .command('submit <site>')
  .description('Submit to a directory site (name or URL for generic)')
  .option('--dry-run', 'Show what would be submitted without actually doing it')
  .option('--screenshot <path>', 'Save screenshot after submission')
  .option('--engine <engine>', 'Browser engine: bb or playwright')
  .action(async (site, opts) => {
    const config = await loadConfig();
    if (opts.engine) config._engine = opts.engine;
    await submit(site, { ...opts, config });
  });

program
  .command('run')
  .description('Submit to every runnable site in targets.yaml, in order, without stopping on failures')
  .option('--category <name>', 'Only this targets.yaml category (e.g. overseas_ai_directories)')
  .option('--lang <lang>', 'Only sites with this lang (en | zh | multi)')
  .option('--limit <n>', 'Stop after N sites')
  .option('--interval <ms>', 'Pause between sites in ms (default: pacing.min_interval_ms from config)')
  .option('--retry', 'Include sites already marked submitted in submissions.yaml')
  .option('--retry-failed', 'Also retry sites that failed before (default: skip them)')
  .option('--skip-failed', 'Skip previously failed sites (default; kept for compatibility)')
  .option('--include-manual', 'Also try sites marked auto: manual')
  .option('--dry-run', 'List the sites that would be processed and exit')
  .option('--verbose', 'With --dry-run, also list skipped sites and why')
  .option('--targets-file <path>', 'Alternative targets file', 'targets.yaml')
  .option('--engine <engine>', 'Browser engine: bb or playwright')
  .action(async (opts) => {
    const config = await loadConfig();
    if (opts.engine) config._engine = opts.engine;
    const { results } = await runTargets({
      ...opts,
      config,
      retryFailed: opts.retryFailed,
    });
    const failed = results.filter(r => r.status === 'failed').length;
    process.exitCode = results.length && failed === results.length ? 1 : 0;
  });

program
  .command('prune')
  .description('Mark targets that failed permanently (404 / paid / login) in targets.yaml so they are never tried again')
  .option('--delete', 'Remove the entries from targets.yaml instead of marking them')
  .option('--sheet-only', 'Only touch the newly imported sheet_* categories')
  .option('--no-heuristics', 'Do not drop unused entries whose URL/notes look login/paid')
  .option('--include-no-form', 'Also prune sites where no form fields were detected')
  .option('--dry-run', 'Show what would change without writing')
  .option('--targets-file <path>', 'Alternative targets file', 'targets.yaml')
  .action(async (opts) => {
    await pruneTargets(opts);
  });

program
  .command('report')
  .description('Rebuild a success/failure report from submissions.yaml (e.g. after an interrupted run)')
  .option('--since <date>', 'Only include submissions at/after this ISO date, e.g. 2026-10-03 or 2026-10-03T13:00')
  .option('--out <path>', 'Report file path (default: reports/report-<timestamp>.md)')
  .option('--all-products', 'Include submissions made for other products (default: current config.yaml product only)')
  .action(async (opts) => {
    const config = await loadConfig();
    await reportFromTracker({ ...opts, product: opts.allProducts ? null : config.product.url });
  });

program
  .command('awesome <repo>')
  .description('Generate GitHub Issue body for an awesome-list submission')
  .option('--open', 'Open the issue creation page in browser')
  .action(async (repo, opts) => {
    const config = await loadConfig();
    await generateAwesomeIssue(repo, { ...opts, config });
  });

program
  .command('indexnow <url>')
  .description('Ping Bing/Yandex about a new or updated page')
  .option('--key <key>', 'IndexNow API key')
  .action(async (url, opts) => {
    const config = await loadConfig();
    await pingIndexNow(url, { ...opts, config });
  });

program
  .command('status')
  .description('Show submission tracking status')
  .option('--json', 'Output as JSON')
  .action(async (opts) => {
    await showStatus(opts);
  });

program
  .command('bb-update')
  .description('Update bb-browser community site adapters')
  .action(() => {
    forceUpdate();
  });

program.parse();
