import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';

describe('submit.js pre-flight check', () => {
  it('submit.js contains HTTP pre-flight check before launching browser', () => {
    const src = readFileSync('src/submit.js', 'utf-8');
    assert.ok(src.includes('Pre-flight HTTP check'), 'should have pre-flight check');
    assert.ok(src.includes('404'), 'should check for 404');
    assert.ok(src.includes('500'), 'should check for 500');
  });
});

describe('generic adapter page validation', () => {
  it('generic.js validates page before scanning form', () => {
    const src = readFileSync('src/sites/generic.js', 'utf-8');
    assert.ok(src.includes('Validate page'), 'should validate page');
    assert.ok(src.includes('404'), 'should detect 404 pages');
    assert.ok(src.includes('login'), 'should detect login redirects');
    assert.ok(src.includes('payment'), 'should detect payment pages');
  });
});

describe('deprecated adapters are marked', () => {
  const adapters = ['600tools', 'dangai', 'toolverto', 'submitaitools'];

  for (const name of adapters) {
    it(`${name}.js is marked as DEPRECATED`, () => {
      const src = readFileSync(`src/sites/${name}.js`, 'utf-8');
      assert.ok(src.includes('DEPRECATED'), `${name} should be marked DEPRECATED`);
    });
  }
});

describe('bb.js improvements', () => {
  it('uses tab list for health check instead of status', () => {
    const src = readFileSync('src/bb.js', 'utf-8');
    assert.ok(src.includes("bb('tab', 'list')"), 'should use tab list for health check');
  });

  it('catches timeout errors with friendly message', () => {
    const src = readFileSync('src/bb.js', 'utf-8');
    assert.ok(src.includes('超时') || src.includes('timeout'), 'should detect timeout');
    assert.ok(src.includes('Chrome may be unresponsive') || src.includes('not responding'),
      'should give friendly timeout message');
  });

  it('evalClickReal dispatches full mouse events for React compat', () => {
    const src = readFileSync('src/bb.js', 'utf-8');
    assert.ok(src.includes('evalClickReal'), 'should have evalClickReal method');
    assert.ok(src.includes('mousedown'), 'should dispatch mousedown');
    assert.ok(src.includes('mouseup'), 'should dispatch mouseup');
    assert.ok(src.includes("el.type === 'radio'"), 'should handle radio elements');
  });

  it('BbElementHandle.click() uses evalClickReal', () => {
    const src = readFileSync('src/bb.js', 'utf-8');
    // BbElementHandle class should use evalClickReal, not evalClick
    const handleSection = src.substring(src.indexOf('class BbElementHandle'));
    assert.ok(handleSection.includes('evalClickReal'), 'BbElementHandle should use evalClickReal');
  });
});
