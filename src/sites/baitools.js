// sites/baitools.js — bai.tools adapter
// Auth: Google OAuth, CAPTCHA: None

import { withBrowser, delay } from '../browser.js';

export default {
  name: 'bai.tools',
  url: 'https://bai.tools/submit',
  auth: 'google-oauth',
  captcha: 'none',

  async submit(product, config) {
    return withBrowser(config, async ({ page }) => {
      // Note: Google OAuth requires a pre-authenticated browser session
      // or manual 2FA approval on first use
      console.log('  🔐 Loading bai.tools (Google OAuth required)...');
      await page.goto('https://bai.tools/submit', { waitUntil: 'networkidle' });
      await delay(2000);

      // Check if login is needed
      const bodyText = await page.textContent('body');
      if (/sign in|log in|google/i.test(bodyText)) {
        console.log('  ⚠️  Google OAuth login required. Agent cannot complete 2FA automatically.');
        console.log('  📝 Manual step: Log in with Google account first, then retry.');
        throw new Error('Google OAuth login required — needs manual 2FA approval');
      }

      // Fill form
      console.log('  📝 Filling form...');

      const nameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(product.name);
        await delay(300);
      }

      const urlInput = page.locator('input[placeholder*="url" i], input[type="url"]').first();
      if (await urlInput.isVisible().catch(() => false)) {
        await urlInput.fill(product.utm_url);
        await delay(300);
      }

      const descInput = page.locator('textarea').first();
      if (await descInput.isVisible().catch(() => false)) {
        await descInput.fill(product.long_description || product.description);
        await delay(300);
      }

      // Submit
      const submitBtn = page.locator('button[type="submit"], button:has-text("Submit")').first();
      await submitBtn.click();
      await delay(3000);

      const body = await page.textContent('body');
      const success = /thank|success|review|submitted/i.test(body);

      return {
        url: page.url(),
        confirmation: success ? 'Submitted for review (~30 days)' : 'Form submitted',
      };
    });
  },
};
