# 竞品研究文档（Competitor Research）
<!-- depends-on: PRD.md -->
<!-- required-for: web, api, cli -->
<!-- generation-order: 0.1 -->
<!-- artifact: COMPETITOR-RESEARCH.md -->

<!-- AGENT: 从 PRD.md 提取产品定位和核心场景，使用 grep_app_searchGitHub 搜索竞品，分析功能覆盖、技术栈、用户体验。 -->

## 1. 研究范围 | Research Scope

<!-- AGENT: 从 PRD.md 的产品定位和核心场景推导研究范围。 -->

### 1.1 产品定位摘要 | Product Positioning Summary

<!-- AGENT: 从 PRD.md 1.2 提取一句话定位。 -->

### 1.2 核心场景摘要 | Core Scenarios Summary

<!-- AGENT: 从 PRD.md 2.2 提取 3 个核心场景。 -->

### 1.3 搜索关键词 | Search Keywords

<!-- AGENT: 从核心场景推导 GitHub 搜索关键词。 -->

| 关键词 Keyword | 搜索意图 Search Intent |
|---|---|
| <!-- AGENT: 如 "todo api typescript" --> | <!-- AGENT: 寻找同类 API 项目 --> |
| <!-- AGENT: 如 "ecommerce admin nextjs" --> | <!-- AGENT: 寻找同类前端项目 --> |

---

## 2. 竞品清单 | Competitor List

<!-- AGENT: 使用 grep_app_searchGitHub 工具搜索 GitHub 竞品。至少找到 3 个相关项目。 -->

### 2.1 GitHub 竞品 | GitHub Competitors

| # | 项目 Project | Stars | 语言 Language | 相关度 Relevance |
|---|---|---|---|---|
| 1 | <!-- AGENT: 项目名 + 链接 --> | <!-- AGENT: Stars 数 --> | <!-- AGENT: 主语言 --> | <!-- AGENT: 高/中/低 --> |
| 2 | <!-- AGENT: 项目名 + 链接 --> | <!-- AGENT: Stars 数 --> | <!-- AGENT: 主语言 --> | <!-- AGENT: 相关度 --> |
| 3 | <!-- AGENT: 项目名 + 链接 --> | <!-- AGENT: Stars 数 --> | <!-- AGENT: 主语言 --> | <!-- AGENT: 相关度 --> |

### 2.2 市场竞品 | Market Competitors

<!-- AGENT: 如果有公开的市场竞品（SaaS 产品），列出 2-3 个。 -->

| # | 产品 Product | 定位 Positioning | 价格 Pricing |
|---|---|---|---|
| 1 | <!-- AGENT: 产品名 --> | <!-- AGENT: 一句话定位 --> | <!-- AGENT: 免费/付费 --> |

---

## 3. 功能对比 | Feature Comparison

<!-- AGENT: 从 PRD.md 3.1 P0 功能列表提取功能点，与竞品对比。 -->

| 功能 Feature | 本项目 Ours | 竞品 A | 竞品 B | 竞品 C |
|---|---|---|---|---|
| <!-- AGENT: P0 功能 1 --> | <!-- AGENT: 计划支持 --> | <!-- AGENT: 支持/不支持/部分 --> | <!-- AGENT: 支持/不支持 --> | <!-- AGENT: 支持/不支持 --> |
| <!-- AGENT: P0 功能 2 --> | <!-- AGENT: 计划支持 --> | <!-- AGENT: 竞品表现 --> | <!-- AGENT: 竞品表现 --> | <!-- AGENT: 竞品表现 --> |
| <!-- AGENT: P0 功能 3 --> | <!-- AGENT: 计划支持 --> | <!-- AGENT: 竞品表现 --> | <!-- AGENT: 竞品表现 --> | <!-- AGENT: 竞品表现 --> |

---

## 4. 技术栈对比 | Tech Stack Comparison

<!-- AGENT: 分析竞品的技术栈选择。 -->

| 技术层 Layer | 本项目 Ours | 竞品 A | 竞品 B |
|---|---|---|---|
| 前端框架 | <!-- AGENT: 从面试结果提取 --> | <!-- AGENT: 竞品技术栈 --> | <!-- AGENT: 竞品技术栈 --> |
| 后端框架 | <!-- AGENT: 从面试结果提取 --> | <!-- AGENT: 竞品技术栈 --> | <!-- AGENT: 竞品技术栈 --> |
| 数据库 | <!-- AGENT: 从面试结果提取 --> | <!-- AGENT: 竞品技术栈 --> | <!-- AGENT: 竞品技术栈 --> |
| 认证方案 | <!-- AGENT: 从面试结果提取 --> | <!-- AGENT: 竞品技术栈 --> | <!-- AGENT: 竞品技术栈 --> |

---

## 5. 用户体验对比 | UX Comparison

<!-- AGENT: 分析竞品的用户体验亮点和不足。 -->

### 5.1 亮点借鉴 | Highlights to Learn

<!-- AGENT: 从竞品中提取值得借鉴的 UX 设计。 -->

- <!-- AGENT: 如 "竞品 A 的批量操作交互流畅" -->
- <!-- AGENT: 如 "竞品 B 的错误提示清晰" -->

### 5.2 避坑点 | Pitfalls to Avoid

<!-- AGENT: 从竞品中提取需要避免的问题。 -->

- <!-- AGENT: 如 "竞品 A 的设置层级过深" -->
- <!-- AGENT: 如 "竞品 B 的加载状态不明显" -->

---

## 6. 差异化机会 | Differentiation Opportunities

<!-- AGENT: 基于功能对比和 UX 对比，总结差异化机会。 -->

### 6.1 核心差异化点 | Core Differentiators

| 差异化点 Differentiator | 竞品现状 | 本项目优势 |
|---|---|---|
| <!-- AGENT: 如 "开箱即用的自托管" --> | <!-- AGENT: 竞品多为 SaaS --> | <!-- AGENT: 数据主权归用户 --> |
| <!-- AGENT: 如 "极简 API 设计" --> | <!-- AGENT: 竞品 API 较复杂 --> | <!-- AGENT: 5 分钟上手 --> |

### 6.2 差异化总结 | Differentiation Summary

<!-- AGENT: 一句话总结本项目的独特价值主张。 -->

---

## 7. 技术借鉴 | Technical Learnings

<!-- AGENT: 从竞品代码中提取可借鉴的技术实现。 -->

### 7.1 架构借鉴 | Architecture Learnings

<!-- AGENT: 竞品架构亮点。 -->

- <!-- AGENT: 如 "竞品 A 使用了清晰的分层架构" -->

### 7.2 实现借鉴 | Implementation Learnings

<!-- AGENT: 竞品实现亮点。 -->

- <!-- AGENT: 如 "竞品 B 的认证中间件设计简洁" -->

---

## 文档间契约 | Downstream Contracts

- `ARCHITECTURE.md` 必须继承本文档的技术栈对比和借鉴点。
- `UIUX.md` 必须继承本文档的 UX 亮点和避坑点。
- `PRODUCT-DESIGN.md` 必须继承本文档的差异化机会。

---

## Agent 生成检查表 | Agent Completion Checklist

- [ ] 至少分析了 3 个竞品
- [ ] 功能对比表覆盖所有 P0 功能
- [ ] 有技术栈对比
- [ ] 有差异化建议
- [ ] 零 `[placeholder]` 残留
