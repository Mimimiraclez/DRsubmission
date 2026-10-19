// config.js — Load and validate YAML config

import { readFileSync, existsSync } from 'fs';
import { parse } from 'yaml';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const CONFIG_FILES = ['config.yaml', 'config.yml', 'backlink-pilot.yaml'];

export async function loadConfig(customPath) {
  let configPath = customPath;
  
  if (!configPath) {
    for (const f of CONFIG_FILES) {
      if (existsSync(f)) {
        configPath = f;
        break;
      }
    }
  }

  if (!configPath || !existsSync(configPath)) {
    console.error('❌ No config file found. Create config.yaml (see config.example.yaml)');
    process.exit(1);
  }

  const raw = readFileSync(configPath, 'utf-8');
  const config = parse(raw);

  // Validate required fields
  const required = ['product.name', 'product.url', 'product.description', 'product.email'];
  for (const path of required) {
    const val = path.split('.').reduce((o, k) => o?.[k], config);
    if (!val) {
      console.error(`❌ Missing required config: ${path}`);
      process.exit(1);
    }
  }

  return config;
}

export function utmUrl(config, source) {
  const base = config.utm?.base_url || config.product.url;

  // Allow disabling UTM parameters entirely
  if (config.utm?.enabled === false) return base;

  const medium = config.utm?.medium || 'directory';
  const campaign = config.utm?.campaign || 'backlink';
  return `${base}?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaign}`;
}
