// scout/discover.js — Site submit page discovery

import { withBrowser, delay } from '../browser.js';

export async function scout(url, opts = {}) {
  const { config } = opts;

  console.log(`\n🔍 Scouting ${url}\n`);

  return withBrowser(config, async ({ page }) => {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await delay(1000);

    // Find submit/add links
    const links = await page.locator('a').all();
    const submitLinks = [];

    for (const link of links) {
      const href = await link.getAttribute('href').catch(() => '');
      const text = await link.textContent().catch(() => '');
      if (!href) continue;

      const isSubmit = /submit|add|list|suggest|contribute/i.test(href + ' ' + text);
      if (isSubmit) {
        submitLinks.push({
          text: text?.trim().slice(0, 60),
          href: href.startsWith('/') ? new URL(href, url).toString() : href,
        });
      }
    }

    console.log(`📋 Submit-related links found: ${submitLinks.length}`);
    for (const l of submitLinks) {
      console.log(`  → ${l.text} — ${l.href}`);
    }

    // If deep scouting, follow first submit link
    if (opts.deep && submitLinks.length > 0) {
      const target = submitLinks[0].href;
      console.log(`\n📝 Following: ${target}`);
      await page.goto(target, { waitUntil: 'networkidle', timeout: 30000 });
      await delay(1000);

      // Enumerate form fields
      const forms = await page.locator('form').all();
      console.log(`\n📝 Forms found: ${forms.length}`);

      for (let i = 0; i < forms.length; i++) {
        const form = forms[i];
        const inputs = await form.locator('input, textarea, select').all();
        console.log(`\n  Form ${i + 1} (${inputs.length} fields):`);

        for (const input of inputs) {
          const tag = await input.evaluate(el => el.tagName.toLowerCase());
          const type = await input.getAttribute('type') || tag;
          const name = await input.getAttribute('name') || '';
          const placeholder = await input.getAttribute('placeholder') || '';
          const required = await input.getAttribute('required') !== null;
          console.log(`    ${required ? '* ' : '  '}[${type}] ${name || placeholder || '(unnamed)'}`);
        }
      }
    }

    // Check for auth requirements
    const bodyText = await page.textContent('body');
    const hasLogin = /sign in|log in|create account|register/i.test(bodyText);
    const hasOAuth = /google|github|twitter/i.test(bodyText);
    const hasCaptcha = /captcha|verify|robot/i.test(bodyText);

    console.log('\n🔐 Auth signals:');
    console.log(`  Login required: ${hasLogin ? '⚠️ Yes' : '✅ No'}`);
    console.log(`  OAuth available: ${hasOAuth ? '🔑 Yes' : '—'}`);
    console.log(`  CAPTCHA detected: ${hasCaptcha ? '⚠️ Yes' : '✅ No'}`);

    return { submitLinks, hasLogin, hasOAuth, hasCaptcha };
  });
}
