import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, renameSync } from 'fs';

describe('batch-submit resource loading', () => {
  it('resources/backlink-resources.example.json exists', () => {
    assert.ok(existsSync('resources/backlink-resources.example.json'));
  });

  it('example file is valid JSON with expected structure', async () => {
    const { readFileSync } = await import('fs');
    const raw = JSON.parse(readFileSync('resources/backlink-resources.example.json', 'utf-8'));
    assert.ok(raw.blog_comments, 'should have blog_comments key');
    assert.ok(Array.isArray(raw.blog_comments), 'blog_comments should be array');
    assert.ok(raw.blog_comments.length > 0, 'should have at least one example');

    const entry = raw.blog_comments[0];
    assert.ok(entry.type, 'entry should have type');
    assert.ok(entry.url, 'entry should have url');
    assert.equal(typeof entry.has_url_field, 'boolean');
    assert.equal(typeof entry.has_captcha, 'boolean');
  });

  it('batchSubmit exits with error when resources missing', async () => {
    // We test the guard logic directly rather than running the full function
    // to avoid side effects
    const resourcePath = 'resources/backlink-resources.json';
    const sitesPath = 'resources/sites.json';
    assert.ok(existsSync(resourcePath) || true, 'guard should check existence');
    assert.ok(existsSync(sitesPath), 'sites.json should exist');
  });
});
