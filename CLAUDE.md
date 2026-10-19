# Backlink Pilot v2.1 — Claude Code Instructions

> **Returning session?** Read `.claude-local.md` first for project history and context.

You are operating **backlink-pilot v2.1**, an automated backlink submission toolkit.
Your job: help users submit their product to directory sites with minimal effort.

## First-time User Flow

When a user opens this project for the first time, guide them step by step:

### Step 1: Check prerequisites
```bash
node --version        # Need 18+
bb-browser --version  # Need 0.10+, install: npm install -g bb-browser
```

If bb-browser is missing, install it:
```bash
npm install -g bb-browser
```

### Step 2: Create config.yaml
Ask the user these questions (and ONLY these — keep it simple):
1. Product name? (e.g. "Metric Converter")
2. Product URL? (e.g. "https://metric-converter.net")
3. One-line description? (under 160 chars)
4. Longer description? (2-3 sentences about features and audience)
5. Contact email?

Then generate `config.yaml` from `config.example.yaml` with their answers. Set `browser.engine: bb`.

### Step 3: Start Chrome
```bash
bb-browser open about:blank
```
If this times out or errors, guide user to:
```bash
# Kill any stuck Chrome
pkill -f "bb-browser" || true
# Retry
bb-browser open about:blank
```

### Step 4: Submit
Start with ONE site to verify everything works:
```bash
node src/cli.js submit futuretools --engine bb
```

## Available Commands

| Command | What it does |
|---------|-------------|
| `node src/cli.js submit <site>` | Submit to a known site adapter |
| `node src/cli.js submit <url>` | Generic submission to any directory URL |
| `node src/cli.js run` | Batch: never-attempted sites in `targets.yaml` (skips already-failed). Options: `--category`, `--lang`, `--limit N`, `--interval ms`, `--retry`, `--retry-failed`, `--dry-run` |
| `node src/cli.js prune --delete --sheet-only` | Remove newly imported login/paid directories from `targets.yaml` |
| `node src/cli.js report [--since DATE]` | Rebuild a success/failure report from `submissions.yaml` (source of truth) — use after an interrupted run |
| `node src/cli.js scout <url> --deep` | Discover form fields on a new site |
| `node src/cli.js awesome <repo>` | Generate awesome-list GitHub Issue body |
| `node src/cli.js indexnow <url>` | Ping Bing/Yandex about new pages |
| `node src/cli.js status` | Show submission history |
| `node src/cli.js bb-update` | Update bb-browser community adapters |
| `node src/batch-submit.js --limit N` | Batch blog comment submissions |

## Site Adapters

Available in `src/sites/`: `generic`, `saashub`, `uneed`, `baitools`, `startup88`.

Deprecated (moved to `bak/deprecated-adapters/`): `600tools`, `toolverto`, `submitaitools`, `dangai`.

For any site without a dedicated adapter, use the generic adapter:
```bash
node src/cli.js submit https://some-directory.com/submit --engine bb
```

## Target Sites

`targets.yaml` contains 259 directory sites with metadata. Filter by:
- `auto: yes` — can be auto-submitted
- `status: dead` — skip these (44 confirmed dead)
- `status: paid` — costs money
- `type: form` — has a submission form
- `type: github` — awesome-list (submit via GitHub Issue)

## Key Rules

1. **Never submit the same product to the same site twice** — check `node src/cli.js status` first
2. **Pace submissions**: 1-3 minutes between sites, max 5-10 per session
3. **Always use `--engine bb`** — playwright is deprecated and gets blocked
4. **Pre-flight check**: if a site returns 404/500, don't launch browser — check root domain for new submit URL
5. **React forms**: bb-browser's `evalClickReal()` handles React/Vue components that ignore `.click()`
6. **Cloudflare Turnstile**: fill forms FAST — tokens expire in ~2 minutes
7. **Screenshots**: saved to `./screenshots/` for manual verification

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| "bb-browser cannot connect to Chrome" | Chrome not running | `bb-browser open about:blank` |
| "Chrome may be unresponsive" | Stuck Chrome process | Kill Chrome, restart: `bb-browser open about:blank` |
| "404 — submit page gone" | Site changed URL | Visit root domain, find new submit page |
| "Page redirected to login" | Site now requires account | Mark as manual, skip |
| "No recognizable form fields" | Generic adapter can't parse | Run `scout <url> --deep` first |

## When User Says...

| User says | You do |
|-----------|--------|
| "帮我提交外链" / "submit backlinks" | Check config.yaml exists → ask what sites → run submit |
| "提交到所有免费站" / "submit to all free sites" | `node src/cli.js run --engine bb` (filters `auto: yes`, skips dead/paid/already-submitted, paces between sites, reports successes) |
| "这个站能提交吗" / "can I submit to this site?" | Run `scout <url> --deep` to check |
| "提交情况" / "status" | Run `node src/cli.js status` |
| "外链策略" / "backlink strategy" | Read Strategy section in README.md, give advice |

## Config Reference

```yaml
product:
  name: "Product Name"
  url: "https://product.com"
  description: "One-line description"
  long_description: "Detailed description..."
  email: "hello@product.com"
  categories: [developer-tools]
  pricing: free  # free | freemium | paid

browser:
  engine: bb            # always use bb
  timeout: 30000

utm:
  enabled: true         # false to disable tracking params
  base_url: "https://product.com"
```

## File Layout

```
config.yaml              ← User's product config (gitignored)
config.example.yaml      ← Template
targets.yaml             ← 259 target sites with status
submissions.yaml         ← Submission history (auto-generated)
docs/                    ← Documentation (tutorial, troubleshooting, etc.)
bak/deprecated-adapters/ ← Archived adapters (not tracked)
src/cli.js               ← CLI entry point
src/submit.js            ← Submission dispatcher + pre-flight checks
src/bb.js                ← bb-browser wrapper (BbPage API)
src/sites/generic.js     ← Universal form-filling adapter
src/sites/*.js           ← Site-specific adapters
```
