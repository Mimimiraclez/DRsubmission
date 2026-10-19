import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';

describe('.gitignore coverage', () => {
  const gitignore = readFileSync('.gitignore', 'utf-8');

  it('ignores config.yaml', () => {
    assert.ok(gitignore.includes('config.yaml'));
  });

  it('ignores config.yml', () => {
    assert.ok(gitignore.includes('config.yml'));
  });

  it('ignores backlink-pilot.yaml', () => {
    assert.ok(gitignore.includes('backlink-pilot.yaml'));
  });

  it('ignores .env', () => {
    assert.ok(gitignore.includes('.env'));
  });

  it('ignores backlink-resources.json', () => {
    assert.ok(gitignore.includes('backlink-resources.json'));
  });

  it('ignores logs/', () => {
    assert.ok(gitignore.includes('logs/'));
  });

  it('ignores screenshots/', () => {
    assert.ok(gitignore.includes('screenshots/'));
  });
});
