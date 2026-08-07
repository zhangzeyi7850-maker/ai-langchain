# Matt Pocock `skills` 仓库完整教程

> 项目地址：<https://github.com/mattpocock/skills>  
> 本文基于 2026 年 7 月 24 日对仓库 `main` 分支的整理。仓库迭代较快，未来具体 Skill 名称、目录或流程可能发生调整。

## 目录

- [一、这个仓库是什么](#一这个仓库是什么)
- [二、两种 Skill：用户调用与模型调用](#二两种-skill用户调用与模型调用)
- [三、安装方法](#三安装方法)
- [四、第一次使用：项目初始化](#四第一次使用项目初始化)
- [五、最推荐的整体工作流](#五最推荐的整体工作流)
- [六、17 个 Engineering Skills 详解](#六17-个-engineering-skills-详解)
- [七、5 个 Productivity Skills 详解](#七5-个-productivity-skills-详解)
- [八、四个完整使用示例](#八四个完整使用示例)
- [九、其余 19 个非主推 Skill](#九其余-19-个非主推-skill)
- [十、推荐安装组合](#十推荐安装组合)
- [十一、常见错误](#十一常见错误)
- [十二、最终速查表](#十二最终速查表)

---

# 一、这个仓库是什么

Matt Pocock 的 `skills` 仓库不是一套要求你机械照做的“AI 开发提示词合集”，而是一组可以安装到 Claude Code、Codex 等 Agent 环境中的工程工作流。

这些 Skill 尽量保持：

- 小而专注；
- 可修改；
- 可组合；
- 能产生可检查的中间产物；
- 能把需求澄清、领域建模、规格编写、任务拆分、TDD、调试和代码审查等工程实践固化为可重复流程。

当前仓库对外重点推广的稳定版共有 **22 个 Skill**：

- Engineering：17 个；
- Productivity：5 个。

除此之外，仓库中还包含：

- Misc：4 个；
- Personal：2 个；
- In Progress：9 个；
- Deprecated：4 个。

按该版本目录统计，共能看到 **41 个 Skill 目录**。实际安装时，应该优先考虑前面的 22 个稳定版；Misc 和 Personal 没有进入插件主清单，In Progress 仍可能出现破坏性变化，Deprecated 则已经不再推荐使用。

仓库主页：<https://github.com/mattpocock/skills>

---

# 二、两种 Skill：用户调用与模型调用

这是理解整个仓库最重要的概念。

## 2.1 User-invoked：用户显式调用

这类 Skill 只有在你主动输入命令时才运行，例如：

```text
/grill-with-docs
/to-spec
/to-tickets
/implement
```

它们通常负责：

- 启动一个完整流程；
- 编排其他能力；
- 决定接下来应该走哪条路径；
- 产生规格、工单、报告等正式产物。

在 Claude Code 中，这类 Skill 的 `SKILL.md` 通常带有：

```yaml
disable-model-invocation: true
```

在 Codex 的 `agents/openai.yaml` 中，则会使用对应的禁止隐式调用策略。

仓库的整体设计原则可以概括为：

> 用户调用型 Skill 负责流程编排，模型调用型 Skill 负责可复用的工程纪律。

## 2.2 Model-invoked：模型自动调用，也可以手动调用

例如：

```text
/tdd
/diagnosing-bugs
/domain-modeling
/code-review
```

当用户描述的任务符合 Skill 的触发条件时，Agent 可以自动选择这些 Skill；你也可以直接点名调用。

模型调用型 Skill 的 `description` 通常写得更完整，因为 Agent 需要根据描述判断何时使用它。代价是，这些描述会持续占用一部分模型上下文。

用户调用型 Skill 不需要占用这部分自动判断上下文，但用户需要记得命令。仓库通过 `/ask-matt` 这种路由型 Skill，降低了记忆全部命令的负担。

参考：<https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md>

## 2.3 一个重要的组合规则

仓库约定：

- 用户调用型 Skill 可以调用模型调用型 Skill；
- 用户调用型 Skill 不应该在内部直接嵌套另一个用户调用型 Skill；
- 路由 Skill 可以告诉用户接下来应该显式输入哪个命令。

例如：

- `/grill-with-docs` 内部使用 `/grilling` 和 `/domain-modeling`；
- `/implement` 内部使用 `/tdd` 和 `/code-review`；
- `/ask-matt` 会建议你接下来输入 `/to-spec`、`/to-tickets` 或 `/implement`，但这些仍然是后续显式步骤。

---

# 三、安装方法

## 3.1 通用安装：skills.sh

在项目目录中运行：

```bash
npx skills@latest add mattpocock/skills
```

安装器会让你选择：

1. 要安装哪些 Skills；
2. 安装到哪些 Coding Agent；
3. 是否包含 `/setup-matt-pocock-skills`。

建议一定选择：

```text
setup-matt-pocock-skills
```

因为多个工程 Skill 都依赖它生成的项目配置。

`skills.sh` 的方式会把 Skill 文件复制到项目中，因此你可以直接修改、裁剪或扩展这些文件。它也适用于 Codex 和其他支持 Agent Skills 规范的环境。

## 3.2 Claude Code 插件安装

在 Claude Code 内运行：

```text
/plugin marketplace add mattpocock/skills
/plugin install mattpocock-skills@mattpocock
```

也可以在终端中执行：

```bash
claude plugin marketplace add mattpocock/skills
claude plugin install mattpocock-skills@mattpocock
```

两种安装方式的理念不同：

- `skills.sh`：把文件复制到项目，可自行编辑，类似 fork；
- Claude Code 插件：以只读、集中更新的方式安装，类似订阅。

插件安装完成后，仍然需要在每个项目中运行一次：

```text
/setup-matt-pocock-skills
```

## 3.3 关于不同 Agent 平台

仓库作者强调，这些 Skill 的工作流本身是模型无关的，但部分 Skill 会使用特定 Agent 环境提供的能力，例如：

- `code-review` 希望运行两个并行子 Agent；
- `research` 希望启动后台研究 Agent；
- `improve-codebase-architecture` 会使用探索型子 Agent 并打开 HTML；
- `teach` 会生成并打开 HTML 课程文件。

如果当前 Agent 平台没有并行子 Agent 或后台 Agent，仍然可以保留流程本身，只是需要改成串行执行。

也就是说：

> 可移植的是工程方法和 `SKILL.md` 中的步骤；具体工具调用可能需要根据平台适配。

---

# 四、第一次使用：项目初始化

安装完成后，在代码仓库根目录执行：

```text
/setup-matt-pocock-skills
```

它不是一个完全固定的脚本，而是一个由对话驱动的初始化流程。

它会先检查：

- `git remote -v` 和 `.git/config`；
- 项目已有的 `CLAUDE.md` 或 `AGENTS.md`；
- 是否已经存在 `CONTEXT.md` 或 `CONTEXT-MAP.md`；
- 是否已有 `docs/adr/`；
- 是否已有 `docs/agents/`；
- 是否使用 `.scratch/` 保存本地工单；
- 项目是否为大型 monorepo；
- 是否安装了 `triage`。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/setup-matt-pocock-skills/SKILL.md>

## 4.1 配置 Issue Tracker

当前 `setup` Skill 明确支持：

- GitHub Issues，使用 `gh`；
- GitLab Issues，使用 `glab`；
- 本地 Markdown 文件；
- 其他系统，例如 Jira、Linear，由用户描述工作流。

最终会生成：

```text
docs/agents/issue-tracker.md
```

README 的快捷说明可能只列出 GitHub、Linear 和本地文件，但当前 `setup` 的 `SKILL.md` 已经把 GitLab 和任意自定义 Tracker 也纳入配置，因此实际使用时应该以当前 `SKILL.md` 为准。

## 4.2 配置 Triage 标签

如果安装了 `/triage`，初始化流程会询问是否使用默认的五个状态标签：

```text
needs-triage
needs-info
ready-for-agent
ready-for-human
wontfix
```

映射会保存到：

```text
docs/agents/triage-labels.md
```

如果团队已经使用类似下面的标签：

```text
bug:triage
status:agent-ready
```

可以在初始化时建立映射，而不是新建重复标签。

## 4.3 配置领域文档结构

普通项目默认使用单一上下文：

```text
/
├── CONTEXT.md
└── docs/
    └── adr/
```

大型 monorepo 才会建议使用多上下文：

```text
/
├── CONTEXT-MAP.md
├── docs/adr/
└── packages/
    ├── ordering/
    │   ├── CONTEXT.md
    │   └── docs/adr/
    └── billing/
        ├── CONTEXT.md
        └── docs/adr/
```

初始化主要生成领域文档的使用规则：

```text
docs/agents/domain.md
```

`CONTEXT.md` 和 ADR 通常由 `/domain-modeling` 在真正形成术语或决策时按需创建，而不是在初始化阶段创建大量空文件。

## 4.4 修改 `CLAUDE.md` 或 `AGENTS.md`

规则是：

1. 有 `CLAUDE.md` 就修改它；
2. 否则有 `AGENTS.md` 就修改它；
3. 两者都没有时，让用户选择创建哪一个；
4. 不会同时创建两份；
5. 已有 `## Agent skills` 区块时，就地更新，不重复追加。

最终区块大致如下：

```markdown
## Agent skills

### Issue tracker

Issues are tracked in GitHub.
See `docs/agents/issue-tracker.md`.

### Triage labels

See `docs/agents/triage-labels.md`.

### Domain docs

This repository uses a single-context domain model.
See `docs/agents/domain.md`.
```

---

# 五、最推荐的整体工作流

## 5.1 小型功能：一轮对话可以完成

```text
/setup-matt-pocock-skills
        ↓
/grill-with-docs
        ↓
/implement
        ↓
内部执行 /tdd
        ↓
内部执行 /code-review
        ↓
提交代码
```

适合：

- 修改一个现有表单；
- 添加一个简单接口；
- 增加一个明确的业务规则；
- 一次 Agent 会话可以完成的功能。

## 5.2 中大型功能：跨多个会话

```text
/grill-with-docs
        ↓
必要时 /prototype 或 /research
        ↓
/to-spec
        ↓
/to-tickets
        ↓
每个 ticket 开一个全新会话
        ↓
/implement <ticket>
        ↓
内部 /tdd + /code-review
```

这里最关键的是：

- 澄清、规格和拆票尽量在同一段上下文中完成；
- 到 `/to-tickets` 后，决策已经写入正式工单；
- 每个 ticket 使用新的上下文实现，避免旧对话噪声；
- ticket 应该是端到端的纵向切片，而不是“先数据库、再 API、再 UI”的横向切片。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/ask-matt/SKILL.md>

## 5.3 不知道该用哪个 Skill

```text
/ask-matt 我有一个旧项目，准备重做支付失败重试流程，
但不确定需求是否清楚，也不知道是否需要先拆票。
```

它会根据工作规模、未知程度和会话长度推荐路线。

## 5.4 困难 Bug

```text
/diagnosing-bugs 线上偶发出现订单重复扣款，
目前只能从日志中看到少量线索。
```

不要直接走 `/implement`，应该先建立可重复执行的反馈循环。

## 5.5 大到一个会话装不下，而且方向仍不明确

```text
/wayfinder 我们需要把单体应用逐步迁移成模块化架构，
但还不清楚先拆哪些模块，也不清楚数据迁移策略。
```

Wayfinder 解决的是“先把路找出来”，而不是立刻实现。

---

# 六、17 个 Engineering Skills 详解

## A. 用户显式调用型

## 6.1 `ask-matt`

### 功能

这是整个仓库的“导航器”。当你不记得所有 Skill，或者不知道任务应该走哪条流程时，用它。

它定义的主路径是：

```text
idea
  ↓
grill-with-docs
  ↓
prototype / research，可选
  ↓
to-spec
  ↓
to-tickets
  ↓
implement
  ↓
tdd
  ↓
code-review
  ↓
ship
```

### 使用方式

```text
/ask-matt 我准备给现有 SaaS 增加暂停订阅功能，
这个功能可能涉及计费、权限和通知，我应该怎么开始？
```

### 它会判断什么

- 是否先澄清需求；
- 是否需要原型验证；
- 是否会跨越多个会话；
- 是否需要正式 Spec；
- 是否需要拆成 Tickets；
- 是否属于困难 Bug；
- 是否属于架构治理；
- 当前上下文是否已经过大，应该使用 `/handoff`。

### 注意

它主要负责推荐路径，而不是直接完成所有工作。你仍然需要按建议显式启动后续用户调用型 Skill。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/ask-matt/SKILL.md>

---

## 6.2 `setup-matt-pocock-skills`

### 功能

为当前代码仓库建立其他工程 Skill 所依赖的配置。

### 使用方式

```text
/setup-matt-pocock-skills
```

### 主要产物

```text
CLAUDE.md 或 AGENTS.md
docs/agents/issue-tracker.md
docs/agents/domain.md
docs/agents/triage-labels.md    # 安装 triage 时
```

### 适合什么时候运行

- 新项目第一次安装 Skills；
- 切换 Issue Tracker；
- 从 GitHub Issues 改成本地 Markdown；
- 调整 Triage 标签；
- 将单一领域上下文升级为多上下文结构。

### 注意

很多 Skill 在找不到 `docs/agents/issue-tracker.md` 时，会要求你先运行它，因此不要跳过初始化。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/setup-matt-pocock-skills/SKILL.md>

---

## 6.3 `grill-with-docs`

### 功能

对计划、需求或设计进行持续追问，同时维护项目的领域语言和架构决策。

它本质上组合了：

```text
/grilling
+
/domain-modeling
```

### 使用方式

```text
/grill-with-docs 我们要给订单系统增加部分退款，
目前订单只支持整单退款。
```

### 运行特点

底层 `/grilling` 会：

- 一次只问一个问题；
- 每个问题先给出推荐答案；
- 按依赖顺序遍历决策树；
- 能从代码、文件或工具中查到的事实不会反过来问用户；
- 在用户确认形成共同理解前，不直接开始实现。

同时 `/domain-modeling` 会：

- 发现“退款”“取消”“冲正”等术语冲突；
- 用具体边界场景检验概念；
- 实时更新 `CONTEXT.md`；
- 对满足条件的重要决策建议创建 ADR。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/grill-with-docs/SKILL.md>

### 适合什么时候使用

几乎所有非纯机械式代码改动开始之前都可以使用，尤其适合：

- 需求还比较模糊；
- 涉及复杂业务规则；
- 多个团队对术语理解不同；
- 有难以逆转的技术决策；
- 希望 Agent 后续会话持续理解项目语言。

---

## 6.4 `triage`

### 功能

管理 Issue 和外部 PR 的分诊状态，把原始请求逐步处理成可以交给 Agent 或人类执行的任务。

### 状态模型

分类标签：

```text
bug
enhancement
```

状态标签：

```text
needs-triage
needs-info
ready-for-agent
ready-for-human
wontfix
```

每个已分诊请求应该恰好有：

- 一个分类；
- 一个状态。

### 使用方式

```text
/triage 列出所有需要我处理的 issue
```

```text
/triage 看一下 #42，判断它是否已经可以交给 Agent
```

```text
/triage 把 #42 移动到 ready-for-agent
```

### 完整处理流程

1. 读取 Issue 或 PR 正文、评论、标签和历史；
2. 查找项目中是否已经实现同类能力；
3. 查找 `.out-of-scope/` 中是否有历史拒绝记录；
4. 向维护者推荐分类和状态；
5. 对 Bug 尝试复现；
6. 对 PR 检查 Diff 和相关测试；
7. 信息不足时进入 `needs-info`；
8. 需求仍不清晰时，调用 `/grilling` 和 `/domain-modeling`；
9. 完整后生成 durable agent brief；
10. 更新 Tracker 状态。

它发布到 Tracker 的 AI 分诊评论必须以免责声明开头：

```text
This was generated by AI during triage.
```

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/triage/SKILL.md>

### 什么时候不要用

不要对 `/to-tickets` 已经生成、并且明确标为 `ready-for-agent` 的工单再次进行完整分诊。

`triage` 更适合处理：

- 外部提交的原始 Issue；
- Bug 报告；
- 外部 PR；
- 信息仍不完整的请求。

---

## 6.5 `improve-codebase-architecture`

### 功能

扫描代码库中的架构摩擦，寻找把“浅模块”改造成“深模块”的机会。

它重点关注：

- 理解一个概念是否需要在很多小文件之间跳转；
- 接口是否和内部实现一样复杂；
- 是否存在大量仅为了测试而拆出的纯函数；
- 模块是否在 Seam 处泄漏内部细节；
- 是否没有合适的公共接口进行测试；
- 最近反复修改的热点区域。

### 使用方式

扫描整个项目：

```text
/improve-codebase-architecture
```

限定范围：

```text
/improve-codebase-architecture 重点检查 checkout 和 payment 模块
```

### 输出

它不会直接在仓库里写一份普通 Markdown 报告，而是向系统临时目录输出一个独立 HTML 文件，其中包含：

- 涉及的文件和模块；
- 当前问题；
- 建议方案；
- Locality 与 Leverage 收益；
- 测试方式的改善；
- Before / After 图；
- 推荐强度；
- 最优先建议。

报告生成后，它不会马上替你设计接口，而是先让你选择要深入的候选项。

选定后，再进入 `/grilling` 和 `/domain-modeling`。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/improve-codebase-architecture/SKILL.md>

### 适合什么时候使用

- Agent 快速生成了大量代码，项目开始难以理解；
- 一个业务变化总要修改很多文件；
- 测试只能深入内部实现；
- 模块很多，但没有真正隐藏复杂度；
- 想定期进行架构维护。

---

## 6.6 `to-spec`

### 功能

把当前已经讨论清楚的上下文合成为正式规格，并发布到配置好的 Issue Tracker。

### 最重要的特征

它**不会再次采访用户**。

这意味着正确顺序是：

```text
先 grill-with-docs
再 to-spec
```

而不是把一个只有一句话的模糊需求直接交给 `/to-spec`。

### 使用方式

在需求讨论完成后直接执行：

```text
/to-spec
```

也可以提供上下文引用：

```text
/to-spec 基于刚刚讨论的订阅暂停方案
```

### 生成的规格结构

```markdown
## Problem Statement

## Solution

## User Stories

## Implementation Decisions

## Testing Decisions

## Out of Scope

## Further Notes
```

它会先确定应该在哪些 Seam 测试功能，优先使用已有、较高层级的公共 Seam，并让用户确认。

之后发布 Spec，并标记为 `ready-for-agent`。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md>

### 注意

规格里通常不写：

- 具体文件路径；
- 大段代码；
- 很快会过时的实现细节。

但如果原型中有一个状态机、Reducer、Schema 或类型结构，能比文字更准确地表达决策，可以保留裁剪后的关键片段。

---

## 6.7 `to-tickets`

### 功能

把 Spec、计划或当前对话拆成若干个 Agent 可以独立完成的工单。

### 核心原则：Tracer Bullet

每个 Ticket 必须是一条窄但完整的端到端路径，例如：

```text
数据库
  +
领域逻辑
  +
API
  +
UI
  +
测试
```

而不是：

```text
Ticket 1：建数据库
Ticket 2：写所有 API
Ticket 3：写所有 UI
Ticket 4：补测试
```

一个好的 Ticket 应该：

- 能在一个新的上下文窗口里完成；
- 完成后可以独立演示或验证；
- 明确写出被哪些 Ticket 阻塞；
- 没有 Blocker 时可以立即领取；
- 描述用户可观察到的端到端行为。

### 使用方式

基于当前讨论：

```text
/to-tickets
```

基于某个 Spec：

```text
/to-tickets #123
```

```text
/to-tickets docs/specs/subscription-pause.md
```

### 发布前会确认

Agent 会先向你展示：

- 标题；
- Blocked by；
- 交付的行为；
- Ticket 粒度。

然后询问：

- 是否太粗或太细；
- 阻塞关系是否正确；
- 是否需要合并或拆分。

只有用户确认后才会发布。

### 本地 Tracker 输出

```text
.scratch/<feature-slug>/issues/
├── 01-prepare-domain-seam.md
├── 02-pause-subscription.md
└── 03-resume-subscription.md
```

### 大范围机械重构

对于无法保持每个纵向切片都绿灯的全局重构，它会使用 Expand–Contract：

```text
Expand：引入新形式，但保留旧形式
   ↓
Migrate：分批迁移调用方
   ↓
Contract：删除旧形式
```

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md>

---

## 6.8 `implement`

### 功能

根据现有 Spec 或 Ticket 实现代码。

### 使用方式

```text
/implement #124
```

```text
/implement .scratch/subscription-pause/issues/02-pause-subscription.md
```

### 内部流程

它要求 Agent：

1. 阅读 Spec 或 Ticket；
2. 在预先约定的 Seam 上使用 `/tdd`；
3. 经常运行类型检查；
4. 经常运行当前相关的单个测试文件；
5. 完成时运行完整测试套件；
6. 使用 `/code-review` 审查；
7. 把工作提交到当前分支。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/implement/SKILL.md>

### 重要注意事项

`implement` 的当前定义包含：

```text
Commit your work to the current branch.
```

因此运行前应该确认：

- 已经切换到正确的 Feature Branch；
- 工作区没有不希望混入提交的改动；
- Ticket 足够明确；
- 当前分支允许 Agent 提交。

---

## 6.9 `wayfinder`

### 功能

管理大到一个 Agent 会话无法容纳、并且仍处在“迷雾”中的工作。

它不是普通的 Ticket 拆分器，而是一个**决策地图**。

### 普通 Ticket 与 Wayfinder Ticket 的区别

普通 Ticket：

```text
实现一个可以交付的功能切片
```

Wayfinder Ticket：

```text
解决一个尚未确定的关键问题
```

例如：

- 是否保留双写阶段；
- 数据迁移能否在线完成；
- 新模块 Seam 应放在哪里；
- 哪个 UI 交互最适合用户；
- 某个第三方 API 是否满足约束。

### 使用方式

```text
/wayfinder 我们需要在不中断业务的情况下，
把旧计费系统迁移到新计费平台。
```

### 地图结构

它会创建一个带有下面标签的主 Issue：

```text
wayfinder:map
```

主 Issue 包括：

```markdown
## Destination

## Notes

## Decisions so far

## Not yet specified

## Out of scope
```

子 Ticket 根据任务类型标记为：

```text
wayfinder:research
wayfinder:prototype
wayfinder:grilling
wayfinder:task
```

可领取的 Frontier 是：

```text
仍然打开
+
所有 blocker 已关闭
+
尚未被认领
```

每次会话领取一个决策 Ticket，解决后关闭，并在主地图中增加一行决策摘要。

地图完成的标准不是“所有代码已经写完”，而是：

> 到达目标之前，已经没有关键问题需要继续决定。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md>

---

## B. 模型可自动调用型

## 6.10 `prototype`

### 功能

快速构建一个明确标记为可丢弃的原型，用运行结果回答设计问题。

### 两条分支

逻辑或状态问题：

```text
做一个很小的交互式终端程序
```

例如：

- 状态机是否合理；
- 多步骤流程是否会卡死；
- 边界条件是否可表达。

UI 问题：

```text
在一个路由上生成多个差异明显的 UI 方案
```

通过 URL 查询参数和底部切换器浏览不同版本。

### 使用方式

```text
/prototype 验证订阅暂停和恢复的状态机是否合理
```

```text
/prototype 为结账失败页面做四种明显不同的 UI 方案
```

### 原型规则

- 从第一天开始就标记为 Throwaway；
- 一个命令即可运行；
- 默认不做持久化；
- 不追求完善的异常处理；
- 不建立正式抽象；
- 不写完整测试；
- 每次操作后展示完整相关状态；
- 验证完成后，把结论放进正式 Spec 或 Issue；
- 原型本身放在临时分支，而不是主分支。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/prototype/SKILL.md>

### 最容易犯的错误

把 Prototype 直接“稍微改改”变成生产代码。

这个 Skill 的目标是降低学习成本，而不是提前实现最终系统。

---

## 6.11 `diagnosing-bugs`

### 功能

为困难 Bug 和性能回归提供严格的诊断循环。

### 六个阶段

#### 阶段一：建立反馈循环

先得到一个满足以下条件的红/绿命令：

- 能检测到用户描述的具体 Bug；
- 确定性足够高；
- 最好几秒完成；
- Agent 可以自动执行。

可能是：

- 失败测试；
- `curl` 脚本；
- CLI Fixture；
- Playwright；
- Trace Replay；
- Throwaway Harness；
- Fuzz Loop；
- `git bisect run`；
- 新旧版本差分；
- 最后才考虑 Human-in-the-loop 脚本。

没有这个反馈循环，就不进入假设阶段。

#### 阶段二：复现并最小化

逐步删除输入、配置、数据和调用方，直到剩下的每个元素都是 Bug 发生所必需的。

#### 阶段三：提出假设

一次生成 3–5 个按可能性排序、可以证伪的假设。

格式类似：

```text
如果 X 是原因，那么改变 Y 应让 Bug 消失或明显恶化。
```

#### 阶段四：插桩

- 一次只改变一个变量；
- 优先使用调试器或 REPL；
- 其次是精确日志；
- 不允许“到处打日志再 grep”；
- 临时日志使用唯一前缀，例如 `[DEBUG-a4f2]`；
- 性能问题先建立基线和 Profiler 数据。

#### 阶段五：修复和回归测试

如果存在正确的公共 Seam：

1. 把最小复现变成失败测试；
2. 确认测试失败；
3. 修复；
4. 确认测试通过；
5. 重新运行原始完整复现。

如果没有正确 Seam，应该明确记录：

```text
当前架构无法可靠锁定这个 Bug。
```

#### 阶段六：清理和复盘

确认：

- 原始问题不再复现；
- 回归测试通过；
- 临时日志已删除；
- Throwaway 调试代码已删除；
- 正确根因写入 Commit 或 PR；
- 如果根因与架构 Seam 有关，转交给 `/improve-codebase-architecture`。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnosing-bugs/SKILL.md>

---

## 6.12 `research`

### 功能

围绕一个工程问题查找高可信的一手资料，并把结果保存为带引用的 Markdown 文档。

### 一手资料优先级

- 官方文档；
- 源代码；
- 标准规范；
- 第一方 API；
- 项目维护者发布的材料。

它不应该把二手博客作为主要事实来源。

### 使用方式

```text
/research 调查我们是否能用当前数据库实现在线无锁索引迁移，
优先查官方文档和源码。
```

### 输出

```text
项目已有研究目录中的某个 .md 文件
```

如果项目没有约定，就选择合理位置并告知用户。

### 运行要求

原始 Skill 希望把研究交给后台 Agent，使主 Agent 可以继续工作。

如果当前环境不支持后台 Agent，可以改成前台或串行执行，但仍应该保留：

- 一手来源；
- 逐条引用；
- 写入项目；
- 明确研究结论和不确定性。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/research/SKILL.md>

---

## 6.13 `tdd`

### 功能

通过红—绿循环，一次完成一个纵向行为切片。

### 使用方式

```text
/tdd 为“用户可以暂停一个活跃订阅”实现行为测试和代码
```

### 测试原则

测试必须：

- 通过公共接口验证行为；
- 不依赖内部实现结构；
- 像规格一样可读；
- 在内部重构后仍然成立；
- 使用项目 `CONTEXT.md` 中的领域语言。

### Seam 规则

写测试前要先明确并确认：

```text
公共接口是什么？
在哪些 Seam 上测试？
```

不在未经确认的 Seam 上随意增加测试。

### 反模式

#### 实现耦合测试

例如：

- 测私有方法；
- Mock 内部协作者；
- 绕过公共接口直接查数据库；
- 只要重构就失败。

#### 自证式测试

例如：

```ts
expect(add(a, b)).toBe(a + b)
```

测试和实现使用相同逻辑计算答案，就很难发现错误。

#### 横向批量测试

错误方式：

```text
先写全部测试
再写全部实现
```

正确方式：

```text
一个失败测试
→ 最少实现
→ 下一个失败测试
→ 最少实现
```

### 一个细节

README 可能使用“Red–Green–Refactor”作为简写，但当前 `SKILL.md` 明确把核心循环定义成 Red → Green，并要求把重构放到后续 Review 阶段，而不是在每个红绿循环中无限扩展范围。

实际执行时应该以当前 `SKILL.md` 的具体规则为准。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md>

---

## 6.14 `domain-modeling`

### 功能

建立和持续修正项目的领域模型。

它不是简单读取 `CONTEXT.md`，而是在设计过程中主动：

- 挑战现有术语；
- 发现重名或歧义；
- 构造边界场景；
- 对照代码验证业务描述；
- 更新领域词汇；
- 在必要时记录 ADR。

### 使用方式

可以直接调用：

```text
/domain-modeling 帮我梳理订单、订单项、取消和退款之间的关系
```

也常由以下 Skill 自动使用：

```text
/grill-with-docs
/triage
/improve-codebase-architecture
```

### `CONTEXT.md` 应该写什么

只写领域词汇和定义，例如：

```markdown
## Materialization

A lesson becomes materialized when it receives a stable
location in the course filesystem.
```

不要写：

- 文件路径；
- 数据库选型；
- API 实现；
- 临时计划；
- 技术任务列表。

### ADR 的创建门槛

只有同时满足以下条件才建议创建 ADR：

1. 很难逆转；
2. 没有上下文时令人意外；
3. 存在真实取舍。

缺少任何一项，就不应该为了“文档完整”而强行创建 ADR。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/domain-modeling/SKILL.md>

---

## 6.15 `codebase-design`

### 功能

提供设计“深模块”的统一词汇和原则。

### 核心词汇

#### Module

任何拥有 Interface 和 Implementation 的东西，可以是：

- 函数；
- 类；
- Package；
- 跨层业务切片。

#### Interface

调用方为了正确使用模块必须知道的一切，不只是类型签名，还包括：

- 不变量；
- 调用顺序；
- 错误模式；
- 配置；
- 性能特征。

#### Depth

调用方只需要学习很小的 Interface，却可以获得很多能力。

#### Seam

无需修改当前位置，就可以改变系统行为的地方。Interface 就位于 Seam 上。

#### Adapter

在某个 Seam 上实现 Interface 的具体对象。

#### Leverage

调用者从深模块中获得的复用收益。

#### Locality

业务知识、变化、Bug 和验证集中在一个位置。

### 深模块与浅模块

深模块：

```text
小接口
+
大量隐藏行为
```

浅模块：

```text
大接口
+
少量透传实现
```

### 关键原则

#### 删除测试

假设删除这个模块：

- 如果复杂度直接消失，它可能只是无意义透传；
- 如果复杂度散落到很多调用方，它正在提供真正价值。

#### Interface 就是测试表面

调用方和测试应该穿过同一个 Seam。

#### 一个 Adapter 只是推测出来的 Seam

只有一个实现时，不要过早抽象。两个真实 Adapter 出现时，Seam 才更可能是必要的。

### 使用方式

```text
/codebase-design 帮我重新设计 payment 模块的 interface
```

或者自然描述：

```text
请检查这个模块是不是太浅，是否应该把复杂度收回到一个更小的接口后面。
```

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/codebase-design/SKILL.md>

---

## 6.16 `code-review`

### 功能

对某个固定点到当前 `HEAD` 的 Diff 进行双轴审查。

两个轴相互独立。

### Standards

代码是否符合：

- 项目自己的编码规范；
- `CONTRIBUTING.md`；
- `CODING_STANDARDS.md`；
- 一组 Fowler Code Smell 基线。

### Spec

代码是否：

- 完整实现了需求；
- 遗漏了部分要求；
- 实现了规格没有要求的范围；
- 看似实现，但行为错误。

### 使用方式

```text
/code-review main
```

```text
/code-review HEAD~5
```

```text
/code-review release-v2
```

参数是固定比较点。它使用：

```bash
git diff <fixed-point>...HEAD
git log <fixed-point>..HEAD --oneline
```

三个点表示从 Merge Base 比较，更适合审查分支。

### Spec 的查找顺序

1. Commit Message 中的 Issue 引用；
2. 用户传入的路径；
3. `docs/`、`specs/` 或 `.scratch/` 中匹配分支的规格；
4. 仍然找不到时询问用户；
5. 用户确认没有 Spec 时，Spec 轴明确标为不可执行。

### Code Smell 基线

包括：

- Mysterious Name；
- Duplicated Code；
- Feature Envy；
- Data Clumps；
- Primitive Obsession；
- Repeated Switches；
- Shotgun Surgery；
- Divergent Change；
- Speculative Generality；
- Message Chains；
- Middle Man；
- Refused Bequest。

项目自己的明确标准优先于 Smell 基线；Smell 只是判断性提醒，而不是硬性违规。

### 输出

```markdown
## Standards

...

## Spec

...

Summary: Standards X findings; Spec Y findings.
```

两个轴不合并、不互相抵消。

完全符合编码规范的代码仍然可能实现错需求；完全实现需求的代码也可能破坏项目约定。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/code-review/SKILL.md>

---

## 6.17 `resolving-merge-conflicts`

### 功能

解决正在进行中的 Git Merge 或 Rebase 冲突。

### 使用方式

在发生冲突后：

```text
/resolving-merge-conflicts
```

也可以自然描述：

```text
请按双方改动的原始意图解决当前 rebase 冲突。
```

### 流程

1. 查看当前 Merge 或 Rebase 状态；
2. 查看 Git 历史和冲突文件；
3. 追查双方改动的原始来源：
   - Commit Message；
   - PR；
   - Issue；
   - Ticket；
4. 逐个 Hunk 判断意图；
5. 尽可能同时保留双方意图；
6. 不兼容时，选择符合本次 Merge 目标的一方；
7. 不凭空发明新行为；
8. 运行类型检查、测试和格式化；
9. Stage 文件；
10. 完成 Merge，或持续执行 Rebase。

当前 Skill 的明确要求是：

```text
Always resolve; never --abort.
```

因此它适用于你已经决定必须完成此次合并的场景，而不是“帮我判断应不应该继续合并”。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/resolving-merge-conflicts/SKILL.md>

---

# 七、5 个 Productivity Skills 详解

## 7.1 `grill-me`

### 功能

对任何非代码、或不需要项目文档的计划进行深度追问。

它只是用户调用型包装器，底层运行 `/grilling`。

### 使用方式

```text
/grill-me 我准备开一个面向前端工程师的线上课程
```

适合：

- 产品构想；
- 内容计划；
- 文章结构；
- 商业决策；
- 职业规划；
- 项目方案。

如果是在代码仓库内处理工程需求，通常优先使用 `/grill-with-docs`，因为后者还会维护领域词汇和 ADR。

参考：<https://github.com/mattpocock/skills/blob/main/skills/productivity/grill-me/SKILL.md>

---

## 7.2 `grilling`

### 功能

这是 `grill-me` 和 `grill-with-docs` 背后的可复用采访引擎。

### 规则

- 沿决策树逐个解决问题；
- 先处理后续问题所依赖的前置决策；
- 一次只问一个问题；
- 每个问题提供推荐答案；
- 可从环境中查到的事实由 Agent 自己查；
- 真正的决策交给用户；
- 未形成共同理解前不开始执行。

### 使用方式

通常不需要直接调用，但也可以：

```text
/grilling 帮我彻底检验这个定价方案
```

参考：<https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md>

---

## 7.3 `handoff`

### 功能

把当前长对话压缩成一个可以交给新 Agent 会话的交接文档。

### 使用方式

```text
/handoff 下一次会话将继续完成支付状态机原型
```

### 产物规则

- 写入操作系统临时目录；
- 不写进当前项目；
- 包含下一会话建议调用的 Skills；
- 已有 Spec、ADR、Issue、Commit 或 Diff 不重复抄写；
- 只记录路径或链接；
- 删除 API Key、密码和个人敏感信息；
- 根据用户参数说明下一会话重点。

参考：<https://github.com/mattpocock/skills/blob/main/skills/productivity/handoff/SKILL.md>

### 什么时候用

- 上下文已经很长；
- 当前 Agent 开始遗忘早期细节；
- 需要从需求讨论切换到隔离的原型会话；
- 原型完成后，需要把结论带回主需求会话；
- 要换 Agent 或换模型继续。

---

## 7.4 `teach`

### 功能

把当前目录变成一个持续多会话的学习工作区。

### 使用方式

```text
/teach 我想系统学习 TypeScript 类型系统，
目标是能够设计大型项目的公共类型接口。
```

### 工作区结构

```text
MISSION.md
RESOURCES.md
NOTES.md

reference/
  *.html

lessons/
  0001-*.html
  0002-*.html

learning-records/
  0001-*.md
  0002-*.md

assets/
```

### 文件作用

`MISSION.md`：

- 为什么学习；
- 最终希望做到什么；
- 教学内容应该如何与目标对齐。

`RESOURCES.md`：

- 官方资料；
- 高可信书籍、论文、课程；
- 实践资源。

`lessons/*.html`：

- 每次一个小而完整的课程；
- 时间短；
- 有明确的单次学习收益；
- 直接服务于学习目标；
- 可以链接到其他课程和参考文件。

`learning-records/*.md`：

- 记录已经真正理解的关键概念；
- 类似软件工程中的 ADR；
- 用于判断下一步最近发展区。

### 教学原则

它强调：

- 高可信资料；
- 检索练习；
- 间隔学习；
- 交错练习；
- 长期存储强度，而不是当下“看起来懂了”的流畅感。

参考：<https://github.com/mattpocock/skills/blob/main/skills/productivity/teach/SKILL.md>

---

## 7.5 `writing-great-skills`

### 功能

指导你设计、审查和改进自己的 Agent Skill。

### 使用方式

```text
/writing-great-skills 帮我审查当前目录下的 deploy-service skill
```

### 核心理念

Skill 的目的不是每次产生完全相同的输出，而是让随机性模型每次都遵循相对一致、可检查的过程。

### 它重点讲解

#### Invocation 选择

应该让用户显式调用，还是让模型自动判断？

#### Description 写法

模型调用型 Description 应该：

- 开头就写核心能力；
- 每个真正不同的触发分支只写一次；
- 删除同义重复；
- 不重复正文中已经存在的身份信息。

#### 信息层级

第一层：`SKILL.md` 中必须立即执行的步骤。

第二层：`SKILL.md` 中随时可能需要的规则和定义。

第三层：通过链接按需加载的外部参考，例如：

```text
GLOSSARY.md
tests.md
mocking.md
HTML-REPORT.md
```

#### Completion Criteria

每一步都应该有可检查的完成条件。

例如：

```text
所有修改过的数据模型都有对应迁移
```

比下面这句话更可靠：

```text
检查一下数据模型
```

#### Progressive Disclosure

所有分支都需要的信息放在 `SKILL.md`；只有某一分支需要的内容放在独立参考文件，并通过明确的 Context Pointer 加载。

参考：<https://github.com/mattpocock/skills/blob/main/skills/productivity/writing-great-skills/SKILL.md>

---

# 八、四个完整使用示例

## 示例一：开发一个中型功能

需求：

> 给订阅系统增加“暂停 30 天后自动恢复”的能力。

### 第一步：澄清

```text
/grill-with-docs 我们要增加订阅暂停功能。
用户可以暂停最多 30 天，到期自动恢复。
```

可能会依次讨论：

- 暂停期间是否收费；
- 已进入扣款周期怎么办；
- 用户能否提前恢复；
- 能否连续暂停；
- “暂停”和“取消”是否是不同概念；
- 通知在什么时候发送；
- 自动恢复失败怎么办。

形成术语和决策后，`CONTEXT.md` 与 ADR 会同步更新。

### 第二步：验证状态模型

```text
/prototype 为订阅暂停、提前恢复、自动恢复和恢复失败建立交互式状态机原型
```

通过终端原型观察状态转换。

### 第三步：生成 Spec

回到主需求会话：

```text
/to-spec
```

### 第四步：拆 Tickets

```text
/to-tickets #123
```

可能得到：

```text
1. 建立暂停订阅的领域行为
   Blocked by: None

2. 允许用户提前恢复
   Blocked by: 1

3. 自动恢复到期订阅
   Blocked by: 1

4. 处理自动恢复失败与通知
   Blocked by: 3
```

### 第五步：逐票实现

每个 Ticket 开新会话：

```text
/implement #124
```

```text
/implement #125
```

`implement` 会在内部使用 TDD 和 Code Review。

---

## 示例二：诊断偶发 Bug

问题：

> 大约 1% 的结账请求会创建两个订单。

不要先搜索代码，然后猜“可能是 Race Condition”。

正确命令：

```text
/diagnosing-bugs 约 1% 的结账请求会创建两个订单。
请先建立可以提高复现率的自动反馈循环。
```

合理过程是：

1. 建立可重复发送并发请求的脚本；
2. 把复现率从 1% 提高到可调试水平；
3. 最小化请求和依赖；
4. 提出 3–5 个可证伪假设；
5. 精确插桩；
6. 找到根因；
7. 在正确 Seam 上写回归测试；
8. 修复；
9. 运行原始并发脚本；
10. 清除临时日志。

---

## 示例三：治理混乱架构

问题：

> 增加一种折扣规则需要修改十多个文件，测试也非常难写。

先运行：

```text
/improve-codebase-architecture 重点检查 discount 和 checkout 区域
```

Agent 输出 HTML 候选报告，例如：

```text
候选 A：把折扣计算收回到 PricingPolicy 深模块
推荐：Strong

候选 B：合并多个只做透传的 DiscountHandler
推荐：Worth exploring

候选 C：为存储层增加新的 Adapter seam
推荐：Speculative
```

选择候选 A 后，Agent 才开始 Grilling：

- `PricingPolicy` 的最小 Interface 是什么；
- 哪些行为应该隐藏在内部；
- 哪些 Adapter 真正存在；
- 测试应该穿过哪个 Seam；
- 删除旧模块后，复杂度会去哪里。

设计清楚后，可以继续：

```text
/to-spec
/to-tickets
```

---

## 示例四：规划一个大型迁移

问题：

> 把旧权限系统迁移到新权限模型，预计几个月，很多问题尚未确定。

运行：

```text
/wayfinder 将旧 RBAC 权限模型迁移到新的组织级权限模型。
目标是在迁移期间保持兼容，并最终删除旧模型。
```

可能建立以下决策 Ticket：

```text
Research：数据库双模型查询的性能上限

Prototype：验证旧角色到新权限集合的映射

Grilling：确定迁移期间权限冲突的裁决规则

Task：盘点所有权限检查入口

Research：确认审计日志的合规保留要求
```

这些不是立即交付代码的普通 Tickets，而是逐步清除迷雾。

决策完成、路线明确后，再使用：

```text
/to-spec
/to-tickets
```

进入真正实施阶段。

---

# 九、其余 19 个非主推 Skill

这些 Skill 也在仓库中，但不属于当前稳定插件的主流程。

## 9.1 Misc：偶尔使用的工具

目录：<https://github.com/mattpocock/skills/tree/main/skills/misc>

### `git-guardrails-claude-code`

为 Claude Code 配置 Hooks，在危险 Git 命令真正执行前阻止它们，例如：

- `git push`；
- `git reset --hard`；
- `git clean`。

适合希望严格控制 Agent Git 权限的项目。

### `migrate-to-shoehorn`

把测试代码中的 TypeScript `as` 类型断言迁移到：

```text
@total-typescript/shoehorn
```

适合 Matt 相关生态中的测试迁移。

### `scaffold-exercises`

生成练习目录结构，包括：

- Sections；
- Problems；
- Solutions；
- Explainers。

适合课程、教学仓库和编码练习项目。

### `setup-pre-commit`

建立基于 Husky 的 Pre-commit 流程，组合：

- lint-staged；
- Prettier；
- 类型检查；
- 测试。

这些 Skill 没有被正式推广到插件主清单。

---

## 9.2 Personal：与 Matt 个人环境绑定

目录：<https://github.com/mattpocock/skills/tree/main/skills/personal>

### `edit-article`

编辑文章，包括：

- 调整章节结构；
- 改善清晰度；
- 收紧表达；
- 删除重复。

### `obsidian-vault`

管理 Obsidian Vault，包括：

- 搜索笔记；
- 创建笔记；
- 管理 Wikilinks；
- 维护索引笔记。

这两个 Skill 与作者个人工作环境相关，默认不进入插件。使用前应该检查路径和个人约定是否适合自己的环境。

---

## 9.3 In Progress：正在开发

目录：<https://github.com/mattpocock/skills/tree/main/skills/in-progress>

这些 Skill 可能存在粗糙边缘、破坏性变化，或被放弃的实验，不应该直接当作稳定生产工作流。

### `loop-me`

把模糊工作流通过多次 Grilling 逐步变成可执行规范，并把当前目录作为跨会话状态空间。

### `wizard`

生成交互式 Bash Wizard，引导人类完成：

- 环境初始化；
- 一次性迁移；
- 手动状态转换；
- 打开 URL；
- 收集配置；
- 写 `.env`；
- 设置 GitHub Actions Secret。

### `writing-beats`

把文章组织成一段段旅程式 Beat。每次只写一个 Beat，再选择下一个方向。

### `writing-fragments`

通过 Grilling 从用户那里收集零散素材，追加到一个原始素材文档中。

### `writing-shape`

把 Markdown 原始素材逐段塑造成文章，并在每一步解释结构选择。

### `claude-handoff`

把当前对话交给一个新的 Claude 后台 Agent，并使用 Handoff 摘要启动：

```text
claude --bg
```

它比稳定版 `/handoff` 更自动化，但也更依赖 Claude Code 环境。

### `setup-ts-deep-modules`

在 TypeScript 项目里接入 dependency-cruiser，强制 Package：

- 只能通过入口文件访问；
- 隐藏内部 Implementation；
- 测试通过公共 Interface；
- 按深模块方式组织。

### `to-questionnaire`

当决策需要别人异步回答时，生成 Markdown 问卷。

它重点询问：

- 发给谁；
- 希望对方返回什么；
- 用于异步填写还是会议讨论。

### `batch-grill-me`

普通 Grilling 一次只问一个问题；它会一次询问当前所有前置条件已经满足的问题，然后根据整批回答重新计算决策树。

---

## 9.4 Deprecated：已弃用

目录：<https://github.com/mattpocock/skills/tree/main/skills/deprecated>

仓库明确表示这些 Skill 已经不再使用。适合研究历史设计，不建议新项目安装。

### `design-an-interface`

曾通过并行子 Agent 为同一个模块设计多个差异明显的 Interface。

当前稳定版 `codebase-design` 中的 `DESIGN-IT-TWICE.md` 已包含类似设计思想。

### `qa`

曾通过交互式 QA 会话收集用户报告的 Bug，并创建 GitHub Issues。

现在相关需求通常可以拆到：

- `triage`；
- `diagnosing-bugs`；
- `to-tickets`。

### `request-refactor-plan`

曾通过采访生成极细粒度重构计划，并提交为 GitHub Issue。

当前更推荐组合：

```text
/improve-codebase-architecture
/to-spec
/to-tickets
```

### `ubiquitous-language`

曾从当前对话中提取 DDD Ubiquitous Language。

当前这部分已经由下面两个 Skill 持续维护，而不是一次性提取：

```text
/domain-modeling
/grill-with-docs
```

---

# 十、推荐安装组合

## 10.1 最小实用组合

适合个人开发者：

```text
setup-matt-pocock-skills
ask-matt
grill-with-docs
implement
tdd
diagnosing-bugs
code-review
handoff
```

## 10.2 完整功能开发组合

```text
setup-matt-pocock-skills
ask-matt
grill-with-docs
to-spec
to-tickets
implement
prototype
research
tdd
code-review
domain-modeling
handoff
```

## 10.3 团队 Issue 管理组合

在上一组基础上增加：

```text
triage
```

## 10.4 架构治理组合

增加：

```text
codebase-design
improve-codebase-architecture
resolving-merge-conflicts
```

## 10.5 超大型项目组合

再增加：

```text
wayfinder
```

---

# 十一、常见错误

## 11.1 没运行 Setup 就开始拆票

后果：

- 不知道 Issue 应该写到哪里；
- 不知道标签映射；
- 不知道领域文档位置；
- 多个 Skill 会反复询问相同配置。

应该先运行：

```text
/setup-matt-pocock-skills
```

## 11.2 用 `to-spec` 代替需求澄清

`to-spec` 不负责采访，只负责综合已有结论。

错误：

```text
/to-spec 给系统加权限功能
```

正确：

```text
/grill-with-docs 给系统增加组织级权限
```

讨论完成后：

```text
/to-spec
```

## 11.3 把 Tickets 横向拆层

错误：

```text
数据库 Ticket
API Ticket
前端 Ticket
测试 Ticket
```

正确：

```text
一个用户行为对应一条端到端 Tracer Bullet
```

## 11.4 TDD 测试内部实现

不要测试：

- 私有方法；
- 内部调用次数；
- 临时对象结构；
- 数据库内部状态，而公共接口不可观察。

测试应该通过事先确认的 Seam 验证行为。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md>

## 11.5 没有复现就开始修 Bug

`diagnosing-bugs` 最反对的就是先读代码，然后马上形成唯一假设。

没有下面这个条件，就不应该开始正式修复：

```text
一条能红、能绿、可重复执行的命令
```

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/diagnosing-bugs/SKILL.md>

## 11.6 把 Prototype 直接合并进主分支

Prototype 的正式产物是：

```text
被验证的决策
```

不是 Prototype 代码本身。

## 11.7 Code Review 不指定固定点

错误：

```text
/code-review
```

正确：

```text
/code-review main
```

或者：

```text
/code-review HEAD~3
```

## 11.8 忘记 `implement` 会提交代码

运行前检查：

```bash
git status
git branch --show-current
```

并确保当前分支正确。

## 11.9 上下文太长仍然硬撑

在需求澄清、Spec 和 Tickets 完成前，尽量保持同一个上下文。

但当上下文开始变得混乱时，应该使用：

```text
/handoff 下一会话继续完成工单拆分
```

而不是让模型在退化的长上下文中继续猜测。

参考：<https://github.com/mattpocock/skills/blob/main/skills/engineering/ask-matt/SKILL.md>

---

# 十二、最终速查表

```text
不知道用什么
→ /ask-matt

项目第一次安装
→ /setup-matt-pocock-skills

代码需求还不清楚
→ /grill-with-docs

非代码计划还不清楚
→ /grill-me

把已有讨论变成规格
→ /to-spec

把规格拆成独立工单
→ /to-tickets

根据工单开发
→ /implement

测试驱动开发
→ /tdd

困难 Bug 或性能回归
→ /diagnosing-bugs

需要运行结果验证设计
→ /prototype

需要查询官方资料
→ /research

维护领域词汇与 ADR
→ /domain-modeling

设计深模块和 Seam
→ /codebase-design

审查分支是否符合规范和需求
→ /code-review main

解决 Merge 或 Rebase 冲突
→ /resolving-merge-conflicts

扫描架构问题
→ /improve-codebase-architecture

规划超大型、方向不明的工作
→ /wayfinder

处理 Issue 和外部 PR
→ /triage

切换到新会话
→ /handoff

建立长期学习工作区
→ /teach

设计或审查自己的 Skill
→ /writing-great-skills
```

这套仓库最值得借鉴的，并不是某一个单独提示词，而是它形成的完整工程闭环：

```text
先澄清
→ 再记录领域语言
→ 再形成规格
→ 再拆成纵向工单
→ 用反馈循环实现
→ 分离审查“代码质量”和“需求正确性”
→ 把经验写回项目
```

它试图解决的核心问题，是让 Agent 不只是“更快写代码”，而是更稳定地参与真正的软件工程过程。

---

## 参考入口

- 仓库主页：<https://github.com/mattpocock/skills>
- Engineering Skills：<https://github.com/mattpocock/skills/tree/main/skills/engineering>
- Productivity Skills：<https://github.com/mattpocock/skills/tree/main/skills/productivity>
- Misc Skills：<https://github.com/mattpocock/skills/tree/main/skills/misc>
- Personal Skills：<https://github.com/mattpocock/skills/tree/main/skills/personal>
- In Progress Skills：<https://github.com/mattpocock/skills/tree/main/skills/in-progress>
- Deprecated Skills：<https://github.com/mattpocock/skills/tree/main/skills/deprecated>
