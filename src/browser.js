// browser.js — Dual-engine browser wrapper
// Supports rebrowser-playwright (default) and bb-browser

import { chromium } from 'rebrowser-playwright';

function resolveEngine(config) {
  if (config._engine) return config._engine;
  if (config.browser?.engine) return config.browser.engine;
  return 'playwright';
}

export async function launchBrowser(config = {}) {
  const browserOpts = config.browser || {};

  const browser = await chromium.launch({
    headless: browserOpts.headless !== false,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  const page = await context.newPage();

  return { browser, context, page };
}

export async function withBrowser(config, fn) {
  const engine = resolveEngine(config);

  if (engine === 'bb') {
    const { BbPage, isBbAvailable } = await import('./bb.js');
    if (!isBbAvailable()) {
      console.warn('⚠️  bb-browser not found, falling back to playwright');
      return withBrowser({ ...config, _engine: 'playwright' }, fn);
    }
    const { maybeUpdateBbSites } = await import('./bb-update.js');
    await maybeUpdateBbSites(config);
    const page = new BbPage(config);
    try {
      return await fn({ browser: null, context: null, page });
    } finally {
      await page.cleanup(); // close all tabs opened during this session
    }
  }

  // Default: rebrowser-playwright
  const { browser, context, page } = await launchBrowser(config);
  try {
    return await fn({ browser, context, page });
  } finally {
    await browser.close();
  }
}

/**
 * Create a long-lived browser session (for batch-submit.js)
 * Returns { page, close } — close() cleans up resources
 */
export async function createSession(config = {}) {
  const engine = resolveEngine(config);

  if (engine === 'bb') {
    const { BbPage, isBbAvailable } = await import('./bb.js');
    if (!isBbAvailable()) {
      console.warn('⚠️  bb-browser not found, falling back to playwright');
      return createSession({ ...config, _engine: 'playwright' });
    }
    const { maybeUpdateBbSites } = await import('./bb-update.js');
    await maybeUpdateBbSites(config);
    const page = new BbPage(config);
    return { page, close: async () => page.cleanup() };
  }

  const { browser, context, page } = await launchBrowser(config);
  return { page, close: async () => browser.close() };
}

// Human-like delays
export function delay(ms) {
  const jitter = Math.random() * ms * 0.3;
  return new Promise(r => setTimeout(r, ms + jitter));
}

export async function humanType(page, selector, text, opts = {}) {
  // bb-browser uses real Chrome — no need for character-by-character typing
  if (page.constructor.name === 'BbPage') {
    await page.evalFill(selector, text);
    return;
  }

  // Playwright path: type character by character
  await page.click(selector);
  await delay(200);
  await page.fill(selector, '');
  for (const char of text) {
    await page.type(selector, char, { delay: 30 + Math.random() * 70 });
  }
}
