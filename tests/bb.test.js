import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isBbAvailable } from '../src/bb.js';

describe('bb-browser availability', () => {
  it('isBbAvailable returns boolean', () => {
    const result = isBbAvailable();
    assert.equal(typeof result, 'boolean');
  });

  it('BbPage constructor throws friendly error when Chrome not running', async () => {
    // Only test if bb-browser is installed but Chrome is not running
    if (!isBbAvailable()) {
      // bb-browser not installed — skip
      return;
    }

    const { BbPage } = await import('../src/bb.js');
    // BbPage constructor calls bb('status'), which may or may not work
    // We just verify it doesn't throw an unreadable error
    try {
      new BbPage({});
    } catch (e) {
      // Should contain user-friendly message, not raw subprocess error
      assert.match(e.message, /bb-browser|Chrome|Start it|running/i);
    }
  });
});

describe('bb timeout configuration', () => {
  it('BbPage reads timeout from config.browser.timeout', async () => {
    if (!isBbAvailable()) return;

    const { BbPage } = await import('../src/bb.js');
    // Verify construction accepts config with timeout without crashing on the timeout field
    const config = { browser: { timeout: 60000 } };
    try {
      new BbPage(config);
    } catch (e) {
      // May fail due to Chrome not running, but should NOT fail due to timeout config
      assert.doesNotMatch(e.message, /timeout.*config/i);
    }
  });
});
