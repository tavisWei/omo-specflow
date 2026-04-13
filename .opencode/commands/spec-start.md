---
description: Start a Spec Kit-driven development workflow with structured requirements gathering
argument-hint: <describe your project or feature idea>
agent: metis
---

# Spec Start — 3 轨道自适应面试 | 3-Track Adaptive Interview

Launch a structured development workflow. The interview adapts based on your project type.

This command drives the full phase flow:
**Constitution → Specify → Plan → Tasks → Implement → Complete**.

It consumes the template system under `.opencode/spec-templates/` and the execution guidance under `.opencode/agent-instructions/`.

## 第零步：绿地 vs 棕地 | Step 0: Greenfield vs Brownfield

**Q0: 这是新项目还是现有项目的迭代？Is this a new project or an iteration on an existing one?**

- **(G) 新项目 Greenfield** — 从零开始，尚无代码库
- **(B) 现有项目迭代 Brownfield** — 在已有代码库上新增/修改功能

→ 如果选 **(G)**，直接跳到 Step 1 继续正常流程。
→ 如果选 **(B)**，先完成下方 **Brownfield 补充面试**，再回到 Step 1。

---

## Brownfield 补充面试 | Brownfield Supplement Interview

> 仅在选择 **(B) 现有项目迭代** 时回答。Only answer if you chose (B).

**BQ1: 受影响的模块/服务是哪些？Which modules or services are affected?**
请列出本次迭代会修改或新增的模块，例如：
- `auth` 模块、`payment` 服务、`user-profile` 页面

**BQ2: 明确不在本次范围内的部分？What is explicitly out of scope?**
列出本次迭代不会触碰的模块/功能，帮助划定边界：
- 例如：`reporting` 模块、`admin` 后台、现有 API v1 端点

**BQ3: 兼容性约束？Compatibility constraints?**
- (a) 必须保持现有 API 向后兼容（不能破坏现有客户端）
- (b) 数据库 schema 只能新增，不能删改现有字段
- (c) 需要支持多版本并行运行（蓝绿/金丝雀部署）
- (d) 无特殊兼容性约束
- (e) 其他 Other: ___

**BQ4: 迁移与回滚需求？Migration and rollback needs?**
- (a) 需要数据库迁移脚本（并附回滚脚本）
- (b) 需要数据迁移（存量数据转换）
- (c) 需要功能开关（Feature Flag）支持灰度发布
- (d) 无迁移需求

**BQ5: 回归测试范围？Regression scope?**
列出本次变更可能影响的现有功能，需要纳入回归测试：
- 例如：登录流程、结账流程、现有 webhook 回调

→ Brownfield 补充面试完成。继续 Step 1 确定项目类型轨道。

---

## 第一步：确定项目类型 | Step 1: Determine Project Type

**Q1: 这个项目属于哪种类型？What type of project is this?**

请选择 / Please choose:
- **(A) Web 全栈** — 有前端 UI + 后端 API + 数据库（如：管理后台、电商平台、SaaS 应用）
- **(B) API 服务** — 纯后端 API，无前端 UI（如：REST API、GraphQL 服务、微服务）
- **(C) CLI 工具** — 命令行工具（如：构建工具、代码生成器、数据处理脚本）

→ 根据回答切换到对应轨道 / Switch to corresponding track based on answer.

---

## 轨道 A：Web 全栈 | Track A: Full-Stack Web (10 questions)

**Q2: 前端框架偏好？Frontend framework preference?**
- (a) Next.js (App Router)
- (b) Next.js (Pages Router)
- (c) Nuxt.js / Vue
- (d) SvelteKit
- (e) Remix
- (f) 其他 Other: ___

**Q3: UI 组件库？UI component library?**
- (a) shadcn/ui + Tailwind CSS
- (b) Ant Design
- (c) Material UI (MUI)
- (d) Chakra UI
- (e) 纯 Tailwind（无组件库）
- (f) 其他 Other: ___

**Q4: 状态管理方案？State management?**
- (a) Zustand（轻量）
- (b) Redux Toolkit
- (c) Jotai / Recoil（原子化）
- (d) React Context（内置）
- (e) 不需要全局状态管理

**Q5: 后端技术？Backend technology?**
- (a) Next.js API Routes / Server Actions
- (b) Hono
- (c) Express.js
- (d) Fastify
- (e) tRPC
- (f) 其他 Other: ___

**Q6: 数据库？Database?**
- (a) PostgreSQL + Prisma
- (b) PostgreSQL + Drizzle
- (c) MySQL + Prisma
- (d) MongoDB + Mongoose
- (e) SQLite（轻量/本地）
- (f) 其他 Other: ___

**Q7: 认证方案？Authentication?**
- (a) NextAuth.js / Auth.js
- (b) Clerk
- (c) Supabase Auth
- (d) 自建 JWT
- (e) 不需要认证

**Q8: 核心页面有哪些？What are the core pages?**
请列出 3-5 个核心页面，例如：
- 仪表盘 Dashboard
- 列表页 List Page
- 详情/编辑页 Detail/Edit Page
- 设置页 Settings

**Q9: 是否需要响应式设计？Responsive design?**
- (a) 桌面优先，支持平板
- (b) 移动优先，全响应式
- (c) 仅桌面端
- (d) 仅移动端

**Q10: 第三方服务集成？Third-party integrations?**
- (a) 支付（Stripe / 支付宝）
- (b) 文件存储（S3 / Cloudflare R2）
- (c) 邮件（Resend / SendGrid）
- (d) 分析（Posthog / Mixpanel）
- (e) 不需要
- (f) 其他 Other: ___

**Q11: 部署目标？Deployment target?**
- (a) Vercel
- (b) Cloudflare Pages
- (c) Docker + 自托管
- (d) AWS (ECS/Lambda)
- (e) 其他 Other: ___

→ 面试完成。模板子集 = 全部 12 个。
→ Interview complete. Template subset = all 12.

---

## 轨道 B：API 服务 | Track B: API Service (8 questions)

**Q2: API 风格？API style?**
- (a) RESTful（JSON）
- (b) GraphQL
- (c) gRPC
- (d) tRPC
- (e) 混合 Mixed

**Q3: 后端框架？Backend framework?**
- (a) Hono（轻量、Edge 兼容）
- (b) Express.js
- (c) Fastify
- (d) NestJS
- (e) Elysia (Bun)
- (f) 其他 Other: ___

**Q4: 数据库？Database?**
- (a) PostgreSQL + Prisma
- (b) PostgreSQL + Drizzle
- (c) MongoDB
- (d) Redis（纯缓存/KV）
- (e) SQLite
- (f) 不需要数据库

**Q5: 认证方式？Authentication method?**
- (a) JWT (access + refresh token)
- (b) API Key
- (c) OAuth 2.0
- (d) Session-based
- (e) 不需要认证

**Q6: 核心实体/资源有哪些？What are the core entities?**
请列出 3-5 个核心数据实体，例如：
- User, Todo, Tag
- Product, Order, Category

**Q7: API 版本控制？API versioning?**
- (a) URL 路径版本 `/api/v1/`
- (b) Header 版本 `Accept-Version: v1`
- (c) 不需要版本控制

**Q8: 限流策略？Rate limiting?**
- (a) 每用户 N req/min
- (b) 全局限流
- (c) 不需要限流

**Q9: 部署目标？Deployment target?**
- (a) Docker + Railway/Fly.io
- (b) Cloudflare Workers
- (c) AWS Lambda
- (d) Docker + 自托管
- (e) 其他 Other: ___

→ 面试完成。模板子集 = {01, 02, 03, 07, 09, 10, 11, 12}。跳过 04, 05, 06, 08。
→ Interview complete. Template subset = {01, 02, 03, 07, 09, 10, 11, 12}. Skip 04, 05, 06, 08.

---

## 轨道 C：CLI 工具 | Track C: CLI Tool (8 questions)

**Q2: 运行环境？Runtime environment?**
- (a) Node.js 20+
- (b) Bun
- (c) Deno
- (d) 需要跨平台（macOS/Linux/Windows）

**Q3: 命令结构？Command structure?**
- (a) 子命令模式（如 `git commit`, `docker build`）
- (b) 单命令 + 参数（如 `curl URL`）
- (c) 交互式（如 `npm init`）

**Q4: 参数解析库？Argument parsing?**
- (a) Commander.js
- (b) yargs
- (c) citty
- (d) 自建解析

**Q5: 输出格式？Output format?**
- (a) 彩色终端输出 + JSON 模式（`--json`）
- (b) 纯文本
- (c) 表格（`--table`）
- (d) 混合（根据命令不同）

**Q6: 核心命令有哪些？What are the core commands?**
请列出 3-5 个核心命令，例如：
- `optimize` — 批量优化
- `convert` — 格式转换
- `info` — 查看信息

**Q7: 配置文件？Configuration file?**
- (a) JSON 配置（`.xxxrc.json`）
- (b) TypeScript 配置（`xxx.config.ts`）
- (c) YAML 配置
- (d) 不需要配置文件

**Q8: 并发处理？Concurrency?**
- (a) 多文件并行（Worker Threads）
- (b) 串行处理
- (c) 可配置并发数

**Q9: 分发方式？Distribution?**
- (a) npm 包（`npx xxx`）
- (b) 独立二进制（pkg/bun build）
- (c) Homebrew
- (d) 其他 Other: ___

→ 面试完成。模板子集 = {01, 02, 10, 11, 12}。跳过 03-09。
→ Interview complete. Template subset = {01, 02, 10, 11, 12}. Skip 03-09.

---

## 面试后流程 | Post-Interview Flow

### Greenfield（新项目）

面试完成后，Agent 按以下顺序执行：

1. **初始化工作流** — 调用 `setState({ phase: "constitution" })` 进入 constitution 阶段
2. **生成 Constitution** — 根据面试结果生成 `.spec/SPEC.md` 的 Constitution 章节
3. **渐进式生成 Spec** — 按 TEMPLATE-GUIDE.md 的依赖顺序生成模板子集
4. **注册条款** — 将 US/AC 条款注册到 spec-tracker
5. **生成任务** — 创建 `.spec/TASKS.md`
6. **细化任务** — 补充验收标准和 QA 场景
7. **执行实现** — 按 Wave 分组并行执行

### Brownfield（现有项目迭代）— 增量生成

> 棕地模式下，**不重新生成整个 spec 集**。只更新受本次迭代影响的文档。

1. **读取现有 Spec** — 扫描 `.spec/` 目录，加载已有 Constitution 和模板文件
2. **差异分析** — 根据 BQ1（受影响模块）和 BQ2（范围外模块）确定需要更新的文档集合
3. **增量更新 Constitution** — 仅追加/修改与本次迭代相关的约束和决策，不覆盖已有内容
4. **按需扩展模板** — 只对受影响模块对应的模板文件执行 extend/patch，跳过无关模板
5. **兼容性检查** — 根据 BQ3 约束，在生成的 API/Schema 文档中标注向后兼容要求
6. **迁移文档** — 若 BQ4 有迁移需求，额外生成 `.spec/MIGRATION.md`（含回滚步骤）
7. **增量任务** — 在现有 `.spec/TASKS.md` 中追加新 Wave，不重置已完成任务
8. **回归标注** — 根据 BQ5，在任务中标注需要回归验证的现有功能
9. **执行实现** — 仅执行新增/修改的 Wave

**增量生成原则：**
- 已存在且未受影响的 spec 文档 → 保持不变
- 受影响文档 → patch/extend，保留历史内容并追加变更
- 新增功能文档 → 全新生成，与现有文档并列

### 模板子集映射 | Template Subset Mapping

| 项目类型 | 模板子集 | 跳过 |
|---|---|---|
| Web 全栈 | 01-12（全部） | 无 |
| API 服务 | 01, 02, 03, 07, 09, 10, 11, 12 | 04, 05, 06, 08 |
| CLI 工具 | 01, 02, 10, 11, 12 | 03, 04, 05, 06, 07, 08, 09 |
