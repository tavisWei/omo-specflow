# OMO-SpecFlow

## 规格驱动开发工作流系统 | Spec-Driven Development Workflow System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Workflow: 10 Phases](https://img.shields.io/badge/Workflow-10%20Phases-blue.svg)](.opencode/hooks/omo-specflow/state.ts)
[![Templates: 18 Docs](https://img.shields.io/badge/Templates-18%20Docs-green.svg)](.opencode/spec-templates/)
[![Agent Instructions: 22 Files](https://img.shields.io/badge/Agent%20Instructions-22%20Files-orange.svg)](.opencode/agent-instructions/)

> 最终验收手册 | Final Acceptance Manual: [`FINAL-ACCEPTANCE.md`](./FINAL-ACCEPTANCE.md)

---

## 项目介绍 | Project Introduction

OMO-SpecFlow 是一套**规格驱动开发**（Spec-Driven Development）工作流系统。它通过结构化的需求分析、规格编写、任务分解、测试治理和持续验证，确保开发过程始终以规格文档为中心，实现高质量的软件交付。

> OMO-SpecFlow is a **spec-driven development** workflow system. Through structured requirements analysis, specification authoring, task decomposition, test governance, and continuous verification, it ensures the development process always centers on specification documents, achieving high-quality software delivery.

**核心价值 | Core Value:**

- **规格先行** | Spec-First: 任何开发工作都从编写清晰、可验证的规格文档开始
- **双向追溯** | Bidirectional Traceability: 规格条款、TODO、任务实现、测试证据相互关联，确保需求不遗漏
- **渐进式规划** | Incremental Planning: 将大型需求拆解为可并行执行的原子任务
- **持续验证** | Continuous Verification: 实现、测试、联调、回归阶段都有门控与证据要求

---

## 系统架构 | System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Input                                     │
│      用户输入 (/spec-start /sf-new /sf-spec /sf-iterate /sf-bugfix)        │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                        Intent Detection Hook                                 │
│                           意图检测 & 工作流启动                                │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  自动识别开发意图 → 初始化状态机 → 入口模式选择 → 项目轨道面试         │  │
│  │  模式: Greenfield / Direct-Spec / Brownfield Feature / Bugfix        │  │
│  │  轨道: Web 全栈 / API 服务 / CLI 工具                                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                      Agent Instruction Layer                                 │
│                          Agent 指令层（约束性 Prompt）                        │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  00-golden-path → 18-discovery → 19-architecture → 20-design         │  │
│  │  01-constitution → 02-specify → 03-plan → 04-tasks                   │  │
│  │  05-implement → 06-complete + governance / brownfield docs           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                        SPEC Workflow (10 Phases)                            │
│                              规格驱动工作流                                    │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ discovery → architecture → design → constitution → specify           │  │
│  │ → plan → tasks → implement → test → complete                         │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌─────────────────────────────────▼───────────────────────────────────────────┐
│                    Orchestrator + Review + Tracker                          │
│                            编排、审查、追踪与证据治理                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  orchestrator.ts      — 正式执行入口 + 生命周期推进                    │  │
│  │  task-dispatcher.ts   — TASKS 解析、Wave 划分、任务分发                │  │
│  │  spec-review.ts       — 审查、门控、交付检查                           │  │
│  │  spec-tracker.ts      — 条款 / TODO / Task / Bugfix 追踪               │  │
│  │  artifact-coverage.ts — 上游文档覆盖与预检                             │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 入口模式 | Entry Modes

| 模式 | 适用场景 | 起始切入点 | 最佳实践输出 |
|---|---|---|---|
| Greenfield | 从 0 到 1 项目开发 | Discovery | 完整上游文档链 + SPEC + TODO + TASKS |
| Direct-Spec | 已有明确需求和原型图 | Architecture / Design 对齐 | 快速沉淀 SPEC + TODO + TASKS |
| Brownfield Feature | 功能迭代 | 影响分析 / 增量 Spec | Delta Spec + Regression Plan + 增量 TODO/TASKS |
| Bugfix | 修复 BUG | Bug Intake / Root Cause | Bug TODO + 修复任务 + 验证/回归证据 |

### 入口命令表 | Commands

| 命令 | 模式 | 用途 |
|---|---|---|
| `/spec-start` | Guided Entry | 通用入口，先选模式 |
| `/sf-new` | Greenfield | 从 0 到 1 新项目 |
| `/sf-spec` | Direct-Spec | 已有需求和原型图 |
| `/sf-iterate` | Brownfield Feature | 功能迭代 |
| `/sf-bugfix` | Bugfix | 修复 BUG |

---

## 目录结构 | Directory Structure

```
.opencode/
├── commands/
│   ├── spec-start.md           # 通用入口
│   ├── sf-new.md               # Greenfield 快捷入口
│   ├── sf-spec.md              # Direct-Spec 快捷入口
│   ├── sf-iterate.md           # Brownfield Feature 快捷入口
│   └── sf-bugfix.md            # Bugfix 快捷入口
│
├── hooks/
│   └── omo-specflow/
│       ├── hook.ts             # 意图检测插件入口
│       ├── state.ts            # 工作流状态机 (10阶段 + 质量门控)
│       ├── task-dispatcher.ts  # Atlas 并行任务调度器
│       ├── orchestrator.ts     # 正式执行编排器
│       ├── spec-review.ts      # Momus 规格合规审查
│       ├── spec-tracker.ts     # 规格条款 / TODO / Bugfix 追踪器
│       └── artifact-coverage.ts# 上游文档覆盖与预检
│
├── agent-instructions/         # Agent 指令层
│   ├── 00-golden-path.md
│   ├── 01-constitution.md
│   ├── 02-specify.md
│   ├── 03-plan.md
│   ├── 04-tasks.md
│   ├── 05-implement.md
│   ├── 06-complete.md
│   ├── 07-phase-gates.md
│   ├── 08-traceability-matrix.md
│   ├── 09-change-management.md
│   ├── 10-delivery-checklist.md
│   ├── 11-spec-index.md
│   ├── 12-review-protocol.md
│   ├── 13-evidence-convention.md
│   ├── 14-handoff-format.md
│   ├── 15-brownfield-mode.md
│   ├── 16-impact-analysis.md
│   ├── 17-regression-planning.md
│   ├── 18-discovery.md
│   ├── 19-architecture.md
│   ├── 20-design.md
│   └── tasks-format-spec.md
│
├── spec-templates/
│   ├── TEMPLATE-GUIDE.md
│   ├── PRD.md
│   ├── COMPETITOR-RESEARCH.md
│   ├── ARCHITECTURE.md
│   ├── UIUX.md
│   ├── PRODUCT-DESIGN.md
│   ├── TODO.md
│   ├── 01-需求文档.md
│   ├── 02-技术架构.md
│   ├── 03-接口文档.md
│   ├── 04-设计规范.md
│   ├── 05-页面流程.md
│   ├── 06-页面功能细节.md
│   ├── 07-数据库设计.md
│   ├── 08-第三方服务集成.md
│   ├── 09-部署架构.md
│   ├── 10-测试策略.md
│   ├── 11-安全规范.md
│   └── 12-性能要求.md
│
└── spec-workflow.tests.ts      # 集成测试

.spec/                          # 运行时工作目录 (自动创建)
├── SPEC.md                     # 规格主文档
├── TODO.md                     # 桥接待办
├── TASKS.md                    # 任务清单
├── .workflow-state.json        # 工作流状态
├── .interview-state.json       # 面试状态
├── .spec-tracker.json          # 条款追踪状态
└── .spec-versions/             # 规格版本历史
```

---

## 安装 | Installation

### 前置要求 | Prerequisites

- [Oh My OpenAgent (OMO)](https://github.com/code-yeongyu/oh-my-openagent) 已安装
- Bun 1.3+

### 一键安装（推荐）| One-Click Install (Recommended)

```bash
git clone https://github.com/tavisWei/omo-specflow.git
cd omo-specflow
./install.sh
```

**选项：**
- `./install.sh` - 全局安装（所有项目可用）
- `./install.sh --project` - 项目安装（仅当前项目）

### 手动安装 | Manual Install

#### 全局安装

```bash
mkdir -p ~/.config/opencode/skills
mkdir -p ~/.config/opencode/commands
mkdir -p ~/.config/opencode/spec-templates
mkdir -p ~/.config/opencode/agent-instructions

cp -r .opencode/hooks/omo-specflow ~/.config/opencode/skills/
cp .opencode/commands/*.md ~/.config/opencode/commands/
cp -r .opencode/spec-templates/* ~/.config/opencode/spec-templates/
cp -r .opencode/agent-instructions/* ~/.config/opencode/agent-instructions/
```

### 验证安装 | Verify Installation

```bash
ls -la .opencode/hooks/omo-specflow/
ls -la .opencode/commands/
ls -la .opencode/spec-templates/
ls -la .opencode/agent-instructions/
```

### 更新到最新版本 | Global Update

```bash
git pull
./update.sh
```

### 项目更新 | Project Update

```bash
git pull
./update.sh --project
```

### 全局安装 / 更新后会同步的内容

- hooks
- commands（含 `spec-start` 和 `sf-*` 快捷入口）
- spec-templates
- agent-instructions

---

## 使用方法 | Usage

### 快速开始 | Quick Start

#### 1. 启动工作流（自动检测）

在 OMO 对话中直接输入：

```text
我要开发用户登录功能
```

系统会自动检测开发意图，并进入对应入口模式与工作流。

#### 2. 启动工作流（显式命令）

```text
/spec-start 开发一个电商后台管理系统
```

快捷入口：

```text
/sf-new
/sf-spec
/sf-iterate
/sf-bugfix
```

### 使用示例 | Usage Examples

#### Greenfield

```text
/sf-new 一个团队协作任务管理系统
```

#### Direct-Spec

```text
/sf-spec
PRD: https://example.com/prd
Prototype: https://example.com/figma
Constraints: Next.js + PostgreSQL, only P0 scope in this iteration
```

#### Brownfield Feature

```text
/sf-iterate 在现有 billing 模块中增加优惠券能力
Affected modules: billing, checkout
Out of scope: reporting
Regression scope: checkout, invoice generation
```

#### Bugfix

```text
/sf-bugfix 登录后跳转 500
Steps to reproduce: ...
Expected: ...
Actual: ...
Impact: checkout users blocked
```

---

## 工作流程 | Workflow Phases

### 阶段总览 | Phase Overview

| Phase | 中文 | 描述 | 输出产物 |
|-------|------|------|----------|
| `discovery` | 需求发现 | PRD 大纲与竞品研究 | PRD.md / COMPETITOR-RESEARCH.md |
| `architecture` | 架构设计 | 候选方案与推荐架构 | ARCHITECTURE.md |
| `design` | 设计对齐 | UIUX、产品设计、页面覆盖 | UIUX.md / PRODUCT-DESIGN.md |
| `constitution` | 宪章制定 | 愿景、价值观和约束条件 | SPEC.md |
| `specify` | 详细规格 | 结构化规格文档 | 按类型生成 spec 模板文档 |
| `plan` | 计划制定 | 创建可执行的实施计划 | TASKS 初版 |
| `tasks` | 任务分解 | 细化任务与 QA 场景 | TASKS 终版 |
| `implement` | 实施执行 | 开发实现与单元测试证据 | 实现代码 + unit evidence |
| `test` | 联调与验证 | 联调、Bugfix 验证、回归 | integration / regression evidence |
| `complete` | 完成交付 | 最终审查，确认所有规格条款已实现 | review + coverage |

---

## 最终验收 | Final Acceptance

当前仓库已经通过以下验收基线：

- Bun 可运行
- `bun test ./.opencode/spec-workflow.tests.ts` 全部通过
- `agent-instructions` 当前为 **22** 份文档
- `spec-templates` 目录当前为 **19** 个文件（其中核心模板文档 **18** 份）
- README / config / tests 已同步

详细步骤与结果请见：[`FINAL-ACCEPTANCE.md`](./FINAL-ACCEPTANCE.md)

---

## 相关文件 | Related Files

| 文件 | 说明 |
|------|------|
| [hook.ts](.opencode/hooks/omo-specflow/hook.ts) | 意图检测插件 |
| [state.ts](.opencode/hooks/omo-specflow/state.ts) | 工作流状态机 |
| [orchestrator.ts](.opencode/hooks/omo-specflow/orchestrator.ts) | 正式执行编排器 |
| [task-dispatcher.ts](.opencode/hooks/omo-specflow/task-dispatcher.ts) | 任务调度器 |
| [spec-review.ts](.opencode/hooks/omo-specflow/spec-review.ts) | 规格审查 |
| [spec-tracker.ts](.opencode/hooks/omo-specflow/spec-tracker.ts) | 条款追踪 |
| [spec-start.md](.opencode/commands/spec-start.md) | 通用入口 |
| [sf-new.md](.opencode/commands/sf-new.md) | Greenfield 快捷入口 |
| [sf-spec.md](.opencode/commands/sf-spec.md) | Direct-Spec 快捷入口 |
| [sf-iterate.md](.opencode/commands/sf-iterate.md) | Feature 迭代快捷入口 |
| [sf-bugfix.md](.opencode/commands/sf-bugfix.md) | Bugfix 快捷入口 |

---

## License

MIT License - see LICENSE file for details
