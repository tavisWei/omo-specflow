# OMO-SpecFlow

## 规格驱动开发工作流系统 | Spec-Driven Development Workflow System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Workflow: 6 Phases](https://img.shields.io/badge/Workflow-6%20Phases-blue.svg)](.opencode/hooks/omo-specflow/state.ts)
[![Templates: 12 Docs](https://img.shields.io/badge/Templates-12%20Docs-green.svg)](.opencode/spec-templates/)
[![Agent Instructions: 19 Files](https://img.shields.io/badge/Agent%20Instructions-19%20Files-orange.svg)](.opencode/agent-instructions/)

> 最终验收手册 | Final Acceptance Manual: [`FINAL-ACCEPTANCE.md`](./FINAL-ACCEPTANCE.md)

---

## 项目介绍 | Project Introduction

OMO-SpecFlow 是一套**规格驱动开发**（Spec-Driven Development）工作流系统。它通过结构化的需求分析、规格编写、任务分解和持续验证，确保开发过程始终以规格文档为中心，实现高质量的软件交付。

> OMO-SpecFlow is a **spec-driven development** workflow system. Through structured requirements analysis, specification authoring, task decomposition, and continuous verification, it ensures the development process always centers on specification documents, achieving high-quality software delivery.

**核心价值 | Core Value:**

- **规格先行** | Spec-First: 任何开发工作都从编写清晰、可验证的规格文档开始
- **双向追溯** | Bidirectional Traceability: 规格条款与任务实现相互关联，确保需求不遗漏
- **渐进式规划** | Incremental Planning: 将大型需求拆解为可并行执行的原子任务
- **持续验证** | Continuous Verification: 实现过程中持续检查与规格的符合度

---

## 系统架构 | System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Input                                     │
│                     用户输入 (我要开发XXX / /spec-start)                    │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                        Intent Detection Hook                                 │
│                           意图检测 & 工作流启动                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  自动识别开发意图 → 初始化状态机 → 3 轨道面试 → 进入 Constitution     │  │
│  │  支持: "我要开发XXX" / "帮我实现XXX" / /spec-start                    │  │
│  │  轨道: Web 全栈 (10Q) / API 服务 (8Q) / CLI 工具 (8Q)               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                      Agent Instruction Layer (NEW)                           │
│                          Agent 指令层（约束性 Prompt）                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  每个阶段有专属指令文件，定义 Agent 的输入/输出/质量标准/完成条件      │  │
│  │  00-golden-path → 01-constitution → 02-specify → 03-plan →           │  │
│  │  04-tasks → 05-implement → 06-complete                               │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                          SPEC Workflow (6 Phases)                            │
│                              规格驱动工作流                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  constitution → specify → plan → tasks → implement → complete        │  │
│  │  宪章制定    → 详细规格 → 制定计划 → 任务分解 → 执行验证 → 完成交付    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                    Atlas Orchestrator (Multi-Agent Dispatch)                 │
│                            Atlas 任务编排器                                  │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  1. 分析 TASKS.md 任务依赖                                            │  │
│  │  2. 划分并行任务组 (Wave 1, Wave 2, ...)                            │  │
│  │  3. 并行分发到不同 Agent:                                              │  │
│  │     ├─ deep (复杂逻辑)     ├─ quick (简单修改)                        │  │
│  │     ├─ visual-engineering  ├─ writing (文档)                         │  │
│  │     └─ unspecified-high   └─ ... 按任务特性路由                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
        ▼                         ▼                         ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│  Agent: deep  │         │ Agent: quick  │         │Agent: writing │
│  复杂逻辑开发   │         │  简单任务执行   │         │  文档生成      │
├───────────────┤         ├───────────────┤         ├───────────────┤
│ • 架构设计    │         │ • 修复Bug     │         │ • API文档     │
│ • 算法实现    │         │ • 改错字       │         │ • 规格文档     │
│ • 核心模块    │         │ • 简单CRUD    │         │ • 注释      │
└───────────────┘         └───────────────┘         └───────────────┘
        │                         │                         │
        └─────────────────────────┼─────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                     Momus Spec Review (Continuous Verification)                │
│                            Momus 规格合规审查                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  每个任务执行前后:                                                       │  │
│  │  • 执行前: 验证任务内容符合 SPEC.md                                      │  │
│  │  • 执行后: 验证交付物符合任务描述                                        │  │
│  │  • 最终:  所有 spec 条款覆盖检查                                        │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                          Spec Tracker (Coverage Report)                      │
│                              规格条款追踪器                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  • US-AC 条款覆盖度追踪    • 任务-条款关联记录                         │  │
│  │  • 版本历史管理            • 覆盖率报告生成                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 目录结构 | Directory Structure

```
.opencode/
├── commands/
│   └── spec-start.md           # /spec-start 3 轨道自适应面试
│
├── hooks/
│   └── omo-specflow/
│       ├── hook.ts             # 意图检测 + 状态机初始化
│       ├── state.ts            # 工作流状态机 (6阶段 + 质量门控)
│       ├── task-dispatcher.ts  # Atlas 并行任务调度器
│       ├── spec-review.ts      # Momus 规格合规审查 (真实验证)
│       └── spec-tracker.ts     # 规格条款追踪器
│
├── agent-instructions/         # Agent 指令层 (NEW)
│   ├── 00-golden-path.md      # 端到端场景设计 (3 场景)
│   ├── 01-constitution.md     # Constitution 阶段指令
│   ├── 02-specify.md          # Specify 阶段指令
│   ├── 03-plan.md             # Plan 阶段指令
│   ├── 04-tasks.md            # Tasks 阶段指令
│   ├── 05-implement.md        # Implement 阶段指令
│   ├── 06-complete.md         # Complete 阶段指令
│   ├── 07-phase-gates.md      # 阶段质量门控
│   ├── 08-traceability-matrix.md # 追踪矩阵规范
│   ├── 09-change-management.md # 规格变更管理
│   ├── 10-delivery-checklist.md # 交付检查清单
│   ├── 11-spec-index.md       # 运行时索引
│   ├── 12-review-protocol.md  # 审查协议
│   ├── 13-evidence-convention.md # 证据规范
│   ├── 14-handoff-format.md   # 交接格式
│   ├── 15-brownfield-mode.md  # 存量项目迭代模式
│   ├── 16-impact-analysis.md  # 影响分析模板
│   ├── 17-regression-planning.md # 回归计划模板
│   └── tasks-format-spec.md   # TASKS.md 格式规范
│
├── spec-templates/             # 12 份约束性 Prompt 模板
│   ├── TEMPLATE-GUIDE.md      # 模板依赖图 + 使用指南 (NEW)
│   ├── 01-需求文档.md          # 用户故事 + 验收标准
│   ├── 02-技术架构.md          # 系统架构 + 技术选型决策树
│   ├── 03-接口文档.md          # API 接口定义
│   ├── 04-设计规范.md          # UI/UX 设计规范
│   ├── 05-页面流程.md          # 页面流程图
│   ├── 06-页面功能细节.md       # 页面功能详述
│   ├── 07-数据库设计.md         # 数据模型 + ORM Schema
│   ├── 08-第三方服务集成.md     # 第三方集成
│   ├── 09-部署架构.md          # 部署方案
│   ├── 10-测试策略.md          # 测试计划
│   ├── 11-安全规范.md          # 安全要求
│   └── 12-性能要求.md          # 性能指标
│
└── spec-workflow.tests.ts      # 集成测试

.spec/                          # 运行时工作目录 (自动创建)
├── SPEC.md                     # 规格主文档
├── TASKS.md                    # 任务清单
├── .workflow-state.json        # 工作流状态
├── .interview-state.json       # 面试状态 (NEW)
├── .spec-tracker.json          # 条款追踪状态
└── .spec-versions/            # 规格版本历史
```

---

## 安装 | Installation

### 前置要求 | Prerequisites

- [Oh My OpenAgent (OMO)](https://github.com/code-yeongyu/oh-my-openagent) 已安装

---

### 一键安装（推荐）| One-Click Install (Recommended)

```bash
# 克隆仓库
git clone https://github.com/tavisWei/omo-specflow.git
cd omo-specflow

# 运行安装脚本
./install.sh
```

**选项**：
- `./install.sh` - 全局安装（所有项目可用）
- `./install.sh --project` - 项目安装（仅当前项目）

---

### 手动安装 | Manual Install

#### 全局安装

```bash
# 创建目录
mkdir -p ~/.config/opencode/skills
mkdir -p ~/.config/opencode/commands
mkdir -p ~/.config/opencode/spec-templates

# 安装 Hook
cp -r .opencode/hooks/omo-specflow ~/.config/opencode/skills/

# 安装命令
cp .opencode/commands/spec-start.md ~/.config/opencode/commands/

# 安装模板
cp -r .opencode/spec-templates/* ~/.config/opencode/spec-templates/
```

#### 项目安装

```bash
# 复制到项目
cp -r .opencode /path/to/your/project/

# 或作为子模块
git submodule add https://github.com/tavisWei/omo-specflow.git .opencode/omo-specflow
```

---

### 验证安装 | Verify Installation

```bash
# 检查文件是否存在
ls -la .opencode/hooks/omo-specflow/
ls -la .opencode/commands/
ls -la .opencode/spec-templates/
```

---

## 使用方法 | Usage

### 快速开始 | Quick Start

#### 1. 启动工作流（自动检测）

在 OMO 对话中直接输入：

```
我要开发用户登录功能
```

系统会自动检测开发意图，进入 constitution 阶段。

#### 1.1 运行支撑层 | Execution Support Layer

除了 12 份主规格模板，当前版本还提供多 Agent 稳定执行所需的治理文档：

- `07-phase-gates.md`：阶段放行标准
- `08-traceability-matrix.md`：需求-任务-证据追踪
- `09-change-management.md`：规格变更管理
- `10-delivery-checklist.md`：最终交付检查
- `12-review-protocol.md`：统一审查协议
- `13-evidence-convention.md`：证据文件规范
- `14-handoff-format.md`：多 Agent / 多会话交接格式
- `15-brownfield-mode.md`：存量项目迭代模式
- `16-impact-analysis.md`：影响分析模板
- `17-regression-planning.md`：回归计划模板

#### 2. 启动工作流（显式命令）

使用 `/spec-start` 命令显式启动：

```
/spec-start 开发一个电商后台管理系统
```

或使用别名：

```
/specflow 开发一个电商后台管理系统
```

#### 3. 回答需求调研问题

系统会通过 Prometheus 面试模式提问，收集：
- 项目类型和领域
- 核心功能
- 技术栈偏好
- 第三方集成需求
- 非功能性需求

#### 4. 查看生成的规格文档

工作流会在 `.spec/` 目录生成文档：

```bash
ls -la .spec/
# SPEC.md          - 规格主文档
# TASKS.md         - 任务清单
# 01-需求文档.md    - 需求文档
# 02-技术架构.md    - 技术架构
# ...
```

---

### 存量项目 / 增量功能开发 | Brownfield / Incremental Development

OMO-SpecFlow 支持从零开始的新项目，也支持在现有项目中开发新功能。你可以用它来迭代已有的代码库。

> OMO-SpecFlow supports both greenfield and brownfield development. Use it to build new features or iterate on existing codebases.

**适用场景 | When to Use:**
- **新功能** | New Features: 给现有系统加新模块。
- **重构** | Refactoring: 重新梳理复杂模块的规格并重构。
- **深度修复** | Complex Fixes: 处理涉及业务逻辑变更的修复任务。

**示例命令 | Example Commands:**
```bash
/spec-start 为现有项目添加支付功能
/spec-start 重构用户认证模块以支持 OAuth2
/spec-start implement a new analytics dashboard for the current app
```

**迭代流程 | Iteration Workflow:**
1. **识别意图** | Intent Detection: 系统发现增量开发需求，加载现有的 `.spec/` 状态。
2. **更新规格** | Spec Update: 更新 `01-需求文档.md` 里的新需求。同步修改受影响的文档，比如 `03-接口文档.md`。
3. **管理变更** | Change Management: 使用 `09-change-management.md` 记录规格的变化。
4. **追加任务** | Incremental Tasks: 在 `TASKS.md` 里加新任务，不会删掉旧任务。
5. **验证** | Verification: 检查新功能是否符合规格，确保不影响原有的功能。

Brownfield 专属文档：
- `15-brownfield-mode.md`
- `16-impact-analysis.md`
- `17-regression-planning.md`

如涉及 schema 或数据迁移，可额外生成：
- `.spec/MIGRATION.md`

---

## 最终验收 | Final Acceptance

当前仓库已经通过以下验收基线：

- Bun 可运行
- `bun test ./.opencode/spec-workflow.tests.ts` 全部通过
- 12 份核心模板齐全且带元数据
- 19 份 instruction / governance / brownfield 文档齐全
- README / config / tests 已同步

详细步骤与结果请见：[`FINAL-ACCEPTANCE.md`](./FINAL-ACCEPTANCE.md)

---

## 工作流程 | Workflow Phases

### 阶段总览 | Phase Overview

| Phase | 中文 | 描述 | 输出产物 |
|-------|------|------|----------|
| `constitution` | 宪章制定 | 定义项目愿景、价值观和约束条件 | 01-需求文档.md (Constitution 部分) |
| `specify` | 详细规格 | 详细需求调研，编写用户故事和验收标准 | 完整规格文档 (12 份模板) |
| `plan` | 计划制定 | 创建可执行的实施计划 | TASKS.md |
| `tasks` | 任务分解 | 拆解为原子化、可验证的任务项 | 带有依赖关系的任务列表 |
| `implement` | 实施执行 | 并行/串行执行任务，持续验证 | 实现代码 + 验证结果 |
| `complete` | 完成 | 最终审查，确认所有规格条款已实现 | 交付物 |

### 阶段转换图 | Phase Transition Diagram

```
┌─────────────┐
│ constitution│ ← 初始阶段
└──────┬──────┘
       │ completePhase()
       ▼
┌─────────────┐
│   specify   │ ← 详细需求调研
└──────┬──────┘
       │ completePhase()
       ▼
┌─────────────┐
│    plan     │ ← 制定实施计划
└──────┬──────┘
       │ completePhase()
       ▼
┌─────────────┐
│    tasks    │ ← 任务分解
└──────┬──────┘
       │ completePhase()
       ▼
┌─────────────┐
│ implement   │ ← 执行实施 (可循环)
└──────┬──────┘
       │ completePhase()
       ▼
┌─────────────┐
│  complete   │ ← 终止状态
└─────────────┘
```

---

## 使用方法 | Usage

### 触发方式 | Trigger Methods

#### 1. 自动检测 (推荐) | Auto Detection (Recommended)

当用户输入包含开发意图的语句时，系统自动检测并启动工作流：

```
用户: "我要开发用户登录功能"
系统: [检测到开发意图] → 自动进入 constitution 阶段
```

**检测模式 | Detection Patterns:**

| 模式 | 示例 |
|------|------|
| `我要开发XXX` | "我要开发购物车" |
| `帮我实现XXX` | "帮我实现支付模块" |
| `我想添加XXX` | "我想添加评论功能" |
| `build XXX` | "build a user dashboard" |
| `implement XXX` | "implement the checkout flow" |

#### 2. 显式命令 | Explicit Command

使用 `/spec-start` 命令显式启动工作流：

```
/spec-start <项目描述>
```

示例：
```
/spec-start 一个支持多租户的电商后台管理系统
```

### 工作流操作 | Workflow Operations

```typescript
// 导入状态管理
import { 
  getState, 
  setState, 
  nextPhase, 
  completePhase, 
  reset,
  type WorkflowPhase 
} from '.opencode/hooks/omo-specflow/state';

// 获取当前状态
const state = await getState();
console.log(state.phase); // "constitution"

// 进入下一阶段 (需先完成当前阶段)
await completePhase();
const newState = await nextPhase();

// 跳转到指定阶段
await setState({ phase: 'specify' });

// 重置工作流
await reset('constitution');
```

### 任务调度 | Task Dispatching

```typescript
// 导入任务调度器
import { 
  SpecTaskDispatcher,
  dispatchAllTasks 
} from '.opencode/hooks/omo-specflow/task-dispatcher';

const dispatcher = new SpecTaskDispatcher();

// 从 TASKS.md 解析任务
const tasks = await dispatcher.parseTasks('.spec/TASKS.md');

// 构建执行计划 (分析依赖)
const groups = dispatcher.buildExecutionPlan(tasks);

// 生成调度指令
for (const group of groups) {
  const dispatches = dispatcher.generateDispatchCalls(group);
  for (const dispatch of dispatches) {
    console.log(`Dispatch ${dispatch.taskIds} with category: ${dispatch.category}`);
    // task(category=dispatch.category, skills=dispatch.skills, ...)
  }
}
```

### 规格审查 | Spec Review

```typescript
// 导入规格审查
import { 
  performSpecReview,
  preFlightCheck,
  formatReviewResult 
} from '.opencode/hooks/omo-specflow/spec-review';

// 执行预检
const preFlight = await preFlightCheck();
console.log(preFlight.ready); // true/false

// 执行规格审查
const result = await performSpecReview('.spec/TASKS.md');
console.log(result.verdict); // "OKAY" | "REJECT" | "WARNING"

// 格式化输出
console.log(formatReviewResult(result));
```

### 条款追踪 | Clause Tracking

```typescript
// 导入条款追踪
import { 
  registerClause,
  recordTaskSpecRefs,
  completeTask,
  markClauseComplete,
  getIncompleteClauses,
  generateCoverageReport 
} from '.opencode/hooks/omo-specflow/spec-tracker';

// 注册规格条款
await registerClause('US-001', '01-需求文档', '用户登录', '用户可以通过用户名密码登录');

// 记录任务与条款的关联
await recordTaskSpecRefs('task-001', ['US-001', 'AC-001.1']);

// 标记任务完成，自动更新条款状态
await completeTask('task-001');

// 生成覆盖率报告
const coverage = await generateCoverageReport();
console.log(`${coverage.coveragePercent}% clauses completed`);
```

---

## 模板预览 | Template Preview

### 需求文档结构 | Requirements Document Structure

```markdown
# 需求文档

## Constitution（项目宪章）
### 愿景 Vision
### 价值观 Values
### 约束 Constraints

## Specify（详细规格）
### 用户故事格式
US-XXX: [标题]
**角色 Role**: 
**行为 Behavior**: 
**价值 Value**: 

### 验收标准格式
AC-XXX: [描述]
**测试方式**: 
**通过条件**: 
```

### 任务文档格式 | Task Document Format

```markdown
## Task 1: 实现用户登录
category: deep
skills: ["git-master"]
Parallelization: can run in parallel: yes
Blocked By: Task 3

[任务详细描述...]

**Acceptance Criteria**:
- [ ] AC-001.1 验证通过
- [ ] AC-001.2 验证通过

**References**:
- .spec/SPEC.md (US-001, AC-001.1)
```

---

## 术语表 | Terminology Glossary

### 核心概念 | Core Concepts

| English | 中文 | 说明 |
|---------|------|------|
| Spec (Specification) | 规格/规格文档 | 描述系统需求和行为的正式文档 |
| User Story (US) | 用户故事 | 从用户角度描述需求的格式 |
| Acceptance Criteria (AC) | 验收标准 | 可测试、可验证的完成条件 |
| Clause | 条款 | 规格文档中的具体条目 (US/AC) |
| Constitution | 宪章 | 项目愿景、价值观和约束条件 |
| Task | 任务 | 可执行的工作单元 |
| Wave | 批次 | 任务执行的批次划分 |

### 工作流 | Workflow

| English | 中文 | 说明 |
|---------|------|------|
| Phase | 阶段 | 工作流的六个主要步骤 |
| State Machine | 状态机 | 管理工作流阶段转换的机制 |
| Transition | 转换 | 阶段之间的转移 |
| Complete Phase | 完成阶段 | 标记当前阶段已完成 |
| Next Phase | 下一阶段 | 进入下一个阶段 |
| Recovery | 恢复 | 从中断处恢复工作流 |

### 任务调度 | Task Dispatching

| English | 中文 | 说明 |
|---------|------|------|
| Task Dispatcher | 任务调度器 | 解析任务、分析依赖的组件 |
| Parallel Group | 并行组 | 可同时执行的任务集合 |
| Dependency Analysis | 依赖分析 | 确定任务执行顺序 |
| Topological Sort | 拓扑排序 | 基于依赖的任务排序 |
| Background Execution | 后台执行 | 异步并行执行任务 |
| Category | 分类 | 任务类型 (quick/deep/writing/...) |

### 审查与追踪 | Review & Tracking

| English | 中文 | 说明 |
|---------|------|------|
| Spec Review | 规格审查 | Momus 风格的合规性检查 |
| Pre-flight Check | 预检 | 工作流启动前检查 |
| Coverage Report | 覆盖率报告 | 条款完成情况统计 |
| Clause Tracking | 条款追踪 | 记录条款与任务的关联 |
| Verdict | 判定结果 | OKAY / WARNING / REJECT |
| Discrepancy | 差异 | 实现与规格的不一致 |

---

## 状态文件 | State Files

### 工作流状态 | Workflow State

```json
// .spec/.workflow-state.json
{
  "phase": "implement",
  "phaseCompleted": true,
  "initializedAt": 1712832000000,
  "phaseStartedAt": 1712835600000,
  "sessionId": "session-xxx",
  "metadata": {
    "constitution": { "vision": "..." },
    "specify": { "templates": ["01-需求文档.md", ...] }
  }
}
```

### 条款追踪状态 | Spec Tracker State

```json
// .spec/.spec-tracker.json
{
  "currentVersion": "v1.0",
  "clauses": {
    "US-001": {
      "id": "US-001",
      "section": "01-需求文档",
      "title": "用户登录",
      "content": "...",
      "completed": true,
      "completedAt": 1712835600000,
      "addressedBy": "task-001"
    }
  },
  "taskRefs": {
    "task-001": {
      "taskId": "task-001",
      "clauseIds": ["US-001", "AC-001.1"],
      "createdAt": 1712832000000,
      "completedAt": 1712835600000
    }
  },
  "versionHistory": [...]
}
```

---

## 最佳实践 | Best Practices

### 1. 宪章优先 | Constitution First

在进入详细规格之前，先明确项目的愿景、价值观和约束条件。这将作为后续所有决策的参考依据。

> Before entering detailed specifications, first clarify the project's vision, values, and constraints. This will serve as the reference for all subsequent decisions.

### 2. 条款可测试 | Testable Clauses

每条 US/AC 都应该是可测试的，避免模糊的描述：

```
❌ AC: "用户界面应该美观"
✅ AC: "页面加载时间 < 2秒，LCP < 1.2秒"
```

### 3. 任务原子化 | Atomic Tasks

每个任务应该：
- 可以在 2-4 小时内完成
- 有明确的完成标准
- 可独立验证

### 4. 持续验证 | Continuous Verification

在 implement 阶段，每个任务完成后都应该运行 preFlightCheck()，确保整体进度符合预期。

### 5. 变更追踪 | Change Tracking

当规格变更时，使用 updateSpecVersion() 记录版本历史，保持完整的可追溯性。

---

## 相关文件 | Related Files

| 文件 | 说明 |
|------|------|
| [hook.ts](.opencode/hooks/omo-specflow/hook.ts) | 意图检测插件 |
| [state.ts](.opencode/hooks/omo-specflow/state.ts) | 工作流状态机 |
| [task-dispatcher.ts](.opencode/hooks/omo-specflow/task-dispatcher.ts) | 任务调度器 |
| [spec-review.ts](.opencode/hooks/omo-specflow/spec-review.ts) | 规格审查 |
| [spec-tracker.ts](.opencode/hooks/omo-specflow/spec-tracker.ts) | 条款追踪 |
| [spec-start.md](.opencode/commands/spec-start.md) | 启动命令 |
| [spec-workflow.tests.ts](.opencode/spec-workflow.tests.ts) | 集成测试 |

---

## License

MIT License - see LICENSE file for details
