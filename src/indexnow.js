// indexnow.js — Ping search engines about new/updated pages

export async function pingIndexNow(url, opts = {}) {
  const key = opts.key || opts.config?.indexnow?.key || 'default-key';

  if (key === 'default-key') {
    console.warn('⚠️  No IndexNow key configured. Set it in config.yaml under indexnow.key or pass --key <key>');
  }

  console.log(`\n🔔 Pinging IndexNow for: ${url}\n`);

  const engines = [
    'https://api.indexnow.org/indexnow',
    'https://www.bing.com/indexnow',
    'https://yandex.com/indexnow',
  ];

  for (const engine of engines) {
    try {
      const pingUrl = `${engine}?url=${encodeURIComponent(url)}&key=${key}`;
      const res = await fetch(pingUrl);
      const status = res.status;
      const icon = status >= 200 && status < 300 ? '✅' : status === 202 ? '✅' : '⚠️';
      console.log(`  ${icon} ${new URL(engine).hostname}: HTTP ${status}`);
    } catch (e) {
      console.log(`  ❌ ${new URL(engine).hostname}: ${e.message}`);
    }
  }
}
