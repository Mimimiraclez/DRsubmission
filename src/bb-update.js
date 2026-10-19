// bb-update.js — Auto-update bb-browser community site adapters

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';

const TIMESTAMP_FILE = 'logs/bb-update-last.txt';
const DEFAULT_INTERVAL_HOURS = 24;

/**
 * Run bb-browser site update if enough time has elapsed
 */
export async function maybeUpdateBbSites(config = {}) {
  const bbConfig = config.bb_browser || {};
  if (bbConfig.auto_update === false) return;

  const intervalMs = (bbConfig.update_interval_hours || DEFAULT_INTERVAL_HOURS) * 3600 * 1000;

  // Check last update time
  if (existsSync(TIMESTAMP_FILE)) {
    const lastUpdate = parseInt(readFileSync(TIMESTAMP_FILE, 'utf-8').trim(), 10);
    if (Date.now() - lastUpdate < intervalMs) return;
  }

  console.log('🔄 Updating bb-browser site adapters...');
  try {
    execFileSync('bb-browser', ['site', 'update'], {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: 'pipe',
    });
    console.log('✅ bb-browser sites updated');
  } catch (e) {
    console.warn(`⚠️  bb-browser site update failed: ${e.message}`);
  }

  // Write timestamp
  if (!existsSync('logs')) mkdirSync('logs', { recursive: true });
  writeFileSync(TIMESTAMP_FILE, String(Date.now()), 'utf-8');
}

/**
 * Force update (for CLI command)
 */
export function forceUpdate() {
  console.log('🔄 Updating bb-browser site adapters...');
  try {
    execFileSync('bb-browser', ['site', 'update'], {
      encoding: 'utf-8',
      timeout: 60000,
      stdio: 'inherit',
    });
    if (!existsSync('logs')) mkdirSync('logs', { recursive: true });
    writeFileSync(TIMESTAMP_FILE, String(Date.now()), 'utf-8');
  } catch (e) {
    console.error(`❌ Update failed: ${e.message}`);
    process.exit(1);
  }
}
