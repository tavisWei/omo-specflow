# 黄金路径端到端场景 | Golden Path End-to-End Scenarios

> 本文档定义用户从 `/spec-start` 到代码交付的完整流程，包含 4 种入口模式、3 个具体场景和 10 个阶段的输入/输出契约。

---

## 一、工作流总览 | Workflow Overview

```
用户输入 → spec-start 面试 → Discovery → Architecture → Design → Constitution → Specify → Plan → Tasks → Implement → Test → Complete
```

### 入口模式 | Entry Modes

| 模式 | 适用场景 | 起始切入点 | 最佳实践输出 |
|---|---|---|---|
| Greenfield | 从 0 到 1 项目开发 | Discovery | 完整上游文档链 + SPEC + TODO + TASKS |
| Direct-Spec | 已有明确需求和原型图 | Architecture / Design 对齐 | 快速沉淀 SPEC + TODO + TASKS |
| Brownfield Feature | 功能迭代 | 影响分析 / 增量 Spec | Delta Spec + Regression Plan + 增量 TODO/TASKS |
| Bugfix | 修复 BUG | Bug Intake / Root Cause | Bug TODO + 修复任务 + 验证/回归证据 |

### 上游文档链 | Upstream Document Chain

在进入 Constitution 之前，先完成上游文档链，确保需求经过充分调研和设计论证：

| 阶段 Phase | 输入 Input | 输出 Output | 质量门控 Gate |
|---|---|---|---|
| discovery | 用户项目描述 + 面试结果 | `PRD.md` + `COMPETITOR-RESEARCH.md` | PRD 大纲已确认，≥3 竞品分析 |
| architecture | PRD + 竞品研究 | `ARCHITECTURE.md` | ≥2 候选方案，有推荐方案 |
| design | PRD + 架构推荐 | `UIUX.md` + `PRODUCT-DESIGN.md` + `.page-coverage.json` | 页面覆盖率 ≥90% |

### 下游 SPEC 阶段 | Downstream SPEC Phases

| 阶段 Phase | 输入 Input | 输出 Output | 质量门控 Gate |
|---|---|---|---|
| constitution | 上游文档链产出 | `.spec/SPEC.md` (Vision/Values/Constraints) | SPEC.md 存在且含 3 章节 |
| specify | Constitution + 项目类型 | 按类型生成 spec 模板文档 | ≥3 个 US-xxx 条款已注册 |
| plan | 所有 spec 文档 | `.spec/TASKS.md` 初版 | TASKS.md 存在且含 ≥1 任务 |
| tasks | TASKS.md 初版 | 细化后的 TASKS.md（含 AC/QA/文件路径） | 每任务有 AC + spec 引用 |
| implement | 细化 TASKS.md + spec 文档 | 实现代码 + spec-tracker 更新 | 覆盖率 ≥80% + 单元测试证据 |
| test | 实现代码 + tracker 状态 | 联调 / 缺陷修复 / 回归证据 | 联调通过 + bugfix verified + 回归证据齐全 |
| complete | 所有代码 + spec 状态 | 最终审查报告 | spec-review 全部通过 |

### 渐进式模板生成策略 | Progressive Template Strategy

根据项目类型，模板分为三级：

| 模板 | Web 全栈 | API 服务 | CLI 工具 |
|---|---|---|---|
| 01-需求文档 | **必选** required | **必选** required | **必选** required |
| 02-技术架构 | **必选** required | **必选** required | **必选** required |
| 03-接口文档 | **必选** required | **必选** required | skip |
| 04-设计规范 | **必选** required | skip | skip |
| 05-页面流程 | **必选** required | skip | skip |
| 06-页面功能细节 | **必选** required | skip | skip |
| 07-数据库设计 | **必选** required | **必选** required | optional |
| 08-第三方服务集成 | optional | optional | skip |
| 09-部署架构 | optional | **必选** required | skip |
| 10-测试策略 | **必选** required | **必选** required | **必选** required |
| 11-安全规范 | **必选** required | **必选** required | optional |
| 12-性能要求 | optional | optional | skip |

生成顺序：01 → 02 → 03 → 07 → 其余按依赖图顺序。

---

## 二、场景 A：REST API for Todos

### A.1 用户输入

```
/spec-start a REST API for managing todo items with user authentication
```

### A.2 面试问答示例 | Interview Q&A

**Q1: 项目类型？** → API 服务
**Q2: 认证方式？** → JWT + refresh token
**Q3: API 风格？** → RESTful，JSON 响应
**Q4: 数据存储？** → PostgreSQL + Prisma ORM
**Q5: 核心实体？** → User, Todo, Tag（多对多）
**Q6: 版本控制？** → URL 路径版本 `/api/v1/`
**Q7: 限流策略？** → 每用户 100 req/min
**Q8: 部署目标？** → Docker + Railway/Fly.io

面试结果 → 项目类型 = API → 模板子集 = {01,02,03,07,09,10,11,12}

### A.3 生成文档列表

1. `.spec/SPEC.md` — Constitution（Vision: 轻量级 Todo API；Values: 简洁 > 功能丰富；Constraints: 单人开发、2 周交付）
2. `.spec/01-需求文档.md` — 3 个用户故事：US-001 用户注册登录、US-002 Todo CRUD、US-003 标签管理
3. `.spec/02-技术架构.md` — Hono + Prisma + PostgreSQL，目录结构
4. `.spec/03-接口文档.md` — 12 个 API 端点定义（含请求/响应示例）
5. `.spec/07-数据库设计.md` — 3 张表 ER 图 + Prisma schema
6. `.spec/09-部署架构.md` — Dockerfile + fly.toml
7. `.spec/10-测试策略.md` — Vitest 单元 + Supertest 集成
8. `.spec/11-安全规范.md` — JWT 实现、密码哈希、CORS 配置

### A.4 任务分解示例

```markdown
## Task 1: 项目初始化和基础配置
- category: quick
- Files: package.json, tsconfig.json, src/index.ts, prisma/schema.prisma
- AC: `bun run build` 成功，Prisma schema 有效
- Spec Refs: US-001

## Task 2: 用户认证模块
- category: deep
- Files: src/auth/routes.ts, src/auth/jwt.ts, src/auth/middleware.ts
- AC: POST /api/v1/auth/register 返回 201，POST /api/v1/auth/login 返回 JWT
- Spec Refs: US-001, AC-001, AC-002

## Task 3: Todo CRUD 端点
- category: deep
- Files: src/todos/routes.ts, src/todos/service.ts
- AC: 5 个端点全部返回正确状态码，分页参数生效
- Spec Refs: US-002, AC-003, AC-004, AC-005
```

### A.5 验证步骤

1. `bun test` — 所有测试通过
2. `curl POST /api/v1/auth/register` — 返回 201 + user object
3. `curl GET /api/v1/todos` — 返回 200 + paginated list
4. spec-tracker 覆盖率 ≥80%

---

## 三、场景 B：全栈 Web 电商后台 | Full-Stack E-Commerce Admin

### B.1 用户输入

```
/spec-start 一个电商后台管理系统，管理商品、订单和用户
```

### B.2 面试问答示例

**Q1: 项目类型？** → Web 全栈
**Q2: UI 框架？** → Next.js 14 (App Router)
**Q3: 组件库？** → shadcn/ui + Tailwind CSS
**Q4: 状态管理？** → Zustand（轻量）
**Q5: 后端？** → Next.js API Routes + Prisma
**Q6: 数据库？** → PostgreSQL
**Q7: 认证？** → NextAuth.js (Credentials + Google OAuth)
**Q8: 核心页面？** → 仪表盘、商品列表/编辑、订单列表/详情、用户管理
**Q9: 响应式？** → 桌面优先，支持平板
**Q10: 文件上传？** → 商品图片，S3 兼容存储

面试结果 → 项目类型 = Web 全栈 → 模板子集 = 全部 12 个

### B.3 生成文档列表

1. `.spec/SPEC.md` — Constitution
2. `.spec/01-需求文档.md` — 6 个用户故事：US-001 仪表盘、US-002 商品管理、US-003 订单管理、US-004 用户管理、US-005 认证、US-006 文件上传
3. `.spec/02-技术架构.md` — Next.js 14 + Prisma + PostgreSQL 架构图
4. `.spec/03-接口文档.md` — API Routes 定义
5. `.spec/04-设计规范.md` — shadcn/ui 主题配置、色板、排版
6. `.spec/05-页面流程.md` — 页面路由图 + 导航流程
7. `.spec/06-页面功能细节.md` — 每个页面的交互细节
8. `.spec/07-数据库设计.md` — Product, Order, OrderItem, User 表
9. `.spec/08-第三方服务集成.md` — S3 + NextAuth 配置
10. `.spec/09-部署架构.md` — Vercel 部署配置
11. `.spec/10-测试策略.md` — Vitest + Playwright E2E
12. `.spec/11-安全规范.md` — RBAC、CSRF、XSS 防护
13. `.spec/12-性能要求.md` — Core Web Vitals 目标

### B.4 任务分解示例

```markdown
## Task 1: 项目脚手架
- category: quick
- Files: package.json, next.config.ts, tailwind.config.ts, prisma/schema.prisma
- Spec Refs: US-001

## Task 2: 认证系统
- category: deep
- Files: src/app/api/auth/[...nextauth]/route.ts, src/lib/auth.ts, src/middleware.ts
- Spec Refs: US-005

## Task 3: 数据库模型和种子数据
- category: deep
- Files: prisma/schema.prisma, prisma/seed.ts
- Spec Refs: US-002, US-003, US-004

## Task 4: 布局和导航
- category: unspecified-high
- Files: src/app/layout.tsx, src/components/sidebar.tsx, src/components/header.tsx
- Spec Refs: US-001

## Task 5: 商品管理页面
- category: deep
- Files: src/app/products/page.tsx, src/app/products/[id]/page.tsx, src/app/api/products/route.ts
- Spec Refs: US-002
```

### B.5 验证步骤

1. `bun run build` — Next.js 构建成功
2. `bun test` — 单元测试通过
3. Playwright E2E — 登录 → 商品列表 → 创建商品 → 订单查看
4. Lighthouse 性能分 ≥80
5. spec-tracker 覆盖率 ≥80%

---

## 四、场景 C：CLI 工具 | CLI Tool

### C.1 用户输入

```
/spec-start a CLI tool for batch image optimization and format conversion
```

### C.2 面试问答示例

**Q1: 项目类型？** → CLI 工具
**Q2: 运行环境？** → Node.js 20+，跨平台（macOS/Linux/Windows）
**Q3: 命令结构？** → 子命令模式：`imgopt optimize`, `imgopt convert`, `imgopt info`
**Q4: 参数解析？** → Commander.js
**Q5: 输出格式？** → 彩色终端输出 + JSON 模式（`--json`）
**Q6: 图片处理库？** → Sharp
**Q7: 配置文件？** → `.imgoptrc.json` 或 `imgopt.config.ts`
**Q8: 并发处理？** → 多文件并行，默认 CPU 核心数

面试结果 → 项目类型 = CLI → 模板子集 = {01,02,10,11,12}

### C.3 生成文档列表

1. `.spec/SPEC.md` — Constitution（Vision: 最快的批量图片优化 CLI）
2. `.spec/01-需求文档.md` — US-001 批量优化、US-002 格式转换、US-003 图片信息查看
3. `.spec/02-技术架构.md` — Commander.js + Sharp + Worker Threads 架构
4. `.spec/10-测试策略.md` — Vitest 单元 + 集成测试（真实图片文件）
5. `.spec/11-安全规范.md` — 路径遍历防护、文件权限检查

### C.4 任务分解示例

```markdown
## Task 1: CLI 脚手架和命令注册
- category: quick
- Files: src/cli.ts, src/commands/index.ts, package.json
- Spec Refs: US-001

## Task 2: optimize 子命令
- category: deep
- Files: src/commands/optimize.ts, src/core/optimizer.ts
- AC: `imgopt optimize ./test-images/ --quality 80` 输出优化后文件
- Spec Refs: US-001

## Task 3: convert 子命令
- category: deep
- Files: src/commands/convert.ts, src/core/converter.ts
- AC: `imgopt convert ./photo.png --format webp` 生成 .webp 文件
- Spec Refs: US-002
```

### C.5 验证步骤

1. `bun test` — 所有测试通过
2. `imgopt optimize ./fixtures/ --quality 80` — 输出优化结果
3. `imgopt info ./fixtures/test.png --json` — 输出 JSON 格式元数据
4. spec-tracker 覆盖率 ≥80%

---

## 五、阶段详细契约 | Detailed Phase Contracts

### 5.1 Constitution 阶段

**触发**: `/spec-start` 命令 + 面试完成
**Agent 行为**:
1. 读取面试结果
2. 生成 `.spec/SPEC.md` 的 Constitution 章节
3. Vision: 项目存在理由 + 5 年愿景 + 成功定义
4. Values: 按优先级排序的设计价值观（如"简洁 > 功能丰富"）
5. Constraints: 技术约束 / 资源约束 / 合规约束 / 时间约束

**输出格式**:
```markdown
# SPEC — [项目名称]

## Constitution（项目宪章 | Project Charter）

### Vision（愿景）
- 项目存在理由：...
- 5 年愿景：...
- 成功定义：...

### Values（价值观）
1. [价值 A] > [价值 B]（优先级声明）
2. ...

### Constraints（约束）
- 技术：...
- 资源：...
- 合规：...
- 时间：...
```

**完成条件**: `validatePhaseCompletion("constitution")` 通过

### 5.2 Specify 阶段

**输入**: Constitution + 项目类型
**Agent 行为**:
1. 根据 TEMPLATE-GUIDE.md 确定模板子集
2. 按依赖顺序生成：01 → 02 → 03 → 07 → 其余
3. 每个模板：读取模板 → 按 `<!-- AGENT: -->` 指令填充 → 标记不确定项为 `[NEEDS CLARIFICATION]`（最多 3 个）
4. 注册 US/AC 条款到 spec-tracker

**完成条件**: ≥3 个 US-xxx 条款已注册

### 5.3 Plan 阶段

**输入**: 所有 spec 文档
**Agent 行为**:
1. 分析用户故事，按故事分组任务
2. 提取共享依赖（类型定义、配置、基础设施）为 Wave 1
3. 生成 `.spec/TASKS.md`（遵循 tasks-format-spec.md 格式）
4. 标注任务间依赖和并行信息

**完成条件**: TASKS.md 存在且含 ≥1 任务

### 5.4 Tasks 阶段

**输入**: TASKS.md 初版
**Agent 行为**:
1. 为每个任务补充：验收标准、QA 场景、具体文件路径、spec 条款引用
2. 验证任务粒度（1-3 文件/任务）
3. 运行 `validateTaskQuality()` 检查每个任务
4. 运行 `analyzeDependencies()` 验证无循环依赖

**完成条件**: 每个任务有 AC + spec 引用

### 5.5 Implement 阶段

**输入**: 细化 TASKS.md + spec 文档
**Agent 行为**:
1. 调用 `buildExecutionPlan()` 生成执行计划
2. 按 Wave 分组并行分发任务（`generateDispatchCalls()`）
3. 每个任务完成后运行 QA 场景
4. 更新 spec-tracker（`completeTask()`）
5. 每个 Wave 完成后调用 `preFlightCheck()` 检查进度

**完成条件**: spec-tracker 覆盖率 ≥80%

### 5.6 Complete 阶段

**输入**: 所有代码 + spec 状态
**Agent 行为**:
1. 运行 `performSpecReview()` 全面审查
2. 生成覆盖率报告（`generateCoverageReport()`）
3. 检查所有 US/AC 条款已完成（`getIncompleteClauses()`）
4. 运行最终测试套件
5. 生成交付报告

**完成条件**: spec-review 所有检查通过，零 blocking issues
