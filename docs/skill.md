---
name: backlink-pilot
description: Use for submitting products to directory sites, awesome-lists, or search engines.
disable-auto-invoke: true
---

# Backlink Pilot

Automated backlink submission for indie products. One config, one command.

## Setup

```bash
cd ~/Downloads/backlink-pilot
cp config.example.yaml config.yaml   # edit with product details
```

### Engine Options

| Engine | Setup | Pros |
|--------|-------|------|
| **playwright** (default) | `npm install` | No extension needed |
| **bb** (recommended) | `npm install -g bb-browser` + Chrome extension | Real browser, no anti-bot, no Cloudflare/OAuth issues |

Set in `config.yaml` → `browser.engine: bb` or use `--engine bb` flag.

## Commands

```bash
node src/cli.js scout <url> --deep              # discover form fields
node src/cli.js submit <site>                   # submit to directory
node src/cli.js submit <site> --engine bb       # use real Chrome
node src/cli.js submit https://any-site.com     # generic submission (bb-browser)
node src/cli.js submit <site> --dry-run         # preview only
node src/cli.js awesome <list-key>              # generate awesome-list issue
node src/cli.js indexnow <url>                  # ping search engines
node src/cli.js status                          # check submissions
node src/cli.js bb-update                       # update bb-browser adapters
```

Site adapters and awesome-list targets: see `adapters.md`

## Agent Workflow

1. Check `config.yaml` exists
2. Scout unknown sites first: `scout <url> --deep`
3. Submit one at a time — check output for success/failure
4. For unknown sites: `submit https://url` uses generic bb-browser adapter
5. Track progress: `status`
6. Pace: 1-3 min between sites, 30-60 min same-site retry

## Key Constraints

- **Never submit same product twice to same site**
- Some sites reject UTM params → submit clean URL
- Google OAuth sites need manual first login (playwright only; bb-browser handles this)
- Cloudflare Turnstile = hard wall for playwright → use `--engine bb` or skip
- Troubleshooting: see `TROUBLESHOOTING.md`
