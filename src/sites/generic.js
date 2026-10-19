// generic.js — Universal directory submission adapter using bb-browser
// Works with any directory site by auto-detecting form fields via snapshot

import { mkdirSync, writeFileSync } from 'fs';
import { withBrowser, delay } from '../browser.js';

// Field detection patterns (reused from batch-submit.js proven selectors)
const FIELD_PATTERNS = {
  name: /name|title|product|app.?name|tool.?name|名称|品名|标题|工具名/i,
  url: /url|website|link|homepage|\bsite\b|链接|网址|官网|访问地址|网站地址/i,
  email: /email|e-mail|\bmail\b|邮箱|邮件|联系方式/i,
  description: /desc|description|about|summary|detail|intro|简介|介绍|描述|亮点/i,
};

const SUBMIT_PATTERNS = /submit|send|add|post|create|list|suggest|save|提交|送出/i;
const SEARCH_NOISE = /search|搜索|keyword|关键字|^q$/i;

/**
 * Parse one snapshot line into { ref, role, label }.
 * Supports both bb-browser formats:
 *   legacy  : "@3 [textbox] Name ..."
 *   >= 0.14 : "textbox [ref=3] \"Name\""
 */
function parseSnapshotLine(line) {
  let m = line.match(/^\s*(\w+)\s+\[ref=(\d+)\]\s*"?(.*?)"?\s*$/);
  if (m) return { role: m[1], ref: `@${m[2]}`, label: m[3] };
  m = line.match(/^.*?(@\d+)\s+\[(\w+)\]\s*(.*)$/);
  if (m) return { ref: m[1], role: m[2], label: m[3] };
  return null;
}

/**
 * Score how well a label matches each field. Higher wins; 0 = no match.
 * Explicit "tool name" / "tool url" beat a bare "name" / "link", and a
 * person's name ("Your Name", "First Name") is never the product name.
 */
function scoreField(labelLower) {
  const s = { name: 0, url: 0, email: 0, description: 0 };
  if (SEARCH_NOISE.test(labelLower)) return s;

  // Example values in placeholders: "you@example.com", "https://example.com"
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(labelLower) || FIELD_PATTERNS.email.test(labelLower)) {
    s.email = 3;
    return s;
  }
  if (/https?:\/\//i.test(labelLower)) { s.url = 3; return s; }

  const personName = /\b(your|first|last|full|contact)\s*name\b/.test(labelLower)
    || /昵称|请输入昵称/.test(labelLower);
  if (/\b(tool|product|app|site|website|startup|project)\s*name\b|^title\b|\btitle\b|产品名称|工具名/.test(labelLower)) s.name = 3;
  else if (!personName && FIELD_PATTERNS.name.test(labelLower)) s.name = 1;

  if (/\b(tool|product|app|website|site|startup|project)\s*(url|link|website)\b|\burl\b|\bhomepage\b|产品链接|网站地址|访问地址/.test(labelLower)) s.url = 3;
  else if (FIELD_PATTERNS.url.test(labelLower)) s.url = 1;

  if (/\bshort\b.*\b(desc|description|summary|tagline)\b|\btagline\b/.test(labelLower)) s.description = 2;
  else if (FIELD_PATTERNS.description.test(labelLower)) s.description = 3;

  return s;
}

/**
 * Parse bb-browser snapshot output to find interactive elements
 */
export function parseSnapshot(snapshot) {
  const best = { name: 0, url: 0, email: 0, description: 0, submit: 0 };
  const fields = { name: null, url: null, email: null, description: null, submit: null };
  const lines = snapshot.split('\n');
  let pendingLabel = '';

  for (const line of lines) {
    const parsed = parseSnapshotLine(line);
    if (!parsed) continue;

    const { ref, role } = parsed;
    let label = parsed.label;

    // In the new format a <label> is its own line preceding the control and
    // the control's own text is usually just its placeholder — combine both.
    if (role === 'label') { pendingLabel = label; continue; }
    if (pendingLabel && (role === 'textbox' || role === 'combobox' || role === 'searchbox')) {
      label = `${pendingLabel} ${label}`;
    }
    pendingLabel = '';

    const labelLower = label.toLowerCase();

    if (role === 'textbox' || role === 'combobox' || role === 'searchbox') {
      const scores = scoreField(labelLower);
      // Assign this control to the single field it matches best, and only
      // if it beats what we already have for that field.
      const [field, score] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
      if (score > best[field]) {
        best[field] = score;
        fields[field] = ref;
      }
    }

    // Match submit button — prefer real buttons and labels containing "submit"
    if ((role === 'button' || role === 'link') && SUBMIT_PATTERNS.test(labelLower)
        && !/付费|paid|pricing|buy now|upgrade/i.test(labelLower)) {
      const exact = /^(submit|send|提交)(\s*(tool|form|审核|产品).*)?$/i.test(label.trim());
      const score = (role === 'button' ? 1 : 0) + (/submit|send|提交/.test(labelLower) ? 2 : 0) + (exact ? 2 : 0) + 1;
      if (score > best.submit) {
        best.submit = score;
        fields.submit = ref;
      }
    }
  }

  // Unlabeled consecutive textboxes (MikeCRM / Bubble / similar builders)
  if (!hasFields(fields)) {
    const blanks = [];
    for (const line of lines) {
      const parsed = parseSnapshotLine(line);
      if (!parsed) continue;
      if ((parsed.role === 'textbox' || parsed.role === 'combobox') && !SEARCH_NOISE.test(parsed.label) && !parsed.label.trim()) {
        blanks.push(parsed.ref);
      }
    }
    if (blanks.length >= 2) {
      fields.name = fields.name || blanks[0];
      fields.url = fields.url || blanks[1];
      if (blanks[2]) fields.description = fields.description || blanks[2];
    }
  }

  return fields;
}

export function hasFields(fields) {
  return !!(fields.name || fields.url || fields.description);
}

const FORM_HOSTS = /tally\.so|typeform\.com|airtable\.com|jotform\.com|docs\.google\.com\/forms|forms\.gle|notion\.site|fillout\.com|forms\.office\.com|hsforms|paperform\.co|formspree\.io|youform\.com|noteforms\.com/i;

/**
 * Find a hosted-form URL embedded in the page (iframe src, or an
 * "open the form in a new tab" style link). Returns null if none.
 */
async function findEmbeddedFormUrl(page) {
  if (typeof page._evalJson !== 'function') return null; // bb engine only
  const found = page._evalJson(`(() => ({
    host: location.hostname,
    iframes: Array.from(document.querySelectorAll('iframe[src]')).map(f => f.src),
    links: Array.from(document.querySelectorAll('a[href]')).map(a => a.href),
  }))()`);
  if (!found) return null;
  const { host, iframes = [], links = [] } = found;
  const external = (u) => /^https?:/.test(u) && !u.includes(host);
  return iframes.find(u => FORM_HOSTS.test(u))
    || links.find(u => FORM_HOSTS.test(u))
    || iframes.find(u => external(u) && /form|embed/i.test(u))
    || null;
}

export default {
  name: 'generic',
  url: null,
  auth: 'none',
  captcha: 'none',
  engine: 'bb', // forces bb-browser

  async submit(product, config) {
    const targetUrl = config._genericUrl || config._targetUrl;
    if (!targetUrl) throw new Error('No target URL provided for generic submission');

    return withBrowser({ ...config, _engine: 'bb' }, async ({ page }) => {
      // 1. Navigate to submission page
      console.log(`  📄 Opening ${targetUrl}`);
      await page.goto(targetUrl);
      await delay(2000);

      // 1.5. Validate page — check for dead/login/paid pages
      const pageUrl = typeof page.url === 'function' ? page.url() : '';
      const pageTitle = await page.textContent('title').catch(() => '');
      const bodyText = await page.textContent('body').catch(() => '');
      const bodySnippet = bodyText.substring(0, 500).toLowerCase();

      if (/404|not found|page not found/.test(bodySnippet) || /404/.test(pageTitle)) {
        throw new Error(`Page returned 404 — submit URL may have changed. Check the site root.`);
      }
      if (/500|server error|internal error/.test(bodySnippet)) {
        throw new Error(`Page returned 500 Server Error — site may be down.`);
      }
      if (/login|sign.?in|log.?in|create.?account/.test(pageUrl.toLowerCase()) ||
          (/login|sign.?in/.test(bodySnippet) && !/submit|add.*tool|description/.test(bodySnippet))) {
        throw new Error(`Page redirected to login — this site now requires an account.`);
      }
      if (/stripe\.com|checkout|payment|pricing|buy now|\$\d+/.test(bodySnippet) &&
          !/free/.test(bodySnippet)) {
        throw new Error(`Page appears to be a payment page — this site may no longer be free.`);
      }

      // 2. Take interactive snapshot — retry a few times, since forms on
      //    JS-heavy sites (or behind a bot-check interstitial) appear late
      console.log('  🔍 Scanning form fields...');
      const screenshotDir = config.browser?.screenshot_dir || './screenshots';
      const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
      let snapshot = '';
      let fields = null;
      const scan = async (attempts) => {
        for (let attempt = 1; attempt <= attempts; attempt++) {
          snapshot = await page.snapshot();
          fields = parseSnapshot(snapshot);
          if (hasFields(fields)) return true;
          if (attempt < attempts) {
            console.log(`  ⏳ No fields yet (attempt ${attempt}/${attempts}) — waiting for page...`);
            await delay(3000);
          }
        }
        return false;
      };

      if (!(await scan(3))) {
        // Many directories embed a hosted form (Tally, Typeform, Airtable,
        // JotForm, Google Forms, ...) in an iframe that the snapshot can't
        // see — open the embedded form directly and scan again.
        const embedUrl = await findEmbeddedFormUrl(page);
        if (embedUrl) {
          console.log(`  ↪ Form is embedded — opening ${embedUrl}`);
          await page.goto(embedUrl);
          await delay(2000);
          await scan(2);
        }
      }

      const detected = Object.entries(fields)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      console.log(`  📋 Detected: ${detected || 'none'}`);

      if (!hasFields(fields)) {
        // Keep the snapshot so the user can see what the page actually showed
        let dump = '';
        try {
          mkdirSync(screenshotDir, { recursive: true });
          dump = `${screenshotDir}/generic-${stamp()}-snapshot.txt`;
          writeFileSync(dump, snapshot, 'utf-8');
        } catch {}
        const title = (pageTitle || '').trim().slice(0, 60);
        throw new Error(
          `No recognizable form fields found` +
          (title ? ` (page title: "${title}")` : '') +
          (dump ? `. Snapshot saved to ${dump}` : '') +
          `. Use scout first.`
        );
      }

      // 3. Fill detected fields
      if (fields.name) {
        console.log(`  ✏️  Filling name: ${product.name}`);
        await page.fill(fields.name, product.name);
        await delay(300);
      }

      if (fields.url) {
        const url = product.utm_url || product.url;
        console.log(`  ✏️  Filling URL: ${url}`);
        await page.fill(fields.url, url);
        await delay(300);
      }

      if (fields.email) {
        console.log(`  ✏️  Filling email: ${product.email}`);
        await page.fill(fields.email, product.email);
        await delay(300);
      }

      if (fields.description) {
        const desc = product.long_description || product.description;
        console.log(`  ✏️  Filling description`);
        await page.fill(fields.description, desc);
        await delay(300);
      }

      // 4. Screenshot before submit
      try {
        mkdirSync(screenshotDir, { recursive: true });
        await page.screenshot(`${screenshotDir}/generic-${stamp()}.png`);
      } catch {}

      // 5. Submit
      if (fields.submit) {
        console.log(`  🚀 Clicking submit (${fields.submit})`);
        await page.click(fields.submit);
        await delay(3000);
      } else {
        console.log('  ⚠️  No submit button found — form filled but not submitted');
      }

      const currentUrl = page.url();
      return {
        url: currentUrl,
        confirmation: fields.submit
          ? 'Generic submission completed — verify manually'
          : 'Form filled but no submit button found',
      };
    });
  },
};
