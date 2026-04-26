# TODO 桥接文档（Spec-to-Todo Bridge）
<!-- depends-on: SPEC.md, PRD.md, ARCHITECTURE.md, UIUX.md, PRODUCT-DESIGN.md -->
<!-- required-for: web, api, cli -->
<!-- generation-order: 0.6 -->
<!-- artifact: TODO.md -->

<!-- AGENT: 该文档是 SPEC 到 TASKS 的显式桥接层。先把需求、架构、UIUX、产品设计中的可实现项整理成结构化 TODO，再由 plan/tasks 阶段把 TODO 转成 TASKS.md。 -->

## 1. 目标 | Goal

- 将 `SPEC.md` 中的条款、`PRD.md` 中的功能、以及上游文档中的页面/架构约束，整理成可分发的 TODO 单元。

## 2. TODO 列表 | TODO Items

| TODO ID | 来源 Source | 范围 Scope | 优先级 Priority | 说明 Notes |
|---|---|---|---|---|
| <!-- AGENT: TODO-001 --> | <!-- AGENT: US-1 / AC-1 / 页面名 --> | <!-- AGENT: 前端/后端/共享 --> | P0 | <!-- AGENT: 待实现说明 --> |

## 3. 与 TASKS 的映射规则 | Mapping to TASKS

- 每个 TODO 必须映射到 1 个或多个 `## Task N`。
- `TASKS.md` 中每个任务必须能回溯到至少 1 个 TODO ID。
- 不允许直接跳过 TODO 层从 SPEC 生成 TASKS。

## 4. Agent 生成检查表 | Agent Completion Checklist

- [ ] 所有 P0/P1 条款都已映射到 TODO
- [ ] TODO 覆盖页面功能缺口与架构约束
- [ ] 每个 TODO 都可下钻到 TASKS.md
