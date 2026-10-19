// bb.js — bb-browser execution layer
// Wraps bb-browser CLI as subprocess calls, exposes Playwright-like page API

import { execFileSync } from 'child_process';

let _bbTimeout = 30000;

function setBbTimeout(ms) {
  if (ms && ms > 0) _bbTimeout = ms;
}

function bb(...args) {
  try {
    return execFileSync('bb-browser', args, {
      encoding: 'utf-8',
      timeout: _bbTimeout,
    }).trim();
  } catch (e) {
    const msg = e.stderr?.trim() || e.message;
    if (msg.includes('ECONNREFUSED') || msg.includes('No page target') || msg.includes('connect')) {
      throw new Error(
        `bb-browser cannot connect to Chrome. Make sure it is running:\n` +
        `  1. Run: bb-browser status\n` +
        `  2. If no Chrome is running: bb-browser open about:blank\n` +
        `  3. Try again`
      );
    }
    if (msg.includes('超时') || msg.includes('timeout') || msg.includes('ETIMEDOUT') || e.killed) {
      throw new Error(
        `bb-browser command timed out (${args.join(' ')}). Chrome may be unresponsive.\n` +
        `  Try: kill the Chrome process and restart with bb-browser open about:blank`
      );
    }
    throw new Error(`bb-browser ${args[0]}: ${msg}`);
  }
}

function escapeJs(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

/**
 * Check if bb-browser is available on the system
 */
export function isBbAvailable() {
  try {
    execFileSync('which', ['bb-browser'], { encoding: 'utf-8' });
    return true;
  } catch { return false; }
}

/**
 * Playwright-like page wrapper around bb-browser CLI
 */
export class BbPage {
  constructor(config = {}) {
    this._config = config;
    this._tabId = null;
    this._openedTabs = []; // track tabs for cleanup

    // Apply timeout from config
    if (config.browser?.timeout) setBbTimeout(config.browser.timeout);

    // Verify Chrome is reachable — use 'tab list' instead of 'status'
    // because 'status' can return "running" even when commands timeout
    try {
      bb('tab', 'list');
    } catch (e) {
      const msg = e.message || '';
      if (msg.includes('超时') || msg.includes('timeout') || msg.includes('Timeout')) {
        throw new Error(
          `bb-browser Chrome is not responding (commands timeout).\n` +
          `  Try restarting Chrome:\n` +
          `    1. Kill the managed Chrome: kill $(cat ~/.bb-browser/browser/cdp-port 2>/dev/null && lsof -ti :19825)\n` +
          `    2. Relaunch: bb-browser open about:blank\n` +
          `    3. Retry your command.`
        );
      }
      throw new Error(
        `bb-browser Chrome is not running.\n` +
        `  Start it with: bb-browser open about:blank\n` +
        `  Then retry your command.`
      );
    }
  }

  /**
   * Run a bb-browser command scoped to this page's tab.
   * bb-browser >= 0.14 requires --tab <id> on every page command
   * (eval, fill, click, screenshot, snap, ...).
   */
  _bb(...args) {
    if (!this._tabId) {
      throw new Error('No tab open — call page.goto(url) first');
    }
    return bb(...args, '--tab', this._tabId);
  }

  async goto(url, _opts = {}) {
    let result;
    if (this._tabId) {
      // Reuse the existing tab so cookies/session context are kept
      result = bb('goto', url, '--tab', this._tabId);
    } else {
      result = bb('open', url, '--tab');
      // Extract tabId from output. Newer versions print "tab: XXXX",
      // older ones "Tab ID: XXXX"
      const tabMatch = result.match(/(?:Tab ID|tab):\s*(\S+)/i);
      if (!tabMatch) {
        throw new Error(`bb-browser open: could not determine tab id from output:\n${result}`);
      }
      this._tabId = tabMatch[1];
      this._openedTabs.push(this._tabId);
    }
    await this._waitForLoad(url);
  }

  /**
   * Poll until the tab has left about:blank and document.readyState is
   * 'complete' (bb-browser open/goto return before navigation finishes).
   */
  async _waitForLoad(url) {
    const deadline = Date.now() + _bbTimeout;
    while (Date.now() < deadline) {
      let state = '';
      try {
        // Bot-check interstitials (Cloudflare, Vercel, ...) report
        // readyState 'complete' too — keep waiting while they are showing.
        state = this._bb('eval', `(() => {
          if (location.href === 'about:blank') return 'blank';
          if (/just a moment|checking your browser|verify you are human|attention required/i.test(document.title)) return 'challenge';
          return document.readyState;
        })()`);
      } catch {}
      if (state === 'complete') break;
      await new Promise(r => setTimeout(r, 500));
    }
    // Give client-side frameworks a moment to hydrate
    await new Promise(r => setTimeout(r, 1500));
  }

  /**
   * Close all tabs opened during this session
   */
  async cleanup() {
    for (const tabId of this._openedTabs) {
      try { bb('close', '--tab', tabId); } catch {}
    }
    this._openedTabs = [];
    this._tabId = null;
  }

  async fill(selectorOrRef, value) {
    if (selectorOrRef.startsWith('@')) {
      this._bb('fill', selectorOrRef, value);
    } else {
      // CSS selector — find element via eval, then use ref from snapshot
      const ref = await this._resolveRef(selectorOrRef);
      if (ref) this._bb('fill', ref, value);
      else throw new Error(`Element not found: ${selectorOrRef}`);
    }
  }

  async click(selectorOrRef) {
    if (selectorOrRef.startsWith('@')) {
      this._bb('click', selectorOrRef);
    } else {
      // CSS selector — use evalClick with full user-event simulation
      // This dispatches mousedown/mouseup/click to work with React/Vue components
      await this.evalClickReal(selectorOrRef);
    }
  }

  async type(selectorOrRef, text, _opts = {}) {
    // bb-browser fill handles typing in real browser
    await this.fill(selectorOrRef, text);
  }

  async textContent(selector) {
    return this._bb('eval', `document.querySelector('${escapeJs(selector)}')?.textContent || ''`);
  }

  async content() {
    return this._bb('eval', 'document.documentElement.outerHTML');
  }

  url() {
    return this._bb('eval', 'window.location.href');
  }

  async screenshot(path) {
    if (path) this._bb('screenshot', path);
    else this._bb('screenshot');
  }

  /**
   * Get interactive snapshot — returns parsed accessibility tree text
   */
  async snapshot() {
    return this._bb('snap', '-i');
  }

  /**
   * Playwright-compatible $(selector) — returns BbElementHandle or null
   */
  async $(selector) {
    const expr = exprForSelector(selector);
    if (!expr) return null;
    const exists = this._bb('eval', `!!(${expr})`);
    return exists === 'true' ? new BbElementHandle(this, expr) : null;
  }

  /**
   * Playwright-compatible locator(selector)
   */
  locator(selector) {
    return new BbLocator(this, selector);
  }

  // --- Internal helpers ---

  /**
   * Evaluate a JS expression and get back a real JS value (null, bool,
   * number, string, ...). bb-browser prints raw strings, so a string "null"
   * and a real null are indistinguishable without JSON round-tripping.
   */
  _evalJson(expr) {
    const out = this._bb('eval', `JSON.stringify((() => { try { return (${expr}); } catch { return null; } })() ?? null)`);
    try { return JSON.parse(out); } catch { return out; }
  }

  async _resolveRef(selector) {
    // bb-browser refs (@xxx) come from snapshots; CSS selectors are handled
    // via eval instead, so always fall through to the eval-based approach.
    return null;
  }

  // --- Expression-based element ops (shared by handles/locators) ---

  _fillExpr(expr, value) {
    this._bb('eval', `(() => {
      const el = ${expr};
      if (!el) return;
      el.focus();
      el.value = '${escapeJs(value)}';
      el.dispatchEvent(new Event('input', {bubbles: true}));
      el.dispatchEvent(new Event('change', {bubbles: true}));
    })()`);
  }

  _clickExpr(expr) {
    this._bb('eval', `(() => {
      const el = ${expr};
      if (!el) return;
      el.dispatchEvent(new MouseEvent('mousedown', {bubbles:true,cancelable:true}));
      el.dispatchEvent(new MouseEvent('mouseup', {bubbles:true,cancelable:true}));
      el.dispatchEvent(new MouseEvent('click', {bubbles:true,cancelable:true}));
      if (el.type === 'radio' || el.type === 'checkbox') {
        el.checked = el.type === 'radio' ? true : !el.checked;
        el.dispatchEvent(new Event('change', {bubbles:true}));
        el.dispatchEvent(new Event('input', {bubbles:true}));
      }
    })()`);
  }

  _isVisibleExpr(expr) {
    return this._evalJson(`(() => {
      const el = ${expr};
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    })()`) === true;
  }

  // --- Selector-based convenience wrappers (public API) ---

  async evalFill(selector, value) {
    this._fillExpr(exprForSelector(selector), value);
  }

  async evalClick(selector) {
    this._bb('eval', `(${exprForSelector(selector)})?.click()`);
  }

  /**
   * Click with full user-event simulation (mousedown → mouseup → click)
   * Required for React/Vue components that don't respond to .click()
   */
  async evalClickReal(selector) {
    this._clickExpr(exprForSelector(selector));
  }

  async evalClickByText(tag, text) {
    this._bb('eval', `(${exprForHasText(tag, text)})?.click()`);
  }
}

/**
 * Build a JS expression that evaluates to a single element for a selector.
 * Supports plain CSS and Playwright's `tag:has-text("...")`.
 * `root` is an optional JS expression for a parent element.
 */
function exprForSelector(selector, root = 'document') {
  const m = selector.match(/^(\w+):has-text\(["'](.+?)["']\)$/);
  if (m) return exprForHasText(m[1], m[2], root);
  if (selector.includes(':has-text(')) return null;
  return `${root}.querySelector('${escapeJs(selector)}')`;
}

function exprForHasText(tag, text, root = 'document') {
  return `Array.from(${root}.querySelectorAll('${escapeJs(tag)}')).find(el => el.textContent.includes('${escapeJs(text)}'))`;
}

/**
 * Element handle — wraps a JS expression that resolves to a DOM element
 */
export class BbElementHandle {
  constructor(page, expr) {
    this._page = page;
    this._expr = expr;
  }

  async isVisible() {
    return this._page._isVisibleExpr(this._expr);
  }

  async textContent() {
    return this._page._evalJson(`(${this._expr})?.textContent`) ?? '';
  }

  async getAttribute(attr) {
    return this._page._evalJson(`(${this._expr})?.getAttribute('${escapeJs(attr)}')`);
  }

  async click() {
    // Same full user-event simulation as page.evalClickReal(), but on this
    // handle's element expression (works for nth-match / scoped handles)
    this._page._clickExpr(this._expr);
  }

  async fill(value) {
    this._page._fillExpr(this._expr, value);
  }

  async evaluate(fn) {
    // Runs fn in the page with the element as argument
    return this._page._evalJson(`(${fn.toString()})(${this._expr})`);
  }

  /**
   * Scoped locator — Playwright-style handle.locator(selector)
   */
  locator(selector) {
    return new BbLocator(this._page, selector, this._expr);
  }
}

/**
 * Locator — lazily resolves a selector (optionally scoped to a parent expr)
 */
export class BbLocator {
  constructor(page, selector, root = 'document') {
    this._page = page;
    this._selector = selector;
    this._root = root;
  }

  _expr() {
    return exprForSelector(this._selector, this._root);
  }

  first() {
    return new BbElementHandle(this._page, this._expr());
  }

  async all() {
    const count = this._page._evalJson(
      `${this._root}.querySelectorAll('${escapeJs(this._selector)}').length`) || 0;
    return Array.from({ length: count }, (_, i) =>
      new BbElementHandle(this._page,
        `${this._root}.querySelectorAll('${escapeJs(this._selector)}')[${i}]`)
    );
  }

  async count() {
    return (await this.all()).length;
  }

  async isVisible() {
    return this._page._isVisibleExpr(this._expr());
  }

  async textContent() {
    return this.first().textContent();
  }

  async getAttribute(attr) {
    return this.first().getAttribute(attr);
  }

  async fill(value) {
    this._page._fillExpr(this._expr(), value);
  }

  async click() {
    this._page._clickExpr(this._expr());
  }
}
