# OMO-SpecFlow

> Spec-driven development workflow for Greenfield, Direct-Spec, Brownfield Feature, and Bugfix delivery modes.

## Latest Workflow Architecture

- 4 entry modes: `Greenfield`, `Direct-Spec`, `Brownfield Feature`, `Bugfix`
- 10 phases: `Discovery → Architecture → Design → Constitution → Specify → Plan → Tasks → Implement → Test → Complete`
- Enforced bridge: `SPEC → TODO.md → TASKS.md → tracked execution`
- Evidence gates: unit / integration / regression
- Bug-fix lifecycle: `discovered → fixed → verified`
- Shortcut commands: `/sf-new`, `/sf-spec`, `/sf-iterate`, `/sf-bugfix`

## Entry Modes

| Entry Mode | Best For | Cut-in Point | Outputs |
|---|---|---|---|
| Greenfield | 从 0 到 1 新项目 | Discovery | Full upstream docs + SPEC + TODO + TASKS |
| Direct-Spec | 已有明确需求和原型图 | Architecture / Design alignment | SPEC + TODO + TASKS |
| Brownfield Feature | 功能迭代 | Impact Analysis / Delta Spec | Delta spec + regression plan + incremental TODO/TASKS |
| Bugfix | 修复 BUG | Bug Intake / Root Cause | Bug TODO + fix tasks + verification/regression evidence |

## Commands

| Command | Mode | Use Case |
|---|---|---|
| `/spec-start` | Guided entry | 通用入口，先选模式 |
| `/sf-new` | Greenfield | 从 0 到 1 的新项目 |
| `/sf-spec` | Direct-Spec | 已有需求文档、原型图、设计稿 |
| `/sf-iterate` | Brownfield Feature | 现有项目功能迭代 |
| `/sf-bugfix` | Bugfix | 缺陷修复、验证、回归 |

## Usage Examples

### Greenfield

```text
/sf-new 一个团队协作任务管理系统
```

### Direct-Spec

```text
/sf-spec
PRD: https://example.com/prd
Prototype: https://example.com/figma
Constraints: Next.js + PostgreSQL, only P0 scope in this iteration
```

### Brownfield Feature

```text
/sf-iterate 在现有 billing 模块中增加优惠券能力
Affected modules: billing, checkout
Out of scope: reporting
Regression scope: checkout, invoice generation
```

### Bugfix

```text
/sf-bugfix 登录后跳转 500
Steps to reproduce: ...
Expected: ...
Actual: ...
Impact: checkout users blocked
```

## Global Install

```bash
./install.sh
```

Installs globally:

- Hooks: `~/.config/opencode/skills/omo-specflow`
- Commands: `spec-start`, `sf-new`, `sf-spec`, `sf-iterate`, `sf-bugfix`
- Templates: `~/.config/opencode/spec-templates/`
- Agent instructions: `~/.config/opencode/agent-instructions/`

## Project Install

```bash
./install.sh --project
```

## Global Update

```bash
./update.sh
```

## Project Update

```bash
./update.sh --project
```

## Verification

```bash
bun test ./.opencode/spec-workflow.tests.ts
```

Expected result:

```text
179 pass
0 fail
```

## Deliverable Capabilities

- Guided multi-mode entry
- Upstream doc chain for Greenfield
- Direct-Spec absorption from existing requirement/prototype inputs
- Brownfield delta-spec + regression governance
- Bugfix lifecycle tracking and verification gates
- TODO / TASKS / coverage / review alignment
