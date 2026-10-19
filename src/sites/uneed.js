// sites/uneed.js — uneed.best adapter
// Auth: Email/Password, CAPTCHA: None
// Very simple form: name + URL, they auto-scrape the rest

import { withBrowser, delay } from '../browser.js';

export default {
  name: 'uneed.best',
  url: 'https://www.uneed.best/submit-a-tool',
  auth: 'email',
  captcha: 'none',

  async submit(product, config) {
    const creds = config.credentials?.uneed;
    if (!creds?.email || !creds?.password) {
      throw new Error('Uneed requires credentials in config.yaml (credentials.uneed.email/password)');
    }

    return withBrowser(config, async ({ page }) => {
      // Login
      console.log('  🔐 Logging into Uneed...');
      await page.goto('https://www.uneed.best/login', { waitUntil: 'networkidle' });
      await delay(1000);

      await page.fill('input[type="email"]', creds.email);
      await page.fill('input[type="password"]', creds.password);
      await page.click('button[type="submit"]');
      await delay(3000);

      // Navigate to submit page
      console.log('  📝 Loading submit page...');
      await page.goto('https://www.uneed.best/submit-a-tool', { waitUntil: 'networkidle' });
      await delay(1500);

      // Fill form (name + URL, minimal)
      console.log('  📝 Filling form...');

      const nameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();
      await nameInput.fill(product.name);
      await delay(300);

      const urlInput = page.locator('input[placeholder*="url" i], input[type="url"], input[name*="url" i]').first();
      await urlInput.fill(product.utm_url);
      await delay(300);

      // Submit
      const submitBtn = page.locator('button[type="submit"], button:has-text("Submit")').first();
      await submitBtn.click();
      await delay(3000);

      const body = await page.textContent('body');
      const success = /thank|success|added|waiting|queue/i.test(body);

      return {
        url: page.url(),
        confirmation: success ? 'Added to waiting line (DR 72 backlink)' : 'Form submitted',
      };
    });
  },
};
