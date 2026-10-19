# Backlink Pilot v2.1

**[中文文档](README.zh.md)**

<p align="center">
  <img src="docs/overview.svg" alt="Backlink Pilot v2.1 Overview" width="100%"/>
</p>

**One config, one command. Automated backlink submission for indie products.**

> Built by an AI Agent ([OpenClaw](https://openclaw.ai)) during real-world link building — battle-tested on 30+ sites.

**259 target sites** in [`targets.yaml`](targets.yaml) — 226 auto-submittable with bb-browser.

---

## Quickest Start — Claude Code (Recommended)

> Have Claude Code? **You don't need to read any docs.** Three steps:

```bash
git clone https://github.com/s87343472/backlink-pilot.git
cd backlink-pilot && npm install
claude    # Open Claude Code, just say "submit my product to free directories"
```

Claude automatically reads `CLAUDE.md`, guides you through config, installs bb-browser, and starts submitting.

Detailed tutorial: [docs/tutorial.md](docs/tutorial.md) | Full guide: [docs/guide.md](docs/guide.md)

---

## Manual Quick Start

```bash
# 1. Clone & install
git clone https://github.com/s87343472/backlink-pilot.git
cd backlink-pilot && npm install

# 2. Install bb-browser (recommended)
npm install -g bb-browser

# 3. Configure
cp config.example.yaml config.yaml
# Edit config.yaml with your product info

# 4. Submit
node src/cli.js submit futuretools --engine bb
node src/cli.js submit https://any-site.com --engine bb
```

---

## Engine Comparison

| Engine | Setup | Pros | Cons |
|--------|-------|------|------|
| **bb-browser** (recommended) | `npm i -g bb-browser` | Real Chrome, invisible, OAuth works | Requires Chrome |
| **playwright** (default) | `npm install` | No extra setup | Detected by anti-bot, blocked by Cloudflare |

---

## Commands

```bash
node src/cli.js submit <site-or-url>     # Submit to one directory
node src/cli.js run [--limit N]          # Submit to untried sites (skips already-failed)
node src/cli.js prune --delete --sheet-only  # Remove new login/paid directories from targets.yaml
node src/cli.js report [--since DATE]    # Rebuild success/failure report from submissions.yaml
node src/cli.js scout <url> --deep       # Discover form fields
node src/cli.js awesome <repo>           # Generate awesome-list Issue
node src/cli.js indexnow <url>           # Ping search engines
node src/cli.js status                   # Check submission history
node src/cli.js bb-update                # Update bb-browser adapters
node src/batch-submit.js --limit N       # Batch blog comments
```

---

## Strategy

**Why backlinks?** Google ranking = other sites linking to you = votes. More quality votes = higher ranking.

### Best channels by ROI

1. **GitHub awesome-lists** — highest ROI, permanent, $0, 5 min each
2. **Free directory sites** — 259 targets in `targets.yaml`, most auto-submittable
3. **Blog comments** — Website field backlinks, batch-automated

### Submission pace

- 1-3 min between sites, 5-10 per day
- **Never submit the same product to the same site twice**

### Sites to avoid

| Site | Why |
|------|-----|
| IndieHub | Hidden $4.9 paywall |
| OpenHunts | 51-week free queue |
| toolify.ai | $99 |
| Product Hunt | Anti-bot, manual only |

---

## Agent Integration

### Claude Code

Clone the repo, run `claude`, and talk. `CLAUDE.md` is the instruction manual — Claude reads it automatically.

### OpenClaw

```bash
ln -s ~/path/to/backlink-pilot ~/.openclaw/skills/backlink-pilot
```

Then just say: "Submit to free directories"

---

## Project Structure

```
backlink-pilot/
├── README.md                  ← You are here
├── README.zh.md               ← Chinese docs
├── CLAUDE.md                  ← Claude Code agent instructions
├── LICENSE
├── package.json
├── config.example.yaml        ← Config template
├── targets.yaml               ← 259 target sites
│
├── docs/                      ← Documentation
│   ├── index.md               ← Docs home (VitePress)
│   ├── guide.md               ← Complete usage guide
│   ├── tutorial.md            ← Step-by-step tutorial
│   ├── troubleshooting.md     ← 20+ debugging notes
│   ├── adapters.md            ← Site adapters reference
│   ├── contributing.md        ← PR guidelines
│   └── skill.md               ← OpenClaw skill definition
│
├── src/                       ← Source code
│   ├── cli.js                 ← CLI entry point
│   ├── submit.js              ← Submission dispatcher
│   ├── bb.js                  ← bb-browser wrapper
│   ├── browser.js             ← Dual-engine manager
│   ├── config.js              ← Config loader + UTM
│   ├── tracker.js             ← Submission tracking
│   ├── captcha.js             ← CAPTCHA solvers
│   ├── indexnow.js            ← Search engine ping
│   ├── batch-submit.js        ← Batch blog comments
│   ├── bb-update.js           ← bb-browser adapter updater
│   ├── sites/                 ← Site adapters
│   │   ├── generic.js         ← Universal adapter
│   │   ├── saashub.js
│   │   ├── uneed.js
│   │   ├── baitools.js
│   │   └── startup88.js
│   ├── scout/discover.js      ← Form field discovery
│   └── awesome/templates.js   ← Awesome-list Issue generator
│
├── tests/                     ← Test suite
└── bak/                       ← Deprecated code (not tracked)
```

---

## Developer

### Writing a new adapter

```bash
# Option 1: Generic (no code needed)
node src/cli.js submit https://new-site.com/submit --engine bb

# Option 2: Custom adapter
node src/cli.js scout https://new-site.com --deep
# Then create src/sites/newsite.js — see docs/adapters.md
```

### Running tests

```bash
npm test
```

> Full debugging notes: [docs/troubleshooting.md](docs/troubleshooting.md)

---

## Contributing

See [docs/contributing.md](docs/contributing.md). PRs welcome: new adapters, CAPTCHA improvements, bug fixes.

## License

MIT

## Credits

Built with [OpenClaw](https://openclaw.ai). Browser automation by [bb-browser](https://github.com/niciral/bb-browser) and [rebrowser-playwright](https://github.com/nickthecoder/rebrowser-playwright).
