import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { utmUrl } from '../src/config.js';

describe('utmUrl', () => {
  it('appends UTM params by default', () => {
    const config = { product: { url: 'https://example.com' } };
    const result = utmUrl(config, 'testsite');
    assert.equal(result, 'https://example.com?utm_source=testsite&utm_medium=directory&utm_campaign=backlink');
  });

  it('uses utm.base_url when provided', () => {
    const config = {
      product: { url: 'https://example.com' },
      utm: { base_url: 'https://custom.com', medium: 'social', campaign: 'launch' },
    };
    const result = utmUrl(config, 'twitter');
    assert.equal(result, 'https://custom.com?utm_source=twitter&utm_medium=social&utm_campaign=launch');
  });

  it('returns clean URL when utm.enabled is false', () => {
    const config = {
      product: { url: 'https://example.com' },
      utm: { enabled: false, base_url: 'https://example.com' },
    };
    const result = utmUrl(config, 'testsite');
    assert.equal(result, 'https://example.com');
  });

  it('returns clean product.url when utm.enabled is false and no base_url', () => {
    const config = {
      product: { url: 'https://example.com' },
      utm: { enabled: false },
    };
    const result = utmUrl(config, 'testsite');
    assert.equal(result, 'https://example.com');
  });

  it('appends UTM when utm.enabled is true', () => {
    const config = {
      product: { url: 'https://example.com' },
      utm: { enabled: true },
    };
    const result = utmUrl(config, 'testsite');
    assert.match(result, /utm_source=testsite/);
  });

  it('appends UTM when utm.enabled is not set (backwards compat)', () => {
    const config = {
      product: { url: 'https://example.com' },
      utm: { medium: 'dir' },
    };
    const result = utmUrl(config, 'x');
    assert.match(result, /utm_source=x/);
    assert.match(result, /utm_medium=dir/);
  });
});
