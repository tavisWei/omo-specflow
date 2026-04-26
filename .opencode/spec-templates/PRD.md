# PRD — 产品需求文档（Product Requirements Document）
<!-- depends-on: none -->
<!-- required-for: web, api, cli -->
<!-- generation-order: 0 -->
<!-- artifact: PRD.md -->

<!-- AGENT: 这是上游文档链的根模板，在 Constitution 之前生成。采用大纲优先、渐进细化方式。先生成一级大纲骨架，等用户确认后再逐章填充。 -->

## 一级大纲骨架 | Level-1 Outline Skeleton

<!-- AGENT: 首先生成以下 5 个一级章节的骨架（仅标题 + 1 句引导语），输出给用户确认。不要直接填充详细内容。 -->

### 1. 项目背景与定位 | Project Background & Positioning

<!-- AGENT: 一级大纲骨架 — 仅写"本项目旨在……，面向……用户，解决……问题"。等用户确认大纲后再细化。 -->

### 2. 目标用户与场景 | Target Users & Scenarios

<!-- AGENT: 一级大纲骨架 — 仅写"核心用户群体为……，主要使用场景包括……"。等用户确认后再细化。 -->

### 3. 核心功能范围 | Core Feature Scope

<!-- AGENT: 一级大纲骨架 — 仅列举 3-5 个核心功能名称。等用户确认后再展开为用户故事。 -->

### 4. 非功能要求 | Non-Functional Requirements

<!-- AGENT: 一级大纲骨架 — 仅写"性能/安全/可用性/可观测性各有基本要求"。等用户确认后再量化。 -->

### 5. 约束与排除 | Constraints & Out-of-Scope

<!-- AGENT: 一级大纲骨架 — 仅写"技术/资源/合规/时间约束"和"明确不在范围内的功能"。等用户确认后再展开。 -->

---

> **大纲确认流程**: 输出上述骨架 → 等待用户确认或调整 → 用户输入"已确认大纲"后进入二级细化。

---

## 二级细化内容 | Level-2 Detailed Content

> 以下章节仅在用户确认一级大纲后填充。

### 1. 项目背景与定位 | Project Background & Positioning

#### 1.1 项目存在理由 | Why This Exists

<!-- AGENT: 从用户输入和面试结果推导。至少 2 句话。解决什么问题、为什么现在要做。 -->

#### 1.2 产品定位 | Product Positioning

<!-- AGENT: 一句话定位。格式："为 [目标用户] 提供 [核心价值] 的 [产品类型]"。 -->

#### 1.3 成功定义 | Success Definition

<!-- AGENT: 可量化的成功指标。至少 3 个。示例："月活 ≥10K，核心流程完成率 ≥90%，P0 Bug 清零" -->

#### 1.4 5 年愿景 | 5-Year Vision

<!-- AGENT: 项目成熟后的理想状态。 -->

---

### 2. 目标用户与场景 | Target Users & Scenarios

#### 2.1 用户角色 | User Roles

<!-- AGENT: 列出 2-5 个用户角色，每个角色包含：名称、描述、核心诉求、使用频率。 -->

| 角色 Role | 描述 Description | 核心诉求 Core Need | 使用频率 Frequency |
|---|---|---|---|
| <!-- AGENT: 如 "运营人员" --> | <!-- AGENT: 描述 --> | <!-- AGENT: 核心诉求 --> | <!-- AGENT: 每日/每周/偶尔 --> |

#### 2.2 核心场景 | Core Scenarios

<!-- AGENT: 每个核心场景用 Given/When/Then 描述。至少 3 个。 -->

**场景 1**: <!-- AGENT: 场景名称 -->
- **Given** <!-- AGENT: 前置条件 -->
- **When** <!-- AGENT: 用户操作 -->
- **Then** <!-- AGENT: 预期结果 -->

**场景 2**: <!-- AGENT: 场景名称 -->
- **Given** <!-- AGENT: 前置条件 -->
- **When** <!-- AGENT: 用户操作 -->
- **Then** <!-- AGENT: 预期结果 -->

**场景 3**: <!-- AGENT: 场景名称 -->
- **Given** <!-- AGENT: 前置条件 -->
- **When** <!-- AGENT: 用户操作 -->
- **Then** <!-- AGENT: 预期结果 -->

#### 2.3 用户旅程 | User Journeys

<!-- AGENT: 用 Mermaid flowchart 描述关键用户旅程。 -->

```mermaid
flowchart LR
    <!-- AGENT: 根据核心场景生成用户旅程图 -->
```

---

### 3. 核心功能范围 | Core Feature Scope

#### 3.1 P0 功能（必须有）| P0 Features

<!-- AGENT: 列出 MVP 必须包含的功能。每个功能包含：名称、描述、验收标准。 -->

| # | 功能 Feature | 描述 Description | 验收标准 Acceptance |
|---|---|---|---|
| 1 | <!-- AGENT: 功能名 --> | <!-- AGENT: 描述 --> | <!-- AGENT: 可量化验收条件 --> |
| 2 | <!-- AGENT: 功能名 --> | <!-- AGENT: 描述 --> | <!-- AGENT: 验收条件 --> |
| 3 | <!-- AGENT: 功能名 --> | <!-- AGENT: 描述 --> | <!-- AGENT: 验收条件 --> |

#### 3.2 P1 功能（应该有）| P1 Features

<!-- AGENT: 重要但不阻塞 MVP 的功能。 -->

| # | 功能 Feature | 描述 Description | 延后理由 Deferral Reason |
|---|---|---|---|
| 1 | <!-- AGENT: 功能名 --> | <!-- AGENT: 描述 --> | <!-- AGENT: 为什么不是 P0 --> |

#### 3.2 P2 功能（可以有）| P2 Features

<!-- AGENT: 锦上添花的功能。 -->

#### 3.3 不在范围内 | Out of Scope

<!-- AGENT: 明确排除的功能。至少 3 项。 -->

- <!-- AGENT: 排除项 + 排除理由 -->
- <!-- AGENT: 排除项 + 排除理由 -->
- <!-- AGENT: 排除项 + 排除理由 -->

---

### 4. 非功能要求 | Non-Functional Requirements

#### 4.1 性能 | Performance

<!-- AGENT: 量化性能指标。 -->

| 指标 Metric | 目标值 Target | 测量方式 Measurement |
|---|---|---|
| <!-- AGENT: 如 "API P95 响应时间" --> | <!-- AGENT: 如 "< 300ms" --> | <!-- AGENT: 如 "APM 监控" --> |
| <!-- AGENT: 如 "首屏可交互时间" --> | <!-- AGENT: 如 "< 2.5s" --> | <!-- AGENT: 如 "Lighthouse" --> |

#### 4.2 可用性 | Reliability

<!-- AGENT: 可用性指标。 -->
- <!-- AGENT: 如 "关键流程提交失败不丢输入" -->
- <!-- AGENT: 如 "系统错误提供可重试机制" -->

#### 4.3 安全 | Security

<!-- AGENT: 安全要求。 -->
- <!-- AGENT: 如 "所有受保护资源必须验证会话和权限" -->
- <!-- AGENT: 如 "敏感字段不得在响应中明文返回" -->

#### 4.4 可观测性 | Observability

<!-- AGENT: 可观测性要求。 -->
- <!-- AGENT: 如 "关键写操作必须有审计日志" -->
- <!-- AGENT: 如 "错误必须带 requestId 便于追踪" -->

---

### 5. 约束与排除 | Constraints & Out-of-Scope

#### 5.1 技术约束 | Technical Constraints

<!-- AGENT: 语言版本、框架限制、浏览器兼容等。 -->
- <!-- AGENT: 如 "TypeScript 5.x, Node.js 20+" -->

#### 5.2 资源约束 | Resource Constraints

<!-- AGENT: 团队规模、预算、时间线。 -->
- <!-- AGENT: 如 "2 人开发，6 周 MVP" -->

#### 5.3 合规约束 | Compliance Constraints

<!-- AGENT: 数据隐私、行业规范等。 -->
- <!-- AGENT: 如 "GDPR 兼容" 或 "N/A" -->

#### 5.4 时间约束 | Timeline Constraints

<!-- AGENT: 里程碑、截止日期。 -->
- <!-- AGENT: 如 "第 1-2 周基础架构，第 3-4 周核心功能，第 5-6 周测试上线" -->

---

## 文档间契约 | Downstream Contracts

<!-- AGENT: 本节告诉后续上游文档和下游 SPEC 模板该从本文档读取什么。 -->

- `COMPETITOR-RESEARCH.md` 必须继承本文档的产品定位和核心场景。
- `ARCHITECTURE.md` 必须继承本文档的功能规模、非功能要求和约束。
- `UIUX.md` 必须继承本文档的核心场景和用户角色。
- `PRODUCT-DESIGN.md` 必须继承本文档的 P0 功能列表。
- 下游 `01-需求文档.md` 必须继承本文档的用户故事和验收标准。
- 下游 `02-技术架构.md` 必须继承本文档的非功能要求和约束。

---

## Agent 生成检查表 | Agent Completion Checklist

- [ ] 一级大纲已输出并经用户确认
- [ ] 5 个一级章节全部有二级细化内容
- [ ] 至少 3 个核心场景
- [ ] P0 功能有可量化验收标准
- [ ] 有明确的 Out of Scope
- [ ] 非功能要求已量化
- [ ] 零 `[placeholder]` 残留
