# TASKS.md 格式规范 | TASKS.md Format Specification

> 本文档定义 `.spec/TASKS.md` 的标准格式，确保 Agent 能可靠解析和执行每个任务。

---

## 一、格式概览 | Format Overview

每个任务是一个 Markdown 二级标题块，包含以下必填和可选字段：

```markdown
## Task {N}: {标题}

- category: {quick|deep|unspecified-high|writing|oracle}
- skills: [{skill1}, {skill2}]

**What to do**:
- 具体步骤 1
- 具体步骤 2

**Must NOT do**:
- 禁止事项

**Files**:
- `path/to/file1.ts` — 创建/修改说明
- `path/to/file2.ts` — 创建/修改说明

**Acceptance Criteria**:
- [ ] 可验证条件 1
- [ ] 可验证条件 2

**QA Scenarios**:
```
Scenario: {场景名}
  Tool: Bash ({具体工具})
  Steps:
    1. {命令或操作}
    2. {断言}
  Expected Result: {预期结果}
  Evidence: .sisyphus/evidence/task-{N}-{slug}.txt
```

**Integration Validation**:
- 前后端联调 / API Contract / Data consistency 的验证说明

**Bug Fix Trace**:
- 缺陷来源 / Root Cause / 修复验证

**Regression Scope**:
- 回归范围 / 关键路径 / 证据

**Spec Refs**: US-001, AC-001, AC-002

**Source TODOs**: TODO-001, TODO-002

**Parallelization**:
- Can Run In Parallel: YES/NO
- Parallel Group: Wave {N}
- Blocked By: Task {X}, Task {Y}
- Blocks: Task {Z}

**References**:
- `file:line-range` — 说明
```

---

## 二、字段定义 | Field Definitions

### 必填字段 Required Fields

| 字段 | 格式 | 说明 |
|---|---|---|
| Task ID + 标题 | `## Task {N}: {title}` | 二级标题，N 为递增整数 |
| category | `- category: {value}` | 任务类型，决定 Agent 分发策略 |
| skills | `- skills: [{list}]` | 需要加载的技能，空数组 `[]` 表示无 |
| What to do | `**What to do**:` 下的列表 | 具体实现步骤，不允许模糊描述 |
| Files | `**Files**:` 下的列表 | 需要创建/修改的文件路径 |
| Acceptance Criteria | `**Acceptance Criteria**:` 下的 checkbox 列表 | 可验证的完成条件 |
| Integration Validation | `**Integration Validation**:` 下的列表 | 前后端联调或接口契约验证 |
| Bug Fix Trace | `**Bug Fix Trace**:` 下的列表 | 缺陷修复来源、根因、修复验证 |
| Regression Scope | `**Regression Scope**:` 下的列表 | 回归测试范围与关键路径 |
| Spec Refs | `**Spec Refs**: US-xxx, AC-xxx` | 关联的 spec 条款 |
| Source TODOs | `**Source TODOs**: TODO-xxx` | 关联的桥接 TODO 条目 |
| Parallelization | `**Parallelization**:` 下的键值对 | 并行执行信息 |

### 可选字段 Optional Fields

| 字段 | 格式 | 说明 |
|---|---|---|
| Must NOT do | `**Must NOT do**:` 下的列表 | 明确禁止的操作 |
| QA Scenarios | `**QA Scenarios**:` 下的代码块 | Agent 可执行的验证场景 |
| References | `**References**:` 下的列表 | 参考文件和行号 |

### Category 取值 | Category Values

| 值 | 适用场景 | 典型时长 |
|---|---|---|
| `quick` | 配置、脚手架、简单修改 | 1-2 分钟 |
| `deep` | 核心逻辑、复杂实现 | 3-5 分钟 |
| `unspecified-high` | UI 组件、中等复杂度 | 2-4 分钟 |
| `writing` | 文档、设计、规范 | 2-3 分钟 |
| `oracle` | 审查、验证、分析 | 2-3 分钟 |

---

## 三、任务粒度规则 | Task Granularity Rules

### 粒度标准 Granularity Standards

1. **文件数**: 每个任务触及 1-3 个文件
2. **执行时间**: Agent 2-5 分钟可完成
3. **关注点**: 每个任务只处理 1 个关注点（feature/fix/refactor）

### 必须拆分的情况 When to Split

- 触及 **4+ 文件** → 拆分为多个任务
- 涉及 **2+ 不相关关注点** → 按关注点拆分
- 同时修改 **前端 + 后端** → 分别拆分
- 任务描述超过 **20 行** → 说明粒度太粗，需拆分

### 不应拆分的情况 When NOT to Split

- 修改一个函数及其测试（同一关注点）
- 创建一个组件及其样式文件（紧密耦合）
- 修改接口定义及其所有调用方（原子变更）

---

## 四、完整示例 | Complete Examples

### 示例 1: quick 类型 — 项目初始化

```markdown
## Task 1: 项目初始化和基础配置 | Project Initialization

- category: quick
- skills: []

**What to do**:
- 创建 `package.json`，配置 name/version/scripts（dev/build/test/lint）
- 创建 `tsconfig.json`，target: ES2022, module: ESNext, strict: true
- 创建 `src/index.ts` 入口文件，导出 app 实例
- 创建 `prisma/schema.prisma`，配置 PostgreSQL datasource

**Files**:
- `package.json` — 创建，含 dependencies: hono, prisma, @prisma/client
- `tsconfig.json` — 创建，严格模式
- `src/index.ts` — 创建，Hono app 实例 + 健康检查路由
- `prisma/schema.prisma` — 创建，datasource + generator 配置

**Acceptance Criteria**:
- [ ] `bun install` 成功，无报错
- [ ] `bun run build` 成功
- [ ] `bunx prisma validate` 通过
- [ ] `curl localhost:3000/health` 返回 200

**QA Scenarios**:
```
Scenario: Build succeeds
  Tool: Bash (bun)
  Steps:
    1. bun install
    2. bun run build
  Expected Result: Exit code 0, no errors
  Evidence: .sisyphus/evidence/task-1-build.txt
```

**Integration Validation**:
- 不适用（初始化任务无联调）

**Bug Fix Trace**:
- 不适用（初始化任务非缺陷修复）

**Regression Scope**:
- 冒烟验证 build / health route

**Spec Refs**: US-001

**Source TODOs**: TODO-001

**Parallelization**:
- Can Run In Parallel: NO
- Parallel Group: Wave 1
- Blocked By: none
- Blocks: Task 2, Task 3
```

### 示例 2: deep 类型 — 认证模块

```markdown
## Task 2: 用户认证模块 | User Authentication Module

- category: deep
- skills: []

**What to do**:
- 创建 `src/auth/jwt.ts`：generateToken() 和 verifyToken() 函数，使用 jose 库
- 创建 `src/auth/routes.ts`：POST /register（bcrypt 哈希密码）、POST /login（验证 + 返回 JWT）
- 创建 `src/auth/middleware.ts`：authGuard 中间件，从 Authorization header 提取并验证 JWT

**Must NOT do**:
- 不使用 jsonwebtoken 库（用 jose，支持 Edge Runtime）
- 不在 JWT payload 中存储敏感信息

**Files**:
- `src/auth/jwt.ts` — 创建，JWT 生成/验证工具
- `src/auth/routes.ts` — 创建，注册/登录路由
- `src/auth/middleware.ts` — 创建，认证中间件

**Acceptance Criteria**:
- [ ] POST /api/v1/auth/register 返回 201 + user object（不含密码）
- [ ] POST /api/v1/auth/login 返回 200 + { token, refreshToken }
- [ ] 无效 token 请求返回 401
- [ ] 密码使用 bcrypt 哈希（cost factor ≥10）

**QA Scenarios**:
```
Scenario: Registration and login flow
  Tool: Bash (curl + bun)
  Steps:
    1. curl -X POST /api/v1/auth/register -d '{"email":"test@test.com","password":"Test1234!"}' → 201
    2. curl -X POST /api/v1/auth/login -d '{"email":"test@test.com","password":"Test1234!"}' → 200 + token
    3. curl -H "Authorization: Bearer {token}" /api/v1/todos → 200
    4. curl -H "Authorization: Bearer invalid" /api/v1/todos → 401
  Expected Result: All status codes match
  Evidence: .sisyphus/evidence/task-2-auth-flow.txt
```

**Integration Validation**:
- 验证注册接口、登录接口与受保护资源访问链路一致

**Bug Fix Trace**:
- 不适用（功能实现任务）

**Regression Scope**:
- 回归认证失败路径、过期 token、重复登录

**Spec Refs**: US-001, AC-001, AC-002

**Source TODOs**: TODO-002, TODO-003

**Parallelization**:
- Can Run In Parallel: NO
- Parallel Group: Wave 2
- Blocked By: Task 1
- Blocks: Task 3, Task 4

**References**:
- `.spec/03-接口文档.md:45-80` — 认证端点定义
- `.spec/11-安全规范.md:20-35` — 密码策略
```

### 示例 3: writing 类型 — 文档任务

```markdown
## Task 8: API 文档生成 | API Documentation

- category: writing
- skills: []

**What to do**:
- 根据 `src/auth/routes.ts` 和 `src/todos/routes.ts` 的实际实现，更新 `.spec/03-接口文档.md`
- 确保每个端点有：HTTP 方法、路径、请求体 schema、响应体 schema、状态码、示例
- 添加 OpenAPI 3.0 兼容的 YAML 片段

**Files**:
- `.spec/03-接口文档.md` — 更新，补充实际端点文档

**Acceptance Criteria**:
- [ ] 文档覆盖所有已实现的端点
- [ ] 每个端点有请求/响应示例
- [ ] 无 `[placeholder]` 或 `[TODO]` 标记

**Spec Refs**: US-001, US-002, AC-003

**Source TODOs**: TODO-008

**Parallelization**:
- Can Run In Parallel: YES
- Parallel Group: Wave 3
- Blocked By: Task 2, Task 3
- Blocks: none
```

---

## 五、解析兼容性 | Parsing Compatibility

本格式与 `task-dispatcher.ts` 的 `ParsedTask` 接口兼容：

| TASKS.md 字段 | ParsedTask 属性 | 解析规则 |
|---|---|---|
| `## Task {N}: {title}` | `id`, `title` | 正则提取 N 和 title |
| `- category: {value}` | `category` | 直接映射 |
| `- skills: [{list}]` | `skills` | 逗号分隔解析 |
| `**What to do**:` 下内容 | `description` | 合并为描述文本 |
| `**Files**:` 下列表 | （新增字段） | 提取文件路径 |
| `**Acceptance Criteria**:` | `acceptanceCriteria` | 提取 checkbox 文本 |
| `**Source TODOs**:` | `todoRefs` | 提取 TODO-xxx 引用 |
| `**QA Scenarios**:` | （新增字段） | 提取代码块内容 |
| `**Spec Refs**:` | （新增字段） | 逗号分隔提取 |
| `Blocked By:` | `blockedBy` | 提取 Task ID 列表 |
| `Blocks:` | `blocks` | 提取 Task ID 列表 |
| `Can Run In Parallel:` | `parallelizable` | YES→true, NO→false |
| `Parallel Group:` | `parallelGroup` | 直接映射 |
| `**References**:` | `references` | 提取文件路径列表 |
