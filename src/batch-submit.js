#!/usr/bin/env node

// batch-submit.js — Batch backlink submission with resume support
// v2: Natural comments, URL in website field only, site rotation, priority ordering

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createSession, delay, humanType } from './browser.js';

const TIMEOUT_MS = 30000;
const MIN_DELAY = 15000;  // 15-45s between submissions
const MAX_DELAY = 45000;

// --- Natural comment templates ---
// URL goes in the website field, NOT in the comment body
const COMMENT_TEMPLATES = [
  "Thanks for sharing this! Really useful perspective.",
  "Bookmarked this for later. Great write-up.",
  "This is exactly what I was looking for, thanks!",
  "Appreciate the detailed breakdown here.",
  "Nice article! Learned something new today.",
  "Well written and informative. Thanks for putting this together.",
  "Solid content. Will definitely come back for more.",
  "This is super helpful, thanks for the effort!",
  "Great explanation. Clear and easy to follow.",
  "Really enjoyed reading this. Keep it up!",
  "Interesting take on this topic. Thanks for sharing.",
  "Quality content right here. Appreciate it.",
  "This answered a question I've had for a while. Thanks!",
  "Good stuff! Shared this with a friend who'd find it useful.",
  "Came across this while researching — glad I did. Very informative.",
  "Simple and well explained. Exactly what the internet needs more of.",
  "Love how you broke this down step by step.",
  "This is one of the better articles I've read on this topic.",
  "Practical and to the point. Thanks!",
  "Helpful resource. Added to my reading list.",
];

// Commenter personas (rotate to look natural)
const PERSONAS = [
  { name: "Alex Chen", email: "alexc.dev@outlook.com" },
  { name: "Jamie Liu", email: "jamie.liu.writes@gmail.com" },
  { name: "Morgan Lee", email: "morganlee.tech@outlook.com" },
  { name: "Sam Rivera", email: "sam.r.creates@gmail.com" },
  { name: "Taylor Kim", email: "taylork.web@outlook.com" },
];

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Load resources — supports both flat array and { profiles, blog_comments } format
function loadResources() {
  if (!existsSync('resources/backlink-resources.json')) {
    console.error('❌ resources/backlink-resources.json not found.');
    console.error('   Copy the example file and add your target blogs:');
    console.error('   cp resources/backlink-resources.example.json resources/backlink-resources.json');
    process.exit(1);
  }
  if (!existsSync('resources/sites.json')) {
    console.error('❌ resources/sites.json not found.');
    console.error('   Create it with your product info. See resources/ for format.');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync('resources/backlink-resources.json', 'utf-8'));
  const sites = JSON.parse(readFileSync('resources/sites.json', 'utf-8'));

  let allResources;
  if (Array.isArray(raw)) {
    allResources = raw;
  } else {
    allResources = [
      ...(raw.profiles || []),
      ...(raw.blog_comments || [])
    ];
  }

  return { resources: allResources, sites: sites.sites };
}

// Priority: blog_comment with url_field > blog_comment without > profile
function prioritizeResources(resources) {
  const scored = resources.map(r => {
    let score = 0;
    if (r.type === 'blog_comment') score += 10;
    if (r.has_url_field || r.Has_URL_Field === 'Yes') score += 5;
    if (!(r.has_captcha || r.Has_Captcha === 'Yes')) score += 3;
    // Boost tech/game/education URLs
    const u = (r.url || r.URL || '').toLowerCase();
    if (u.match(/tech|code|dev|game|puzzle|maze|math|edu|learn|tool|software/)) score += 2;
    return { ...r, _score: score };
  });
  scored.sort((a, b) => b._score - a._score);
  return scored;
}

// Normalize resource keys (Excel uses Title Case, JSON uses snake_case)
function normalizeResource(r) {
  return {
    type: r.type || r.Type || 'unknown',
    url: r.url || r.URL || '',
    has_captcha: r.has_captcha === true || r['Has Captcha'] === 'Yes',
    has_url_field: r.has_url_field === true || r['Has URL Field'] === 'Yes',
    link_strategy: r.link_strategy || r['Link Strategy'] || 'unknown',
  };
}

function getLogPath() {
  const date = new Date().toISOString().split('T')[0];
  return `logs/submissions-${date}.json`;
}

function loadLog() {
  if (!existsSync('logs')) mkdirSync('logs', { recursive: true });
  const logPath = getLogPath();
  if (existsSync(logPath)) return JSON.parse(readFileSync(logPath, 'utf-8'));
  return { date: new Date().toISOString().split('T')[0], submissions: [] };
}

function saveLog(log) {
  writeFileSync(getLogPath(), JSON.stringify(log, null, 2), 'utf-8');
}

// Also check global submission history (don't re-submit to same URL ever)
function loadGlobalHistory() {
  const histPath = 'logs/global-history.json';
  if (existsSync(histPath)) return new Set(JSON.parse(readFileSync(histPath, 'utf-8')));
  return new Set();
}

function saveGlobalHistory(history) {
  writeFileSync('logs/global-history.json', JSON.stringify([...history], null, 2), 'utf-8');
}

function isSubmitted(log, globalHistory, url) {
  return globalHistory.has(url) || log.submissions.some(s => s.url === url);
}

// --- Blog comment submission (v2: natural comments, URL in website field) ---
async function submitBlogComment(page, resource, site) {
  const norm = normalizeResource(resource);
  await page.goto(norm.url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
  await delay(2000); // let lazy-loaded comment forms appear

  // Find comment textarea
  const commentSelectors = [
    'textarea[name="comment"]',
    'textarea#comment',
    'textarea[name*="comment" i]',
    'textarea[name*="message" i]',
    'textarea[id*="comment" i]',
    'textarea[placeholder*="comment" i]',
  ];

  let commentSelector = null;
  for (const sel of commentSelectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) { commentSelector = sel; break; }
    } catch (e) { continue; }
  }

  if (!commentSelector) throw new Error('No comment field found');

  // Pick a random natural comment
  const comment = pickRandom(COMMENT_TEMPLATES);
  await humanType(page, commentSelector, comment);
  await delay(300);

  // Pick a persona
  const persona = pickRandom(PERSONAS);

  // Fill name field
  const nameSelectors = [
    'input[name="author"]', 'input#author',
    'input[name*="name" i]', 'input[name*="author" i]',
    'input[placeholder*="name" i]',
  ];
  for (const sel of nameSelectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await humanType(page, sel, persona.name);
        break;
      }
    } catch (e) { continue; }
  }
  await delay(200);

  // Fill email field
  const emailSelectors = [
    'input[name="email"]', 'input#email',
    'input[type="email"]', 'input[name*="email" i]',
  ];
  for (const sel of emailSelectors) {
    try {
      const el = await page.$(sel);
      if (el && await el.isVisible()) {
        await humanType(page, sel, persona.email);
        break;
      }
    } catch (e) { continue; }
  }
  await delay(200);

  // Fill URL/website field with our site URL (this is the backlink!)
  if (norm.has_url_field) {
    const urlSelectors = [
      'input[name="url"]', 'input#url',
      'input[name*="website" i]', 'input[name*="url" i]',
      'input[type="url"]', 'input[placeholder*="website" i]',
      'input[placeholder*="url" i]',
    ];
    for (const sel of urlSelectors) {
      try {
        const el = await page.$(sel);
        if (el && await el.isVisible()) {
          await humanType(page, sel, site.url);
          break;
        }
      } catch (e) { continue; }
    }
  }
  await delay(500);

  // Submit the comment
  const submitSelectors = [
    'input#submit', 'input[name="submit"]',
    'button[type="submit"]', 'input[type="submit"]',
    'button:has-text("Post Comment")',
    'button:has-text("Submit")',
    'button:has-text("Post")',
    'button:has-text("Send")',
  ];
  let submitted = false;
  for (const sel of submitSelectors) {
    try {
      const btn = await page.$(sel);
      if (btn && await btn.isVisible()) {
        await btn.click();
        submitted = true;
        await delay(3000);
        break;
      }
    } catch (e) { continue; }
  }
  if (!submitted) throw new Error('No submit button found');
}

// --- Blocker detection ---
async function checkBlockers(page) {
  const html = await page.content().catch(() => '');

  if (html.includes('recaptcha') || html.includes('hcaptcha') ||
      html.includes('g-recaptcha') || html.includes('cf-turnstile')) {
    return 'captcha';
  }

  // Check for closed comments (WordPress)
  const bodyText = await page.textContent('body').catch(() => '');
  if (bodyText.match(/comments.*closed/i) || bodyText.match(/comments.*disabled/i)) {
    return 'comments_closed';
  }

  return null;
}

// --- Process a single resource ---
async function processResource(resource, site, page, log) {
  const norm = normalizeResource(resource);
  const result = {
    url: norm.url,
    type: norm.type,
    site: site.name,
    timestamp: new Date().toISOString(),
    status: 'unknown',
  };

  try {
    console.log(`  🔄 ${norm.url.substring(0, 80)}`);

    // Skip profiles without URL fields (useless)
    if (norm.type === 'profile' && !norm.has_url_field) {
      result.status = 'skipped';
      result.reason = 'no_url_field';
      console.log(`    ⏭️  Skipped (profile, no URL field)`);
      return result;
    }

    // Skip captcha sites
    if (norm.has_captcha) {
      result.status = 'skipped';
      result.reason = 'captcha';
      console.log(`    ⏭️  Skipped (has captcha)`);
      return result;
    }

    // Navigate and check blockers
    if (norm.type === 'blog_comment') {
      await submitBlogComment(page, resource, site);
    } else {
      result.status = 'skipped';
      result.reason = 'unsupported_type';
      console.log(`    ⏭️  Skipped (type: ${norm.type})`);
      return result;
    }

    result.status = 'submitted';
    console.log(`    ✅ Submitted`);

  } catch (error) {
    const msg = error.message || '';
    if (msg.includes('Timeout') || msg.includes('timeout') || msg.includes('ERR_')) {
      result.status = 'skipped';
      result.reason = 'timeout';
      console.log(`    ⏭️  Skipped (timeout/network)`);
    } else if (msg.includes('No comment field') || msg.includes('No submit button')) {
      result.status = 'skipped';
      result.reason = msg;
      console.log(`    ⏭️  Skipped (${msg})`);
    } else {
      result.status = 'failed';
      result.error = msg;
      console.log(`    ❌ Failed: ${msg}`);
    }
  }

  return result;
}

// --- Main ---
async function batchSubmit(opts = {}) {
  const limit = opts.limit || 10;
  const siteIndex = opts.siteIndex ?? Math.floor(Math.random() * 3); // random site if not specified
  const dryRun = opts.dryRun || false;

  console.log('🚀 Batch Backlink Submission v2\n');

  const { resources, sites } = loadResources();
  const log = loadLog();
  const globalHistory = loadGlobalHistory();

  // Rotate through sites
  const site = sites[siteIndex % sites.length];
  console.log(`📍 Target: ${site.name} (${site.url})`);

  // Prioritize and filter
  const prioritized = prioritizeResources(resources);
  const pending = prioritized.filter(r => {
    const url = r.url || r.URL;
    return !isSubmitted(log, globalHistory, url);
  });

  // Only blog_comments with URL field and no captcha
  const actionable = pending.filter(r => {
    const norm = normalizeResource(r);
    return norm.type === 'blog_comment' && norm.has_url_field && !norm.has_captcha;
  });

  if (actionable.length === 0) {
    console.log('✨ No actionable resources remaining!');
    return;
  }

  console.log(`📊 Actionable: ${actionable.length} | Processing: ${Math.min(limit, actionable.length)}\n`);

  if (dryRun) {
    console.log('[DRY RUN] Would process:');
    actionable.slice(0, limit).forEach((r, i) =>
      console.log(`  ${i + 1}. ${(r.url || r.URL).substring(0, 80)}`)
    );
    return;
  }

  const toProcess = actionable.slice(0, limit);

  // Resolve engine from CLI args
  const sessionConfig = { browser: { headless: true } };
  if (opts.engine) sessionConfig._engine = opts.engine;
  const { page, close } = await createSession(sessionConfig);

  try {
    for (let i = 0; i < toProcess.length; i++) {
      const resource = toProcess[i];
      console.log(`[${i + 1}/${toProcess.length}]`);

      const result = await processResource(resource, site, page, log);
      log.submissions.push(result);
      saveLog(log);

      // Track in global history
      const url = resource.url || resource.URL;
      globalHistory.add(url);
      saveGlobalHistory(globalHistory);

      // Random delay
      if (i < toProcess.length - 1) {
        const delayMs = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
        console.log(`    ⏳ ${Math.round(delayMs / 1000)}s...\n`);
        await delay(delayMs);
      }
    }
  } finally {
    await close();
  }

  // Summary
  const submitted = log.submissions.filter(s => s.status === 'submitted').length;
  const skipped = log.submissions.filter(s => s.status === 'skipped').length;
  const failed = log.submissions.filter(s => s.status === 'failed').length;

  console.log('\n📈 Summary:');
  console.log(`  ✅ Submitted: ${submitted}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📁 Log: ${getLogPath()}\n`);
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opts = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' || args[i] === '-l') { opts.limit = parseInt(args[++i], 10); }
    else if (args[i] === '--site' || args[i] === '-s') { opts.siteIndex = parseInt(args[++i], 10); }
    else if (args[i] === '--engine') { opts.engine = args[++i]; }
    else if (args[i] === '--dry-run') { opts.dryRun = true; }
  }

  batchSubmit(opts).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
}

export { batchSubmit };
