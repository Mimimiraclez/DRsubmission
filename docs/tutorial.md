# Backlink Pilot v2.1 — 上手教程

## 用 Claude Code 三步搞定（推荐）

> 如果你有 [Claude Code](https://claude.ai/code)，你不需要看任何其他文档。Clone 下来，跟 Claude 说话就行。

### Step 1：Clone 项目

```bash
git clone https://github.com/s87343472/backlink-pilot.git
cd backlink-pilot
npm install
```

### Step 2：打开 Claude Code

```bash
claude
```

Claude 会自动读取项目里的 `CLAUDE.md`，了解这个项目是做什么的、怎么用。

### Step 3：直接说话

```
你：帮我把 [你的产品名] 提交到免费目录站
```

Claude 会：
1. 发现你还没有 `config.yaml` → 问你产品信息 → 自动生成配置
2. 检查 bb-browser 是否安装 → 没有的话指导你安装
3. 启动 Chrome → 开始逐个提交
4. 每提交一个给你报告结果

**就这样。不需要读文档，不需要记命令。**

---

## 你可以对 Claude 说什么？

| 你说 | Claude 做什么 |
|------|---------------|
| "帮我提交外链" | 引导配置 → 开始提交 |
| "提交到所有免费站点" | 从 259 个目标里筛选可用的，逐个提交 |
| "这个站能提交吗？https://xxx.com" | 侦察站点，分析表单 |
| "提交情况怎么样了" | 显示历史提交记录 |
| "帮我生成 awesome-list 提交内容" | 生成 GitHub Issue 模板 |
| "Submit my product to free directories" | 同上，英文也行 |

---

## 不用 Claude Code？手动也行

<details>
<summary>点击展开手动教程</summary>

### 1. 安装

```bash
git clone https://github.com/s87343472/backlink-pilot.git
cd backlink-pilot
npm install
npm install -g bb-browser   # 推荐，用真实 Chrome
```

### 2. 配置

```bash
cp config.example.yaml config.yaml
```

编辑 `config.yaml`：

```yaml
product:
  name: "你的产品名"
  url: "https://your-product.com"
  description: "一句话描述你的产品"
  long_description: "2-3句详细描述，说说功能和目标用户"
  email: "your@email.com"
  categories: [developer-tools]  # 或 ai, productivity, design 等
  pricing: free                   # free | freemium | paid

browser:
  engine: bb  # 推荐用 bb，playwright 会被反爬拦截
```

### 3. 启动 Chrome

```bash
bb-browser open about:blank
```

### 4. 提交

```bash
# 提交到单个站点
node src/cli.js submit futuretools --engine bb

# 提交到任意目录站
node src/cli.js submit https://some-directory.com/submit --engine bb

# 查看提交记录
node src/cli.js status
```

### 5. 常用命令速查

```bash
node src/cli.js submit <站点名或URL>  # 提交
node src/cli.js scout <URL> --deep    # 侦察新站点
node src/cli.js awesome <repo名>      # 生成 awesome-list Issue
node src/cli.js indexnow <URL>        # 通知搜索引擎
node src/cli.js status                # 查看记录
node src/cli.js bb-update             # 更新适配器
```

</details>

---

## FAQ

**Q: 需要什么环境？**
- Node.js 18+
- bb-browser（`npm install -g bb-browser`）
- Chrome 浏览器

**Q: 会不会被封？**
- bb-browser 用的是真实 Chrome，不是无头浏览器，基本不会被检测
- 内置节奏控制：站点间隔 1-3 分钟，每天 5-10 个
- 自动去重，不会重复提交

**Q: 支持多少个站点？**
- `targets.yaml` 里有 259 个目标站，226 个可自动提交

**Q: 需要付费吗？**
- 工具本身免费开源（MIT）
- 大部分目标站也是免费的（标记了 `paid` 的会自动跳过）

**Q: OpenClaw 用户怎么用？**
- 把项目链接到 skills 目录：`ln -s ~/Downloads/backlink-pilot ~/.openclaw/skills/backlink-pilot`
- 然后直接跟 Agent 说"帮我提交外链"

---

## 项目结构（给好奇的人看）

```
backlink-pilot/
├── CLAUDE.md              ← Claude Code 读这个来理解项目
├── config.example.yaml    ← 配置模板
├── targets.yaml           ← 259 个目标站点
├── src/
│   ├── cli.js             ← 命令行入口
│   ├── submit.js          ← 提交逻辑
│   ├── bb.js              ← bb-browser 封装
│   ├── sites/generic.js   ← 通用适配器（任何站都能用）
│   └── sites/*.js         ← 特定站点适配器
└── submissions.yaml       ← 提交记录（自动生成）
```

---

**Star the repo** if you find it useful: [github.com/s87343472/backlink-pilot](https://github.com/s87343472/backlink-pilot)
