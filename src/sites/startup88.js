// sites/startup88.js — startup88.com adapter
// Auth: None, CAPTCHA: None
// Submission via Typeform embed

import { withBrowser, delay, humanType } from '../browser.js';

export default {
  name: 'startup88.com',
  url: 'https://startup88.com/',
  auth: 'none',
  captcha: 'none',
  pricing: 'free',
  formType: 'typeform',
  
  async submit(product, config) {
    return withBrowser(config, async ({ page }) => {
      console.log('  🌐 Navigating to Startup88...');
      // Startup88 uses Typeform — need to fill step by step
      await page.goto('https://startup88.com/', { waitUntil: 'networkidle' });
      await delay(3000);

      // Look for submit/add link
      const submitLink = await page.$('a[href*="submit"], a[href*="typeform"], a:has-text("Submit"), a:has-text("Add")');
      if (submitLink) {
        const href = await submitLink.getAttribute('href');
        if (href?.includes('typeform.com')) {
          await page.goto(href, { waitUntil: 'networkidle' });
        } else {
          await submitLink.click();
        }
        await delay(3000);
      }

      // Typeform fills: click through screens, type answers
      // Each question appears one at a time
      const answers = [product.name, product.url, product.description, product.email];
      
      for (const answer of answers) {
        try {
          const input = await page.$('input[type="text"], input[type="url"], input[type="email"], textarea');
          if (input) {
            await input.click();
            await humanType(page, input, answer);
            await delay(500);
          }
          // Press Enter or click OK/Next to advance
          const nextBtn = await page.$('button[data-qa="ok-button-visible"], button:has-text("OK"), button:has-text("Next")');
          if (nextBtn) {
            await nextBtn.click();
          } else {
            await page.keyboard.press('Enter');
          }
          await delay(2000);
        } catch (e) {
          console.log(`  ⚠️ Typeform step error: ${e.message}`);
        }
      }

      // Final submit
      const submitBtn = await page.$('button[data-qa="submit-button"], button:has-text("Submit")');
      if (submitBtn) {
        await submitBtn.click();
        await delay(3000);
        console.log('  ✅ Submitted to Startup88');
        return { success: true, site: 'startup88.com' };
      }

      console.log('  ⚠️ Typeform submission may need manual completion');
      return { success: false, site: 'startup88.com', reason: 'Typeform navigation incomplete' };
    });
  }
};
