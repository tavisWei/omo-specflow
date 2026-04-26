# OMO-SpecFlow

> 面向 Greenfield、Direct-Spec、Brownfield Feature、Bugfix 四类场景的规格驱动开发工作流。 | Spec-driven development workflow for Greenfield, Direct-Spec, Brownfield Feature, and Bugfix delivery modes.

## 最新工作流架构 | Latest Workflow Architecture

- 4 个入口模式：`Greenfield`、`Direct-Spec`、`Brownfield Feature`、`Bugfix`
- 10 个阶段：`Discovery → Architecture → Design → Constitution → Specify → Plan → Tasks → Implement → Test → Complete`
- 强制桥接链路：`SPEC → TODO.md → TASKS.md → tracked execution`
- 测试证据门控：unit / integration / regression
- 缺陷生命周期：`discovered → fixed → verified`
- 快捷命令：`/sf-new`、`/sf-spec`、`/sf-iterate`、`/sf-bugfix`

## 入口模式 | Entry Modes

| 模式 | 适用场景 | 起始切入点 | 核心输出 |
|---|---|---|---|
| Greenfield | 从 0 到 1 项目开发 | Discovery | 完整上游文档链 + SPEC + TODO + TASKS |
| Direct-Spec | 已有明确需求和原型图 | Architecture / Design 对齐 | 快速形成 SPEC + TODO + TASKS |
| Brownfield Feature | 功能迭代 | Impact Analysis / Delta Spec | 增量 spec + 回归计划 + 增量 TODO / TASKS |
| Bugfix | 修复 BUG | Bug Intake / Root Cause | Bug TODO + 修复任务 + 验证与回归证据 |

## 入口命令表 | Commands

| 命令 | 模式 | 用途 |
|---|---|---|
| `/spec-start` | Guided entry | 通用入口，先选模式 |
| `/sf-new` | Greenfield | 从 0 到 1 新项目 |
| `/sf-spec` | Direct-Spec | 已有需求文档、原型图、设计稿 |
| `/sf-iterate` | Brownfield Feature | 现有项目功能迭代 |
| `/sf-bugfix` | Bugfix | 缺陷修复、验证、回归 |

## 使用示例 | Usage Examples

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

## 一键安装（推荐） | Global Install

```bash
./install.sh
```

全局安装会同步：

- Hooks: `~/.config/opencode/skills/omo-specflow`
- Commands: `spec-start`, `sf-new`, `sf-spec`, `sf-iterate`, `sf-bugfix`
- Templates: `~/.config/opencode/spec-templates/`
- Agent instructions: `~/.config/opencode/agent-instructions/`

## 项目安装 | Project Install

```bash
./install.sh --project
```

## 更新到最新版本 | Global Update

```bash
git pull
./update.sh
```

## 项目更新 | Project Update

```bash
git pull
./update.sh --project
```

## 验证 | Verification

```bash
bun test ./.opencode/spec-workflow.tests.ts
```

当前预期结果：

```text
179 pass
0 fail
```

## 当前能力概览 | Deliverable Capabilities

- 支持 4 种入口模式的引导式切入
- 支持 Greenfield 的完整上游文档链
- 支持 Direct-Spec 的现成需求 / 原型吸收
- 支持 Brownfield 的增量 spec 与回归治理
- 支持 Bugfix 的缺陷跟踪与验证门控
- 支持 TODO / TASKS / coverage / review 对齐

## 当前仓库状态说明 | Current Repository Notes

- 当前 `agent-instructions` 为 **22** 份文档
- 当前 `spec-templates` 目录共 **19** 个文件（包含 `TEMPLATE-GUIDE.md`）
- 核心模板文档为 **18** 份（不含 guide）
- 当前快捷入口命令为：`spec-start`、`sf-new`、`sf-spec`、`sf-iterate`、`sf-bugfix`
