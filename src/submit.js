// submit.js — Dispatch submissions to site-specific or generic adapters

import { readdirSync } from 'fs';
import { utmUrl } from './config.js';
import { recordSubmission } from './tracker.js';

// Dynamic import of site adapters
async function loadAdapter(site) {
  // URL as site → use generic bb-browser adapter
  if (site.startsWith('http')) {
    const generic = await import('./sites/generic.js');
    return { ...generic.default, _targetUrl: site };
  }

  try {
    const mod = await import(`./sites/${site}.js`);
    return mod.default || mod;
  } catch (e) {
    return null;
  }
}

/**
 * utm_source for a target: adapter name as-is, hostname for URL targets
 * (a full URL inside a query string gets mangled/rejected by many forms)
 */
function utmSource(site) {
  if (!site.startsWith('http')) return site;
  try { return new URL(site).hostname.replace(/^www\./, ''); } catch { return site; }
}

/**
 * Submit the product to one site.
 * Returns { site, status: 'submitted' | 'failed' | 'dry-run', error?, url?, confirmation? }
 * and never throws for a submission failure (only for programmer errors).
 */
export async function submit(site, opts) {
  const { config } = opts;
  const label = opts.label ? ` (${opts.label})` : '';

  const adapter = await loadAdapter(site);
  if (!adapter) {
    console.error(`❌ No adapter for "${site}".`);
    console.log('\nAvailable sites:');
    const files = readdirSync(new URL('./sites/', import.meta.url));
    for (const f of files) {
      if (f.endsWith('.js')) console.log(`  - ${f.replace('.js', '')}`);
    }
    console.log('\nOr pass a URL directly for generic submission:');
    console.log('  node src/cli.js submit https://example.com/submit --engine bb');
    if (opts.noExit) return { site, status: 'failed', error: 'No adapter' };
    process.exit(1);
  }

  // Adapter-level engine override
  if (adapter.engine) config._engine = adapter.engine;

  // Pass target URL for generic adapter
  if (adapter._targetUrl) config._targetUrl = adapter._targetUrl;

  const product = {
    ...config.product,
    utm_url: utmUrl(config, utmSource(site)),
  };

  // Recorded with every submission so runs for different products don't
  // dedupe against each other
  const extra = { product: config.product.url, ...(opts.name ? { name: opts.name } : {}) };

  console.log(`\n🚀 Submitting "${product.name}" to ${site}${label}`);
  if (opts.dryRun) {
    console.log('  [DRY RUN] Would submit:', JSON.stringify(product, null, 2));
    return { site, status: 'dry-run' };
  }

  const fail = (error) => {
    recordSubmission(site, 'failed', { ...extra, error });
    return { site, status: 'failed', error };
  };

  // Pre-flight HTTP check — catch dead sites before launching browser
  const checkUrl = adapter._targetUrl || adapter.url;
  if (checkUrl) {
    try {
      const res = await fetch(checkUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: AbortSignal.timeout(10000),
      }).catch(() => null);
      if (res) {
        if (res.status === 404) {
          console.error(`❌ ${checkUrl} returned 404 — submit page no longer exists.`);
          console.log('   Try visiting the site root to find the new submit URL.');
          return fail('404 — submit page gone');
        }
        if (res.status >= 500) {
          console.error(`❌ ${checkUrl} returned ${res.status} — site appears down.`);
          return fail(`HTTP ${res.status}`);
        }
      }
    } catch {}
  }

  try {
    const result = await adapter.submit(product, config);
    recordSubmission(site, 'submitted', {
      ...extra,
      url: result?.url,
      confirmation: result?.confirmation,
    });
    console.log(`✅ Submitted to ${site}!`);
    if (result?.confirmation) console.log(`  Confirmation: ${result.confirmation}`);
    return { site, status: 'submitted', url: result?.url, confirmation: result?.confirmation };
  } catch (e) {
    console.error(`❌ Failed: ${e.message}`);
    return fail(e.message);
  }
}
