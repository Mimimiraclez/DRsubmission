# Usage Guide / 使用指南

Complete guide to using Backlink Pilot v2.1. Pick your path:

完整使用指南。选择你的路径：

| Path | For whom | Time |
|------|----------|------|
| [A. Claude Code](#a-claude-code-recommended) | Have Claude Code installed | 2 min |
| [B. CLI Manual](#b-cli-manual) | Developers, want full control | 10 min |
| [C. OpenClaw](#c-openclaw-skill) | OpenClaw users | 5 min |

---

## A. Claude Code (Recommended)

> **Prerequisites:** [Node.js 18+](https://nodejs.org/) + [Claude Code](https://claude.ai/code)

### Step 1: Clone

```bash
git clone https://github.com/s87343472/backlink-pilot.git
cd backlink-pilot
npm install
```

### Step 2: Open Claude Code

```bash
claude
```

Claude automatically reads `CLAUDE.md` and understands the entire project.

Claude 会自动读取 `CLAUDE.md`，了解整个项目。

### Step 3: Talk

Just tell Claude what you want in natural language:

用自然语言告诉 Claude 你想做什么：

```
你：帮我把 [产品名] 提交到免费目录站
```

Claude will:
1. Check if `config.yaml` exists → if not, ask you 5 questions → generate it
2. Check if `bb-browser` is installed → guide you to install if missing
3. Start Chrome → begin submitting one by one
4. Report results after each submission

**That's it. No docs to read, no commands to memorize.**

### What you can say to Claude

| Say | Claude does |
|-----|-------------|
| "帮我提交外链" / "Submit backlinks" | Guide config → start submitting |
| "提交到所有免费站" / "Submit to all free sites" | Filter 259 targets → batch submit |
| "这个站能提交吗？[URL]" | Scout the site, analyze form |
| "提交情况" / "Status" | Show submission history |
| "帮我生成 awesome-list 提交" | Generate GitHub Issue body |
| "提交到 saashub" / "Submit to saashub" | Submit to specific site |
| "外链策略建议" / "Backlink strategy" | Give strategic advice |

### Troubleshooting with Claude

If something goes wrong, just tell Claude:

```
你：Chrome 连不上怎么办
你：提交失败了，报错 xxx
你：这个站要登录怎么办
```

Claude knows all the troubleshooting steps from `CLAUDE.md`.

---

## B. CLI Manual

> **Prerequisites:** [Node.js 18+](https://nodejs.org/) + [bb-browser](https://github.com/niciral/bb-browser) (recommended)

### 1. Install

```bash
git clone https://github.com/s87343472/backlink-pilot.git
cd backlink-pilot
npm install
```

### 2. Install bb-browser

```bash
npm install -g bb-browser
bb-browser --version    # should show 0.10.x+
```

bb-browser uses your real Chrome — bypasses all anti-bot detection, Cloudflare, and OAuth.

bb-browser 用真实 Chrome，绕过所有反爬检测。

### 3. Configure

```bash
cp config.example.yaml config.yaml
```

Edit `config.yaml`:

```yaml
product:
  name: "Your Product Name"              # 产品名
  url: "https://your-product.com"        # 产品 URL
  description: "One-line description"     # 一句话描述（<160字符）
  long_description: |                     # 详细描述（2-3句）
    Your product helps [audience] do [thing].
    It features [key features].
  email: "hello@your-product.com"        # 联系邮箱
  categories: [developer-tools]           # 分类
  pricing: free                           # free | freemium | paid

browser:
  engine: bb                              # 推荐用 bb

utm:
  enabled: true                           # false = 不加 UTM 参数
  base_url: "https://your-product.com"
```

### 4. Start Chrome

```bash
bb-browser open about:blank
```

If it errors:
```bash
pkill -f "bb-browser" || true
bb-browser open about:blank
```

### 5. Submit

#### Submit to a specific site

```bash
# Known adapter
node src/cli.js submit saashub --engine bb

# Any directory URL (generic adapter)
node src/cli.js submit https://any-directory.com/submit --engine bb
```

#### Submit to multiple sites

```bash
# One by one, with 1-3 minute gaps
node src/cli.js submit saashub --engine bb
# wait 1-2 minutes...
node src/cli.js submit uneed --engine bb
# wait 1-2 minutes...
node src/cli.js submit startup88 --engine bb
```

#### Batch blog comments

```bash
# Dry run first
node src/batch-submit.js --dry-run --limit 5

# Real run
node src/batch-submit.js --limit 10 --engine bb
```

### 6. Other Commands

```bash
# Scout a new site — discover form fields
node src/cli.js scout https://new-site.com --deep

# Generate awesome-list GitHub Issue body
node src/cli.js awesome awesome-cloudflare

# Ping search engines about new pages
node src/cli.js indexnow https://your-site.com --key YOUR_KEY

# Check submission history
node src/cli.js status

# Update bb-browser community adapters
node src/cli.js bb-update
```

### 7. Site Adapters

Built-in adapters (in `src/sites/`):

| Adapter | Site | Notes |
|---------|------|-------|
| `generic` | Any URL | Universal, works with bb-browser |
| `saashub` | saashub.com | SaaS directory |
| `uneed` | uneed.best | Tools (DR 72) |
| `baitools` | baitools.com | AI tools |
| `startup88` | startup88.com | Startup directory |

For any site without a dedicated adapter, just use the URL directly:

```bash
node src/cli.js submit https://any-site.com/submit --engine bb
```

### 8. Target Sites Database

`targets.yaml` contains 259 directory sites. Filter by:

| Field | Values | Meaning |
|-------|--------|---------|
| `auto` | yes / no | Can be auto-submitted |
| `status` | (empty) / dead / paid | Site status |
| `type` | form / github / email | Submission method |
| `lang` | en / zh | Language |

Quick counts:
- **226** auto-submittable (`auto: yes`)
- **44** confirmed dead (`status: dead`)
- **~15** paid only (`status: paid`)

---

## C. OpenClaw Skill

> **Prerequisites:** [OpenClaw](https://openclaw.ai) installed

### 1. Link the skill

```bash
ln -s ~/path/to/backlink-pilot ~/.openclaw/skills/backlink-pilot
```

### 2. Talk to your Agent

| Say | Agent does |
|-----|-----------|
| "Submit to free directories" | Config → submit to all free sites |
| "Submit to saashub" | Submit to specific site |
| "Scout https://site.com" | Analyze site's form |
| "Show backlink status" | Show submission history |
| "Generate awesome-cloudflare submission" | Create GitHub Issue body |

---

## Key Rules / 重要规则

1. **Never submit the same product to the same site twice**
   - Check `node src/cli.js status` first
   - The tracker auto-deduplicates

2. **Pace your submissions**
   - 1-3 minutes between different sites
   - 5-10 submissions per day max
   - 30-60 minute wait before retrying same site

3. **Always use bb-browser**
   - `--engine bb` or set `browser.engine: bb` in config
   - Playwright gets blocked by most modern anti-bot systems

4. **Check before submitting**
   - v2.1 has pre-flight HTTP checks (auto-skips 404/500)
   - Some sites require manual Google login first: `bb-browser open https://accounts.google.com`

5. **Screenshots are your proof**
   - Saved to `./screenshots/` automatically
   - Verify submissions worked as expected

---

## Error Reference / 常见错误

| Error | Cause | Fix |
|-------|-------|-----|
| "bb-browser cannot connect to Chrome" | Chrome not running | `bb-browser open about:blank` |
| "Chrome may be unresponsive" | Stuck Chrome process | Kill Chrome → restart |
| "404 — submit page gone" | Site changed URL | Visit root domain manually |
| "Page redirected to login" | Site requires account | Login first or skip |
| "No recognizable form fields" | Generic adapter can't parse | `scout <url> --deep` first |
| "CAPTCHA detected" | Site has CAPTCHA | Color CAPTCHAs auto-solved; others skip |
| "UTM params rejected" | Site rejects query params | Set `utm.enabled: false` in config |

> Full troubleshooting notes: [troubleshooting.md](./troubleshooting.md)

---

## File Reference / 文件说明

```
config.yaml              ← Your product config (gitignored, private)
config.example.yaml      ← Template to copy from
targets.yaml             ← 259 target sites with status metadata
submissions.yaml         ← Auto-generated submission history

src/cli.js               ← CLI entry point (all commands)
src/submit.js            ← Submission dispatcher + pre-flight checks
src/bb.js                ← bb-browser wrapper (BbPage API)
src/browser.js           ← Dual-engine manager (bb + playwright)
src/sites/generic.js     ← Universal adapter for any directory
src/sites/*.js           ← Site-specific adapters
src/scout/discover.js    ← Form field discovery
src/captcha.js           ← CAPTCHA solvers
src/tracker.js           ← Submission dedup tracking
src/indexnow.js          ← Search engine ping
src/batch-submit.js      ← Batch blog comment submitter

CLAUDE.md                ← Instructions for Claude Code AI agent
docs/                    ← Documentation site (VitePress)
```

---

## Daily Workflow Example / 日常工作流

```bash
# Morning — check what's been submitted
node src/cli.js status

# Find 5 new sites from targets.yaml to submit today
# 从 targets.yaml 找 5 个今天要提交的站

# Start Chrome
bb-browser open about:blank

# Submit one by one with gaps
node src/cli.js submit saashub --engine bb
# wait 2 min...
node src/cli.js submit https://findmyaitool.com/submit --engine bb
# wait 2 min...
node src/cli.js submit https://toolpilot.ai/submit --engine bb

# End of session — check results
node src/cli.js status
```

Or with Claude Code:

```
你：今天帮我提交 5 个免费站，从上次没提交过的开始
Claude：好的，让我查看提交记录... 找到 5 个新站点，开始提交...
```

---

**GitHub:** [github.com/s87343472/backlink-pilot](https://github.com/s87343472/backlink-pilot)
