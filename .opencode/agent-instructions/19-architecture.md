# Architecture 阶段 Agent 指令 | Architecture Phase Instructions

> Agent 在 Architecture 阶段的完整行为规范：基于 PRD 和竞品研究推荐技术架构。

---

## 阶段定位 | Phase Position

**Architecture** 是上游文档链的第二个阶段，在 Discovery 之后、Design 之前执行。

```
Discovery → Architecture → Design → Constitution → Specify → Plan → Tasks → Implement → Complete
```

---

## 输入 | Input

- `.spec/PRD.md` — 产品需求文档（Discovery 阶段产出）
- `.spec/COMPETITOR-RESEARCH.md` — 竞品研究文档（Discovery 阶段产出）

---

## 输出 | Output

- `.spec/ARCHITECTURE.md` — 架构推荐文档

---

## 执行流程 | Execution Flow

### 步骤 1：提取需求摘要

**行为**:
1. 从 PRD.md 提取功能规模（P0 功能数量、复杂度评估）
2. 从 PRD.md 提取非功能要求（性能、可用性、安全）
3. 从 PRD.md 提取约束（技术、资源、合规、时间）
4. 从 COMPETITOR-RESEARCH.md 提取技术栈对比和借鉴点

### 步骤 2：生成架构候选方案

**行为**:
1. 根据项目类型（Web/API/CLI）生成 2-3 个架构候选方案
2. 每个方案包含：
   - 技术栈选型表（前端、后端、数据库、认证、部署）
   - 架构图（Mermaid）
   - 优势分析
   - 劣势分析

**方案生成规则**:

| 项目类型 | 必须考虑的方案 |
|---|---|
| Web 全栈 | Next.js 全栈 / 前后端分离 |
| API 服务 | Hono / Express / NestJS |
| CLI 工具 | Commander.js / oclif / 自建 |

### 步骤 3：方案对比

**行为**:
1. 在以下维度对比各方案：
   - 开发效率（高/中/低）
   - 性能潜力（高/中/低）
   - 学习成本（低/中/高）
   - 运维复杂度（低/中/高）
   - 扩展性（高/中/低）
2. 根据项目约束调整权重

### 步骤 4：推荐方案

**行为**:
1. 明确推荐一个方案
2. 解释推荐理由（结合 PRD 约束和竞品研究）
3. 列出风险和缓解措施

### 步骤 5：详细架构设计

**行为**:
1. 生成推荐方案的目录结构
2. 定义模块划分（职责、核心实体）
3. 绘制数据模型概要（ER 图）

---

## 质量标准 | Quality Standards

| 指标 | 要求 |
|---|---|
| 候选方案数量 | ≥2 个 |
| 方案对比维度 | ≥5 个 |
| 推荐方案理由 | ≥3 条 |
| 架构图 | Mermaid 格式 |
| 目录结构 | 完整且符合技术栈惯例 |

---

## 完成条件 | Completion Criteria

调用 `validatePhaseCompletion("architecture")` 必须返回 `{ valid: true }`：
- `.spec/ARCHITECTURE.md` 存在
- 包含至少 2 个架构候选方案
- 有明确的推荐方案和理由
- 有架构图和目录结构

---

## 质量门控 | Quality Gate

| 检查项 Check | 通过标准 Pass Criteria |
|---|---|
| 候选方案数量 | ≥2 个 |
| 方案对比表 | 存在且覆盖关键维度 |
| 推荐方案 | 明确且有理由 |
| 架构图 | Mermaid 格式有效 |
| 目录结构 | 与技术栈匹配 |

---

## 禁止事项 | Must NOT Do

- 不要只给一个方案（必须对比）
- 不要忽略 PRD 约束
- 不要推荐与竞品研究冲突的技术栈
- 不要生成空架构图

---

## 自检清单 | Self-Check Checklist

- [ ] 已从 PRD 提取需求摘要
- [ ] 已从竞品研究提取技术借鉴
- [ ] 至少 2 个架构候选方案
- [ ] 有方案对比表
- [ ] 有明确推荐方案
- [ ] 有架构图
- [ ] 有目录结构
- [ ] 有数据模型概要

---

## 示例输出结构 | Example Output Structure

```markdown
# 架构推荐文档

## 1. 需求摘要
### 1.1 功能规模
### 1.2 非功能要求摘要
### 1.3 约束摘要

## 2. 架构候选方案
### 2.1 方案 A：Next.js 全栈
### 2.2 方案 B：前后端分离

## 3. 方案对比

## 4. 推荐方案
### 4.1 推荐结论
### 4.2 推荐理由
### 4.3 风险与缓解

## 5. 推荐架构详情
### 5.1 目录结构
### 5.2 模块划分
### 5.3 数据模型概要

## 6. 技术决策记录
```
