# DRsubmission

**A fork of [Backlink Pilot](https://github.com/s87343472/backlink-pilot)** — automated directory submission for indie products, with a curated target list and a batch runner that was tested against live sites.

Original project: **[sagasu / Backlink Pilot v2.1](https://github.com/s87343472/backlink-pilot)** (MIT). This repository keeps that license and copyright. See [Credits](#credits--license).

[中文文档（upstream）](README.zh.md)

---

## What this fork changes

Upstream shipped **259 sites** in `targets.yaml` and advertised **226 auto-submittable**. Many of those URLs were already marked dead, required a login, charged a fee, or had no recognisable submit form when we actually opened them.

This fork:

1. **Curates the list.** Dead, paid, login-walled, and no-form sites were removed after live runs. **82 auto form targets** remain (plus manual communities / GitHub / Reddit that we never claimed to automate).
2. **Adds a batch runner** (`run`) so you do not type one command per directory. It walks `targets.yaml` in order, continues after failures, and writes a report.
3. **Fixes bb-browser 0.14.** The original wrapper expected an older CLI (`Tab ID:`, `snapshot`, commands without `--tab`). Current bb-browser requires `--tab`, `snap`, and a different snapshot format.
4. **Tracks per product.** Switching `config.yaml` to a new product does not skip directories already used for a different URL.

We curated because an untested 259-site list wastes hours on 404s, Stripe checkouts, and account walls. Fewer sites that we have **opened** is more useful than a larger list we have not.

---

## Honest status of the 82 directories

**Do not treat all 82 as working listings.** We have not confirmed that any directory published a live page for our products.

What we *did* measure (last run: October 2026, generic adapter, `engine: bb`):

| Evidence | Count | What it means |
|----------|------:|---------------|
| Form filled and submit clicked | **70** | Page loaded, fields detected, submit control clicked. Most directories still **review by hand**. Listing live: **not verified**. |
| Form filled, no submit button found | **4** of those 70 | Fields filled; a human may need to click submit. |
| Chrome / bb-browser timeout | **8** | Load or click timed out. Not confirmed. Retry. |
| Still listed but last attempt failed | **4** | Login wall or no usable form on the last try. |
| Live listing found on the directory | **0 verified** | We did not crawl each directory afterwards to confirm a published listing. |

Every automated success message is `Generic submission completed — verify manually`. Check confirmation email and the directory itself.

Full per-site log: [Verification](#verification-82-auto-form-targets).

---

## How to use it

Requires Node 18+ and Chrome. `config.yaml` is gitignored — copy the example.

```bash
git clone https://github.com/Mimimiraclez/DRsubmission.git
cd DRsubmission && npm install
npm install -g bb-browser

cp config.example.yaml config.yaml   # product name, URL, descriptions, email
bb-browser open about:blank          # start real Chrome once

# One directory
node src/cli.js submit https://www.futuretools.io/submit-a-tool --engine bb

# Every remaining untried auto target (skips sites that already failed)
node src/cli.js run --engine bb
node src/cli.js run --dry-run --verbose     # preview the queue
node src/cli.js report                      # rebuild success/failure report
```

Preview a site before submitting:

```bash
node src/cli.js scout https://example.com/submit --engine bb
```

Upstream extras still work: `awesome`, `indexnow`, `status`, `bb-update`, `src/batch-submit.js`.

Pacing defaults to 1 minute between sites (`config.yaml` → `pacing.min_interval_ms`). A full pass over ~80 sites is a bit over an hour. Ctrl+C finishes the current site and writes `reports/run-*.md`.

---

## Why the list looks like this

| Keep | Drop |
|------|------|
| `auto: yes`, `type: form`, page loaded, form fields we can fill | `status: dead` / `paid` / login URL |
| Free submit (or free-with-review) | Notes or URL that are login, pricing, `/account`, `/me/` |
| Sheet imports that survived the same filters | Type `Others` (GitHub, Trustpilot, HN, …) |

Upstream already marked many sites `dead` from a March 2026 check. Live runs in October 2026 removed more: 404/SSL/expired domains, payment pages, login redirects, and pages with no fillable form.

New directories were imported from a public “SEO Mode ALL DATABASE” sheet, then filtered the same way (Free + submit URL + not already in the list + no login/paid notes). Login/paid sheet rows were deleted before they were queued.

---

## Changelog (this fork)

### Added

- `node src/cli.js run` — sequential batch over `targets.yaml`; continues on failure; report after every site
- `node src/cli.js prune` — mark or delete permanently failed targets (`--delete`, `--sheet-only`, `--include-no-form`)
- `node src/cli.js report` — rebuild a report from `submissions.yaml` (survives a killed terminal)
- Product field on each tracker entry so two products do not share “already submitted”
- Generic adapter: bb-browser 0.14 snapshot format (`textbox [ref=N]`), `--tab` on every command, `snap` instead of `snapshot`, Chinese labels (名称/链接/简介/提交), example URL/email placeholders, embedded Tally/Typeform/Paperform/Google Forms
- Sheet categories: `sheet_general_directories`, `sheet_ai_saas_directories`

### Removed from `targets.yaml` (not a complete dump of every row)

**Paid / checkout:** dang.ai, Uneed, IndieProducts, Deal Mirror, ReviewAI, Noxilo, AI Marketing Directory, AI ToolBoard, Simple Lister, Indie Tools, Fund a Maker, Cipinet, SpotTheAI, DigiProToolz, Ai Business Tool, Free Directory, Tools No-Code, SaaS AI Tools (`select-listing-type`), and others classified as payment pages during the run.

**Login / account:** Brown Book, Activ Directory, F6s, StackShare, PeerList, IndieHackerStacks (`/me/products/`), Betalist, MakerPeak, SourceForge, FuturePedia (submit now login), BensBites, Promote Project, WhatTheAI, The Hack Stack, AI Generation, Maker Launch Deals, Awseomeindie, and others that redirected to sign-in.

**Dead / 404 / SSL / expired:** Futurepedia (already marked), AI Finder, 映技派, 深度AI导航, Dizila, Toolsummary, Insane AI Tools (expired domain), Noteable AI Tools, Ctrlalt, Techyuni, AI Tools Board, GrowthBoosters (403), AI NAV / 94kan (privacy error), osalt.com, 一网一匠 (522), plus upstream `status: dead` rows that stayed marked or were later deleted.

**No usable form** (page loaded, adapter could not fill a product form): ~120 URLs pruned after snapshots showed search boxes, homepages, or comment widgets instead of submit fields — including WhatLaunched.Today (own product), PoweredbyAI, ToolPilot, aitoolhunt, techdirectory.io (removed by hand during a later run).

**Replacements added** (then re-filtered): 93 sheet rows (18 general + 75 AI/SaaS). After dropping login/paid heuristics and failed runs, **32 sheet sites** remain in the 82.

### Improved

- `utm_source` is the directory hostname, not the full submit URL
- `run` skips previously failed sites by default (`--retry-failed` to override); timeouts are treated as retryable
- Reports written after every site so a closed laptop does not lose the success list
- Field scoring prefers “Tool Name” over “Your Name”, and the real 提交 button over nav links / 付费提交

Numbers: upstream **259** listed → this tree **157** total entries (including still-marked dead/manual) → **82** auto form targets we actually queue.

---

## Verification (82 auto form targets)

Columns:

- **Loads** — did Chrome reach a document (not 404/SSL at last attempt)
- **Accepts submissions** — did we fill fields and click submit (or fail to)
- **Manual review** — assumed yes unless the site said otherwise; we did not wait for editorial approval
- **Live listing** — whether we found a published directory page afterwards. **None verified.**

| Site | Loads | Accepts submissions | Manual review | Live listing |
|------|-------|---------------------|---------------|--------------|
| Future Tools | yes | form filled & submit clicked | typical | not verified |
| AI Valley | yes | form filled & submit clicked | typical | not verified |
| AIToolsDirectory | yes | form filled & submit clicked | typical | not verified |
| AI Directory | yes | form filled & submit clicked | typical | not verified |
| AIFINDY | yes | form filled & submit clicked | typical | not verified |
| AI Library | yes | form filled & submit clicked | typical | not verified |
| AIToolGuru | timeout | not confirmed | typical | not verified |
| AI Tools Up | yes | form filled & submit clicked | typical | not verified |
| Apps and Websites | yes | form filled & submit clicked | typical | not verified |
| DropYourAI | yes | form filled & submit clicked | typical | not verified |
| Free AI Tools Directory | yes | form filled & submit clicked | typical | not verified |
| Human or Not | yes | form filled & submit clicked | typical | not verified |
| Insidr.ai | yes | form filled & submit clicked | typical | not verified |
| Super AI Tools | yes | form filled & submit clicked | typical | not verified |
| aitoolslist.io | timeout | not confirmed | typical | not verified |
| AI Tools Masters | yes | form filled & submit clicked | typical | not verified |
| ToolsFine | yes | form filled & submit clicked | typical | not verified |
| App Rater | yes | form filled & submit clicked | typical | not verified |
| Appoid | yes | form filled & submit clicked | typical | not verified |
| Digital Stuff We Love | yes | form filled & submit clicked | typical | not verified |
| Startup Collections | yes | form filled & submit clicked | typical | not verified |
| WebsiteHunt | yes | form filled & submit clicked | typical | not verified |
| Twelve.tools | yes | form filled & submit clicked | typical | not verified |
| AppsThunder | yes | form filled & submit clicked | typical | not verified |
| Viesearch | yes | form filled & submit clicked | typical | not verified |
| OnToplist.com | yes | form filled & submit clicked | typical | not verified |
| Offpagesavvy | yes | form filled & submit clicked | typical | not verified |
| Unmatched Style | yes | form filled & submit clicked | typical | not verified |
| 9Sites.net | yes | form filled; **no submit button** | typical | not verified |
| All States USA Directory | yes | form filled & submit clicked | typical | not verified |
| Highrankdirectory | yes | form filled & submit clicked | typical | not verified |
| Sonic Run | yes | form filled & submit clicked | typical | not verified |
| Site Promotion Directory | yes | form filled & submit clicked | typical | not verified |
| Marketing Internet Directory | yes | form filled & submit clicked | typical | not verified |
| ProLinkDirectory | yes | form filled & submit clicked | typical | not verified |
| Jayde | yes | form filled & submit clicked | typical | not verified |
| Free PR Web Directory | yes | form filled & submit clicked | typical | not verified |
| Free Internet Web Directory | yes | form filled & submit clicked | typical | not verified |
| Quality Internet Directory | yes | form filled & submit clicked | typical | not verified |
| UK Internet Directory | yes | form filled & submit clicked | typical | not verified |
| USA Websites Directory | yes | form filled & submit clicked | typical | not verified |
| 工具达人AI导航 | yes | form filled & submit clicked | typical | not verified |
| Cooltools | yes | form filled & submit clicked | typical | not verified |
| iforai | yes | form filled & submit clicked | typical | not verified |
| 海外导航网 | yes | form filled & submit clicked | typical | not verified |
| 智鹭AI | yes | form filled & submit clicked | typical | not verified |
| Mergeek | yes | **no usable form** on last try | typical | not verified |
| 名站在线 | timeout | not confirmed | typical | not verified |
| 63243网址导航 | timeout | not confirmed | typical | not verified |
| 小木屋 | yes | form filled & submit clicked | typical | not verified |
| ExactSeek | timeout | not confirmed | typical | not verified |
| Link Centre | yes | form filled & submit clicked | typical | not verified |
| Post Free Directory | timeout | not confirmed | typical | not verified |
| AI123.cn | yes | form filled & submit clicked | typical | not verified |
| Websquash | yes | form filled & submit clicked | typical | not verified |
| Fivetaco | yes | form filled & submit clicked | typical | not verified |
| 10015 | yes | form filled & submit clicked | typical | not verified |
| BAI.tools | yes | form filled & submit clicked | typical | not verified |
| AI Startups | yes | form filled & submit clicked | typical | not verified |
| StartupTracker | yes | form filled; **no submit button** | typical | not verified |
| ScriptByAI | yes | form filled & submit clicked | typical | not verified |
| AI NavHub | yes | form filled & submit clicked | typical | not verified |
| AlphaDigits | yes | form filled & submit clicked | typical | not verified |
| IABOXTOOL | yes | form filled; **no submit button** | typical | not verified |
| ai.dreamthere.cn | yes | form filled & submit clicked | typical | not verified |
| The AI Navigator | yes | **no usable form** on last try | typical | not verified |
| AINave | yes | **no usable form** on last try | typical | not verified |
| VerySaaS | yes | form filled; **no submit button** | typical | not verified |
| AItoGrow | yes | form filled & submit clicked | typical | not verified |
| Landing Page Tools | yes | form filled & submit clicked | typical | not verified |
| FindTools.ai | yes | form filled & submit clicked | typical | not verified |
| ListedAI | timeout | not confirmed | typical | not verified |
| FuturePedia | yes | **login required** | typical | not verified |
| SaaS Radius | yes | form filled & submit clicked | typical | not verified |
| Daily Zaps Picks | yes | form filled & submit clicked | typical | not verified |
| Businesstoolvault | yes | form filled & submit clicked | typical | not verified |
| InfraBase.ai | yes | form filled & submit clicked | typical | not verified |
| ToolAssistant | yes | form filled & submit clicked | typical | not verified |
| Feedback Tools | yes | form filled & submit clicked | typical | not verified |
| AutoAI's | timeout | not confirmed | typical | not verified |
| Liteworker | yes | form filled & submit clicked | typical | not verified |
| AI Tools for 100x Growth | yes | form filled & submit clicked | typical | not verified |

Retry timeouts: `node src/cli.js run --engine bb` (timeouts are not treated as permanent failures). Drop login/no-form leftovers: `node src/cli.js prune --delete --include-no-form`.

---

## Commands

```bash
node src/cli.js submit <site-or-url>     # one directory
node src/cli.js run [--limit N]          # untried auto targets (skips hard failures)
node src/cli.js prune --delete           # remove dead/paid/login from targets.yaml
node src/cli.js report [--since DATE]    # rebuild report from submissions.yaml
node src/cli.js scout <url> --deep       # discover fields
node src/cli.js awesome <repo>           # awesome-list Issue body
node src/cli.js indexnow <url>           # ping search engines
node src/cli.js status                   # tracker summary
node src/cli.js bb-update                # bb-browser community adapters
node src/batch-submit.js --limit N       # blog comments (upstream)
```

`--engine bb` is recommended (real Chrome). Playwright is easier to set up and easier for anti-bot to block.

---

## Project layout

```
DRsubmission/
├── README.md                  ← this fork’s documentation
├── README.zh.md               ← upstream Chinese docs
├── CLAUDE.md                  ← agent instructions (partially updated)
├── LICENSE                    ← MIT (sagasu + fork notice)
├── config.example.yaml
├── targets.yaml               ← curated list (82 auto form targets)
├── src/cli.js                 ← CLI
├── src/run.js                 ← batch run / prune / report (fork)
├── src/bb.js                  ← bb-browser 0.14 wrapper (fork)
├── src/sites/generic.js       ← universal form adapter (fork)
└── tests/
```

`config.yaml`, `submissions.yaml`, `screenshots/`, and `reports/` are gitignored.

---

## Credits & license

This project **builds on [Backlink Pilot](https://github.com/s87343472/backlink-pilot)** by **[sagasu](https://github.com/s87343472)** (`sagasu` in the original LICENSE). Upstream README credits [OpenClaw](https://openclaw.ai), [bb-browser](https://github.com/niciral/bb-browser), and [rebrowser-playwright](https://github.com/nickthecoder/rebrowser-playwright). Target metadata originally drew from [1000UserGuide](https://github.com/naxiaoduo/1000UserGuide).

The original repository is **MIT-licensed**, which allows modification and redistribution as long as the copyright notice and permission notice are kept. This fork retains the MIT license and the original copyright, and adds a line for later modifications:

```
Copyright (c) 2026 sagasu
Copyright (c) 2026 Mimimiraclez (modifications)
```

See [LICENSE](LICENSE).

If you only need the original tool, use [github.com/s87343472/backlink-pilot](https://github.com/s87343472/backlink-pilot).
