# Troubleshooting & Lessons Learned

Real-world lessons from 20+ directory site submissions, 13 bot detection tests, and hundreds of browser automation attempts.

## Browser Automation

### OpenClaw Browser vs rebrowser-playwright

OpenClaw has a built-in browser tool (`browser` action), but it's **easily detected** by bot-protection systems. rebrowser-playwright patches Chromium at a deeper level.

**Decision tree:**
```
Need browser automation?
├── Target site loads fine → Use OpenClaw browser (simpler, no extra deps)
├── Site returns 403 / Cloudflare challenge → Try rebrowser
│   ├── rebrowser works → Use it
│   └── Cloudflare Turnstile → ❌ Give up, mark as manual-only
└── Need to fill forms → rebrowser (more reliable for form interaction)
```

**OpenClaw browser gotchas:**
- `browser(action="fill")` requires a `fields` array — use `click` + `type` instead
- Always pass `compact: true, maxChars: 1500` for snapshots — full DOM kills AI context window
- Default profile is `openclaw` (isolated Chromium on port 18800)
- `chrome` profile (port 18792) controls user's actual Chrome via relay extension — only use when user explicitly says to

### rebrowser Anti-Detection

What passes:
- `navigator.webdriver` → `undefined` ✅
- `window.chrome` → exists ✅  
- Plugins array → populated ✅
- Languages → populated ✅
- WebDriver (legacy) → not detected ✅

What fails:
- WebDriver (New) flag on sannysoft — one red item, but most sites don't check this

**Our stealth setup:**
```javascript
const context = await browser.newContext({
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...',
  viewport: { width: 1440, height: 900 },
  locale: 'en-US',
  timezoneId: 'America/New_York',
});

// Critical: override webdriver flag
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  if (!window.chrome) {
    window.chrome = { runtime: { connect: () => {}, sendMessage: () => {} } };
  }
});
```

### Cloudflare is the Hard Wall

Three levels of Cloudflare protection we encountered:

1. **Basic WAF (403)** — rebrowser bypasses this ✅
2. **Cloudflare Challenge page** — rebrowser can't solve ❌ (AlternativeTo, ProductHunt, startupbuffer, aidirs.org)
3. **Cloudflare Turnstile CAPTCHA** — nobody can automate this ❌

**Strategy:** Skip Cloudflare Challenge sites entirely. Mark as manual-only.

### Color CAPTCHA Solving

Some sites (submitaitools.org) use simple color CAPTCHAs: *"Click the button with the teal color"*

**Solution:** Read the instruction text → extract color name → click matching button.

```javascript
const text = await page.textContent('body');
const match = text.match(/Click the button with the\s+(\w+)\s+color/i);
if (match) {
  const color = match[1];
  // Match by button text content
  await page.click(`button:has-text("${color}")`);
}
```

This is **not** image recognition — it's text parsing. Works 100% of the time on these simple CAPTCHAs.

### Google OAuth Automation

**First login** requires:
1. Email input → password → 2FA (user must approve on phone)
2. This is unavoidable — agent can't do 2FA alone

**Subsequent logins** on other sites:
- Google remembers the session in the browser context
- Other sites' "Login with Google" → auto-selects the cached account
- No 2FA needed again (until session expires)

**Lesson:** Do all Google OAuth sites in one session after the first 2FA approval.

**Gotcha:** headless browsers don't persist Google sessions across runs. Each new `chromium.launch()` starts fresh. Options:
- Use `storageState` to save/restore cookies
- Do all Google OAuth submissions in one browser session

### Form Filling Patterns

**What works:**
```javascript
// Click first, then fill — more reliable than direct fill
await page.click('input[name="url"]');
await delay(200);
await page.fill('input[name="url"]', 'https://mysite.com');
```

**What breaks:**
```javascript
// Direct fill sometimes doesn't trigger React/Vue change handlers
await page.fill('input[name="url"]', 'https://mysite.com');
// ↑ Field looks filled but form submission sends empty value
```

**Human-like typing for suspicious sites:**
```javascript
for (const char of text) {
  await page.type(selector, char, { delay: 30 + Math.random() * 70 });
}
```

### URL Validation Gotchas

- **toolverto.com** rejects URLs with query parameters — submit clean URL without UTM
- Some sites strip `?` params and validate the base domain
- Always have a clean URL fallback: `product.url` (no UTM) alongside `product.utm_url`

### Date Picker Automation

**ctrlalt.cc** uses flatpickr date picker — couldn't automate it:
- `.fill()` doesn't work (read-only input)
- `.click()` opens the calendar but selecting dates requires precise coordinate clicking
- flatpickr intercepts keyboard input

**Lesson:** Custom JS date pickers are a common automation wall. Skip or use `page.evaluate()` to set the value directly:
```javascript
await page.evaluate(() => {
  document.querySelector('input.flatpickr').value = '2026-03-01';
  document.querySelector('input.flatpickr').dispatchEvent(new Event('change'));
});
```

### Reddit is a Dead End

Even with rebrowser + all stealth patches:
- Reddit blocks at the **network level** — returns "blocked by network security" before any page loads
- Not a browser detection issue — it's IP/ASN-level blocking of datacenter IPs
- **Conclusion:** Reddit posts must be done manually by the user

## Sub-Agent Pitfalls

### Workspace Path Mismatch

Sub-agents run in `~/.openclaw/workspace/`, NOT in your project directory.

**Problem:** Sub-agent writes files to workspace, but your project is at `~/Downloads/my-project/`.

**Solution:** Always include explicit `cp` commands in sub-agent tasks:
```
Task: "Edit the file, build, then cp the result to ~/Downloads/my-project/"
```

Or have the sub-agent `cd` to the project directory first.

### Gemini Sub-Agents Can't Use Browser

Gemini (`google/gemini-3-pro-preview`) sub-agents **cannot operate the browser tool**. They time out or produce empty output when asked to take screenshots or interact with web pages.

**Rule:** Use Gemini for text-only tasks (writing, code generation, analysis). Use Claude for anything involving browser automation.

### Timeout Trap

Sub-agents have a `runTimeoutSeconds` limit. Common failure pattern:

1. Sub-agent starts editing files ✅
2. Runs build to verify ✅
3. Build fails, starts debugging...
4. **TIMEOUT** — files are half-modified, no commit 💀

**Lessons:**
- One sub-agent = one small task (user explicitly warned: "sub-agent很容易超时")
- Always budget 2x the time you think you need
- **Verify build after sub-agent edits** — they may leave broken code
- Use `exec(background: true)` for CPU-intensive tasks, not sub-agents (sub-agents are LLM sessions, not bare processes)

### Concurrent File Editing

Two sub-agents modifying the same file (e.g., `translations.ts`) will overwrite each other.

**Solution:** Serialize same-file edits, or externalize data to separate JSON files that each sub-agent owns.

### The `};` Bug

Sub-agents adding entries to JavaScript objects sometimes forget the closing `};`. This breaks the build silently or with cryptic errors.

**Always:** Run the build after any sub-agent file edits and check for syntax errors.

## Site-Specific Notes

### Sites That Look Free But Aren't

| Site | Bait | Reality |
|------|------|---------|
| IndieHub | "Submit your product free" | Product creation free, **publishing costs $4.9+** |
| OpenHunts | "Free tier available" | Free queue is **51 weeks** |
| toolify.ai | Listed in free directories | **$99 to submit** |
| Creati.ai | Has submit page | **$69 minimum** |

### Sites With Server Issues

- **SeekTool.ai**: Returns "Server error" on their backend. Tried 4 times over 2 days. Not our problem.
- **navaitools.com**: 502 Bad Gateway — site is down
- **aidirs.org**: Cloudflare 403 — blocks all automation

### Submission Pacing

User's guidance: *"不要批量海量的快速提交，而是一点点一点点的提交"*

- Different sites: 1-3 minute intervals (OK)
- Same site retry: 30-60 minute intervals
- Same site resubmission: **Never** (you'll get blacklisted)

### UTM Tracking

All submitted URLs should include UTM parameters for GA4 tracking:
```
?utm_source={site}&utm_medium=directory&utm_campaign=listing
```

**Exception:** Sites that validate/reject URLs with query parameters (toolverto). Submit clean URL for those.

## Playwright Installation in China

`cdn.playwright.dev` downloads at ~0% from mainland China.

**Workaround:**
1. Use Google Storage CDN: `storage.googleapis.com/chrome-for-testing-public/`
2. Download the Chromium zip manually
3. Extract to `~/Library/Caches/ms-playwright/chromium-{version}/`

**Do NOT** use npmmirror — they 404 on newer Playwright versions.

## Email for Agent Registration

Many directory sites require email verification. Our setup:

1. **Dedicated Gmail account** for the agent (with App Password for SMTP)
2. **Cloudflare Email Routing**: `agent@yourdomain.com` → forwards to Gmail
3. **Python helper script** for send/read/search (IMAP + SMTP)
4. **IMAP works reliably**, SMTP can be intermittent (SSL issues depending on network)

**Gotcha:** Himalaya CLI's SMTP is broken (TLS handshake failure). Use the Python script instead.

## What We'd Do Differently

1. **Start with rebrowser from day one** — wasted time trying OpenClaw browser on sites that block it
2. **Build the config-driven approach first** — started with hardcoded scripts, had to refactor everything
3. **Scout before submitting** — several sites wasted 10+ minutes before discovering they're paid-only
4. **Google OAuth in batch** — do all OAuth sites in one session after the first 2FA
5. **Track everything in YAML from the start** — early submissions weren't tracked properly
