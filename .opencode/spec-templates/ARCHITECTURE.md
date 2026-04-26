# 架构推荐文档（Architecture Recommendation）
<!-- depends-on: PRD.md, COMPETITOR-RESEARCH.md -->
<!-- required-for: web, api, cli -->
<!-- generation-order: 0.2 -->
<!-- artifact: ARCHITECTURE.md -->

<!-- AGENT: 从 PRD.md 提取功能规模、非功能要求、约束；从 COMPETITOR-RESEARCH.md 提取可行技术方案。生成 2-3 个架构候选方案，对比后推荐最优方案。 -->

## 1. 需求摘要 | Requirements Summary

<!-- AGENT: 从 PRD.md 和 COMPETITOR-RESEARCH.md 提取架构决策所需的关键信息。 -->

### 1.1 功能规模 | Feature Scale

<!-- AGENT: 从 PRD.md 3.1 提取 P0 功能数量和复杂度评估。 -->

- **P0 功能数量**: <!-- AGENT: 数量 -->
- **复杂度评估**: <!-- AGENT: 简单/中等/复杂 -->

### 1.2 非功能要求摘要 | NFR Summary

<!-- AGENT: 从 PRD.md 4 提取关键非功能要求。 -->

| 类型 Type | 关键要求 Key Requirement |
|---|---|
| 性能 | <!-- AGENT: 如 "API P95 < 300ms" --> |
| 可用性 | <!-- AGENT: 如 "关键流程可恢复" --> |
| 安全 | <!-- AGENT: 如 "JWT 认证" --> |

### 1.3 约束摘要 | Constraints Summary

<!-- AGENT: 从 PRD.md 5 提取关键约束。 -->

- **技术约束**: <!-- AGENT: 如 "TypeScript 5.x" -->
- **资源约束**: <!-- AGENT: 如 "2 人开发，6 周" -->
- **合规约束**: <!-- AGENT: 如 "GDPR" 或 "N/A" -->

---

## 2. 架构候选方案 | Architecture Candidates

<!-- AGENT: 生成 2-3 个架构候选方案。每个方案包含：技术栈、架构图、优劣势分析。 -->

### 2.1 方案 A：<!-- AGENT: 方案名称 -->

#### 技术栈 | Tech Stack

| 层级 Layer | 选型 Choice | 理由 Rationale |
|---|---|---|
| 前端 | <!-- AGENT: 如 "Next.js 14" --> | <!-- AGENT: 理由 --> |
| 后端 | <!-- AGENT: 如 "Next.js API Routes" --> | <!-- AGENT: 理由 --> |
| 数据库 | <!-- AGENT: 如 "PostgreSQL + Prisma" --> | <!-- AGENT: 理由 --> |
| 认证 | <!-- AGENT: 如 "NextAuth.js" --> | <!-- AGENT: 理由 --> |
| 部署 | <!-- AGENT: 如 "Vercel" --> | <!-- AGENT: 理由 --> |

#### 架构图 | Architecture Diagram

```mermaid
graph TB
    <!-- AGENT: 根据技术栈生成架构图 -->
```

#### 优势 | Pros

- <!-- AGENT: 优势 1 -->
- <!-- AGENT: 优势 2 -->

#### 劣势 | Cons

- <!-- AGENT: 劣势 1 -->
- <!-- AGENT: 劣势 2 -->

---

### 2.2 方案 B：<!-- AGENT: 方案名称 -->

#### 技术栈 | Tech Stack

| 层级 Layer | 选型 Choice | 理由 Rationale |
|---|---|---|
| 前端 | <!-- AGENT: 选型 --> | <!-- AGENT: 理由 --> |
| 后端 | <!-- AGENT: 选型 --> | <!-- AGENT: 理由 --> |
| 数据库 | <!-- AGENT: 选型 --> | <!-- AGENT: 理由 --> |
| 认证 | <!-- AGENT: 选型 --> | <!-- AGENT: 理由 --> |
| 部署 | <!-- AGENT: 选型 --> | <!-- AGENT: 理由 --> |

#### 架构图 | Architecture Diagram

```mermaid
graph TB
    <!-- AGENT: 根据技术栈生成架构图 -->
```

#### 优势 | Pros

- <!-- AGENT: 优势 1 -->

#### 劣势 | Cons

- <!-- AGENT: 劣势 1 -->

---

## 3. 方案对比 | Comparison

<!-- AGENT: 对比各方案在关键维度上的表现。 -->

| 维度 Dimension | 方案 A | 方案 B | 权重 Weight |
|---|---|---|---|
| 开发效率 | <!-- AGENT: 高/中/低 --> | <!-- AGENT: 高/中/低 --> | 高 |
| 性能潜力 | <!-- AGENT: 高/中/低 --> | <!-- AGENT: 高/中/低 --> | 高 |
| 学习成本 | <!-- AGENT: 低/中/高 --> | <!-- AGENT: 低/中/高 --> | 中 |
| 运维复杂度 | <!-- AGENT: 低/中/高 --> | <!-- AGENT: 低/中/高 --> | 中 |
| 扩展性 | <!-- AGENT: 高/中/低 --> | <!-- AGENT: 高/中/低 --> | 低 |

---

## 4. 推荐方案 | Recommended Solution

### 4.1 推荐结论 | Recommendation

<!-- AGENT: 明确推荐哪个方案。 -->

**推荐方案**: <!-- AGENT: 方案 A/B -->

### 4.2 推荐理由 | Rationale

<!-- AGENT: 解释为什么推荐这个方案。结合 PRD 约束和竞品研究。 -->

1. <!-- AGENT: 理由 1 -->
2. <!-- AGENT: 理由 2 -->
3. <!-- AGENT: 理由 3 -->

### 4.3 风险与缓解 | Risks & Mitigations

| 风险 Risk | 影响 Impact | 缓解措施 Mitigation |
|---|---|---|
| <!-- AGENT: 如 "Vercel 冷启动延迟" --> | <!-- AGENT: 中 --> | <!-- AGENT: 如 "使用 Edge Runtime" --> |

---

## 5. 推荐架构详情 | Recommended Architecture Details

<!-- AGENT: 详细描述推荐方案的架构。 -->

### 5.0 逻辑架构 | Logical Architecture

<!-- AGENT: 描述业务域、模块边界、数据流和职责分层。 -->

```mermaid
flowchart LR
    <!-- AGENT: 根据推荐方案生成逻辑架构图 -->
```

### 5.1 目录结构 | Directory Structure

```
project-root/
<!-- AGENT: 根据推荐方案生成目录结构 -->
```

### 5.2 模块划分 | Module Design

| 模块 Module | 职责 Responsibility | 核心实体 Entities |
|---|---|---|
| <!-- AGENT: 如 "auth" --> | <!-- AGENT: 认证授权 --> | <!-- AGENT: User, Session --> |

### 5.3 数据模型概要 | Data Model Summary

<!-- AGENT: 核心数据实体及其关系。 -->

```mermaid
erDiagram
    <!-- AGENT: 根据核心实体生成 ER 图 -->
```

### 5.4 技术架构 | Technical Architecture

<!-- AGENT: 描述运行时组件、部署拓扑、基础设施依赖、关键技术决策如何落到实现层。 -->

| 组件 Component | 技术实现 Technical Realization | 说明 Notes |
|---|---|---|
| <!-- AGENT: 如 "Web App" --> | <!-- AGENT: 如 "Next.js App Router" --> | <!-- AGENT: 说明 --> |
| <!-- AGENT: 如 "API" --> | <!-- AGENT: 如 "Hono on Node.js" --> | <!-- AGENT: 说明 --> |

---

## 6. 技术决策记录 | Architecture Decision Records

| 日期 Date | 决策 Decision | 理由 Rationale | 影响 Impact |
|---|---|---|---|
| <!-- AGENT: 当前日期 --> | <!-- AGENT: 如 "选择 Next.js 14" --> | <!-- AGENT: 理由 --> | <!-- AGENT: 影响 --> |

---

## 文档间契约 | Downstream Contracts

- `UIUX.md` 必须继承本文档的前端技术栈。
- `PRODUCT-DESIGN.md` 必须继承本文档的数据模型。
- 下游 `02-技术架构.md` 必须继承本文档的推荐方案详情。
- 下游 `07-数据库设计.md` 必须继承本文档的数据模型概要。

---

## Agent 生成检查表 | Agent Completion Checklist

- [ ] 至少 2 个架构候选方案
- [ ] 有方案对比表
- [ ] 有明确的推荐方案和理由
- [ ] 有架构图和目录结构
- [ ] 零 `[placeholder]` 残留
