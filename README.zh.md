# Backlink Pilot v2.1

**[English](README.md)**

<p align="center">
  <img src="docs/overview.zh.svg" alt="Backlink Pilot v2.1 概览" width="100%"/>
</p>

**一条命令提交外链的自动化工具。** 配置一次产品信息，自动提交到目录站、awesome-list、搜索引擎。

> 由 AI Agent ([OpenClaw](https://openclaw.ai)) 在真实外链建设中构建，30+ 站点实战验证。

[`targets.yaml`](targets.yaml) 收录 **259 个目标站点**，其中 226 个可用 bb-browser 自动提交。

---

## 最快上手 — Claude Code（推荐）

> 有 Claude Code？**不需要看下面任何文档。** 三步搞定：

```bash
git clone https://github.com/s87343472/backlink-pilot.git
cd backlink-pilot && npm install
claude    # 打开 Claude Code，直接说「帮我提交外链」
```

Claude 自动读取 `CLAUDE.md`，引导你配置产品信息、安装 bb-browser、开始提交。

详细教程：[docs/tutorial.md](docs/tutorial.md) | 完整指南：[docs/guide.md](docs/guide.md)

---

## 手动快速开始

```bash
# 1. 克隆安装
git clone https://github.com/s87343472/backlink-pilot.git
cd backlink-pilot && npm install

# 2. 安装 bb-browser（推荐）
npm install -g bb-browser

# 3. 配置产品信息
cp config.example.yaml config.yaml
# 编辑 config.yaml，填入产品名、网址、描述

# 4. 开始提交
node src/cli.js submit futuretools --engine bb
node src/cli.js submit https://any-site.com --engine bb
```

---

## 引擎对比

| 引擎 | 安装 | 优点 | 缺点 |
|------|------|------|------|
| **bb-browser**（推荐） | `npm i -g bb-browser` | 真实 Chrome，100% 隐身，支持 OAuth | 需要 Chrome |
| **playwright**（默认） | `npm install` | 零配置 | 被反爬检测，Cloudflare 拦截 |

---

## 命令速查

```bash
node src/cli.js submit <站点名或URL>     # 提交到目录站
node src/cli.js scout <URL> --deep       # 侦察站点表单
node src/cli.js awesome <仓库名>          # 生成 awesome-list Issue
node src/cli.js indexnow <URL>           # 通知搜索引擎
node src/cli.js status                   # 查看提交记录
node src/cli.js bb-update                # 更新 bb-browser 适配器
node src/batch-submit.js --limit N       # 批量博客评论
```

---

## 外链策略

**为什么要做外链？** Google 排名逻辑 = 别的网站链接到你 = 投票。票越多、来源越权威，排名越高。

### 最佳渠道（按 ROI 排序）

1. **GitHub awesome-lists** — 最高 ROI，永久收录，$0，每个 5 分钟
2. **免费目录站** — `targets.yaml` 收录 259 个，大部分可自动提交
3. **博客评论** — Website 字段留链接，批量自动化

### 提交节奏

- 不同站点间隔 1-3 分钟，每天 5-10 个
- **同一产品不要重复提交到同一站点**

### 避坑清单

| 站点 | 原因 |
|------|------|
| IndieHub | 看起来免费，发布要 $4.9 |
| OpenHunts | 免费排队 51 周 |
| toolify.ai | $99 |
| Product Hunt | 反爬机制，只能手动 |

---

## Agent 集成

### Claude Code

克隆仓库 → 运行 `claude` → 直接对话。`CLAUDE.md` 是 AI 的操作手册，Claude 自动读取。

### OpenClaw

```bash
ln -s ~/path/to/backlink-pilot ~/.openclaw/skills/backlink-pilot
```

然后说：「帮我提交外链」

---

## 项目结构

```
backlink-pilot/
├── README.md                  ← 英文文档
├── README.zh.md               ← 你在这里
├── CLAUDE.md                  ← Claude Code 指令
├── LICENSE
├── package.json
├── config.example.yaml        ← 配置模板
├── targets.yaml               ← 259 个目标站点
│
├── docs/                      ← 文档
│   ├── index.md               ← 文档首页（VitePress）
│   ├── guide.md               ← 完整使用指南
│   ├── tutorial.md            ← 上手教程
│   ├── troubleshooting.md     ← 20+ 排错记录
│   ├── adapters.md            ← 适配器参考
│   ├── contributing.md        ← 贡献指南
│   └── skill.md               ← OpenClaw 技能定义
│
├── src/                       ← 源码
│   ├── cli.js                 ← 命令行入口
│   ├── submit.js              ← 提交调度器
│   ├── bb.js                  ← bb-browser 封装
│   ├── browser.js             ← 双引擎管理
│   ├── config.js              ← 配置加载 + UTM
│   ├── tracker.js             ← 提交去重追踪
│   ├── captcha.js             ← 验证码解决器
│   ├── indexnow.js            ← 搜索引擎通知
│   ├── batch-submit.js        ← 批量博客评论
│   ├── bb-update.js           ← bb-browser 适配器更新
│   ├── sites/                 ← 站点适配器
│   │   ├── generic.js         ← 通用适配器
│   │   ├── saashub.js
│   │   ├── uneed.js
│   │   ├── baitools.js
│   │   └── startup88.js
│   ├── scout/discover.js      ← 表单字段发现
│   └── awesome/templates.js   ← Awesome-list Issue 生成器
│
├── tests/                     ← 测试
└── bak/                       ← 废弃代码（不上传）
```

---

## 开发者

### 写新适配器

```bash
# 方式 1：通用提交（不用写代码）
node src/cli.js submit https://new-site.com/submit --engine bb

# 方式 2：自定义适配器
node src/cli.js scout https://new-site.com --deep
# 然后创建 src/sites/newsite.js — 参考 docs/adapters.md
```

### 运行测试

```bash
npm test
```

> 完整排错记录：[docs/troubleshooting.md](docs/troubleshooting.md)

---

## 贡献

参见 [docs/contributing.md](docs/contributing.md)。欢迎 PR：新适配器、验证码改进、Bug 修复。

## 许可证

MIT

## 致谢

使用 [OpenClaw](https://openclaw.ai) 构建。浏览器自动化：[bb-browser](https://github.com/niciral/bb-browser)、[rebrowser-playwright](https://github.com/nickthecoder/rebrowser-playwright)。
