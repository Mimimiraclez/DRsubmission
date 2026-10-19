// sites/saashub.js — saashub.com adapter
// Auth: Email/Password, CAPTCHA: None

import { withBrowser, delay, humanType } from '../browser.js';

export default {
  name: 'saashub.com',
  url: 'https://www.saashub.com/new',
  auth: 'email',
  captcha: 'none',

  async submit(product, config) {
    const creds = config.credentials?.saashub;
    if (!creds?.email || !creds?.password) {
      throw new Error('SaaSHub requires credentials in config.yaml (credentials.saashub.email/password)');
    }

    return withBrowser(config, async ({ page }) => {
      // Login first
      console.log('  🔐 Logging into SaaSHub...');
      await page.goto('https://www.saashub.com/login', { waitUntil: 'networkidle' });
      await delay(1000);

      await page.fill('input[name="email"], input[type="email"]', creds.email);
      await page.fill('input[name="password"], input[type="password"]', creds.password);
      await page.click('button[type="submit"], input[type="submit"]');
      await delay(3000);

      // Navigate to submit page
      console.log('  📝 Loading submit page...');
      await page.goto('https://www.saashub.com/new', { waitUntil: 'networkidle' });
      await delay(1500);

      // Fill product form
      console.log('  📝 Filling product details...');

      const nameInput = page.locator('input[name*="name" i], input[placeholder*="name" i]').first();
      if (await nameInput.isVisible().catch(() => false)) {
        await nameInput.fill(product.name);
        await delay(300);
      }

      const urlInput = page.locator('input[name*="url" i], input[type="url"]').first();
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
      const submitBtn = page.locator('button[type="submit"], input[type="submit"]').first();
      await submitBtn.click();
      await delay(3000);

      const body = await page.textContent('body');
      const success = /thank|success|review|submitted|added/i.test(body);

      return {
        url: page.url(),
        confirmation: success ? 'Product submitted for review' : 'Form submitted (check manually)',
      };
    });
  },
};
