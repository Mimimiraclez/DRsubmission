# Contributing to Backlink Pilot

Thanks for your interest in contributing! Here's how you can help.

## Adding a Site Adapter

The most impactful contribution is adding support for new directory sites.

### 1. Create the adapter file

```bash
cp src/sites/600tools.js src/sites/your-site.js
```

### 2. Implement the adapter

Each adapter exports an object with:

```js
export default {
  name: 'site-name.com',        // Display name
  url: 'https://site.com/submit', // Submit page URL
  auth: 'none' | 'email',       // Authentication requirement
  captcha: 'none' | 'color',    // CAPTCHA type (if any)
  pricing: 'free' | 'paid',     // Is submission free?

  async submit(product, config) {
    // product: { name, url, description, long_description, email, categories, pricing }
    // config: loaded from config.yaml
    // Return: { success: boolean, site: string, reason?: string }
  }
};
```

### 3. Test it

```bash
# Scout the site first to understand its form
node src/cli.js scout https://site.com/submit

# Test submission with your own product
node src/cli.js submit your-site
```

### 4. Submit a PR

- One site per PR (easier to review)
- Include the site's DA/DR if known
- Note if it's free or paid
- Note review time if known

## Improving the Scout

The scout (`src/scout/discover.js`) auto-discovers submit forms. If a site uses unusual form patterns, improve the detection logic.

## Code Style

- Pure ESM (no CommonJS)
- Node.js 18+
- No TypeScript (keep it simple)
- Use `delay()` and `humanType()` from `browser.js` for human-like interaction

## Reporting Issues

- Include the site URL you were trying to submit to
- Include any error messages
- Note if the site has CAPTCHA, login walls, or Cloudflare protection

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
