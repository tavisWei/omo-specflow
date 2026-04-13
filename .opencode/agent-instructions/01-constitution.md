# Constitution 阶段 Agent 指令 | Constitution Phase Instructions

> Agent 在 constitution 阶段的完整行为规范。

---

## 输入 | Input

- 用户的项目描述（来自 `/spec-start` 面试或直接输入）
- 面试结果 JSON（项目类型、技术偏好、核心功能）

## 输出 | Output

- `.spec/SPEC.md` 的 Constitution 章节

## 生成规则 | Generation Rules

### Vision（愿景）
必须包含以下三项，每项至少 2 句话：
1. **项目存在理由** — 解决什么问题、为谁解决
2. **5 年愿景** — 项目成熟后的理想状态
3. **成功定义** — 可量化的成功指标（用户数、性能、市场份额）

### Values（价值观）
按优先级排序，使用 `>` 格式声明取舍：
- 必须 ≥3 条
- 每条用 `A > B` 格式（如"简洁 > 功能丰富"）
- 附带 1 句解释为何如此排序

### Constraints（约束）
分 4 类，每类至少列 1 项（如不适用标记 N/A）：
- **技术约束** — 语言版本、框架限制、浏览器兼容
- **资源约束** — 团队规模、预算、时间线
- **合规约束** — 数据隐私、行业规范、无障碍
- **时间约束** — 里程碑、截止日期、迭代周期

## 质量标准 | Quality Standards

- 零 `[placeholder]` — 全部填入具体内容
- 每个章节至少 3 个具体条目
- 不确定项用 `[NEEDS CLARIFICATION]` 标记（最多 3 个）
- 总长度 ≥50 行

## 完成条件 | Completion Criteria

调用 `validatePhaseCompletion("constitution")` 必须返回 `{ valid: true }`：
- `.spec/SPEC.md` 文件存在
- 包含 Vision/Values/Constraints 章节

## 执行步骤 | Execution Steps

1. 先读取用户原始需求，不要直接套模板。
2. 从面试结果中提取：用户类型、交付目标、技术偏好、时间限制。
3. 先写 Vision，再写 Values，最后写 Constraints；不要倒序。
4. 如果输入含糊，优先生成“可工作的默认项”，仅对关键缺口使用 `[NEEDS CLARIFICATION]`。
5. 输出后自检：是否每条约束都能影响后续技术决策。

## 禁止事项 | Must NOT Do

- 不要把功能清单写进 Vision。
- 不要把技术选型写进 Values。
- 不要把模糊词（如“高性能”“易用”）单独写成约束而没有量化或解释。
- 不要生成空章节。

## 自检清单 | Self-Check Checklist

- [ ] Vision 是否解释了“为什么现在要做”
- [ ] Values 是否体现了真实取舍，而不是并列口号
- [ ] Constraints 是否能约束后续 architecture / plan / tasks
- [ ] 是否没有残留占位符
- [ ] 是否控制在 3 个以内的澄清点

---

## 示例 A：REST API for Todos

```markdown
# SPEC — Todo API

## Constitution（项目宪章 | Project Charter）

### Vision（愿景）
- **项目存在理由**: 为个人开发者和小团队提供一个轻量级、自托管的 Todo API 服务，替代臃肿的项目管理工具。核心价值是简单——5 分钟部署，零学习成本。
- **5 年愿景**: 成为最受欢迎的开源 Todo API，被集成到 100+ 第三方工具和自动化工作流中。支持插件系统和 Webhook。
- **成功定义**: GitHub Stars ≥5K，月活 API 调用 ≥100 万次，99.9% 可用性。

### Values（价值观）
1. 简洁 > 功能丰富 — 宁可少做 feature 也不增加复杂度
2. 性能 > 灵活性 — 响应时间 <50ms 优先于支持更多查询方式
3. 自托管 > SaaS — 数据主权归用户，不依赖第三方服务

### Constraints（约束）
- **技术**: Node.js 20+, TypeScript 5.x, PostgreSQL 15+
- **资源**: 1 人开发，2 周 MVP
- **合规**: GDPR 兼容（用户数据可导出/删除）
- **时间**: 第 1 周完成 API + Auth，第 2 周完成测试 + 部署
```

## 示例 B：Web 电商后台

```markdown
# SPEC — 电商后台管理系统

## Constitution（项目宪章 | Project Charter）

### Vision（愿景）
- **项目存在理由**: 为中小电商提供一个现代化的后台管理系统，替代基于 jQuery 的旧系统。重点是商品管理效率和订单处理速度。
- **5 年愿景**: 支持多店铺、多仓库、多币种的企业级电商管理平台，与主流电商平台（淘宝、Shopify）API 对接。
- **成功定义**: 日处理订单 ≥1 万，页面加载 <2s，管理员操作效率提升 50%。

### Values（价值观）
1. 可靠性 > 创新性 — 订单不丢失比酷炫 UI 更重要
2. 可操作性 > 美观 — 信息密度优先，减少点击次数
3. 渐进增强 > 大而全 — 先做核心功能，插件化扩展

### Constraints（约束）
- **技术**: Next.js 14, PostgreSQL, Redis 缓存
- **资源**: 2 人前端 + 1 人后端，6 周
- **合规**: PCI DSS（支付数据安全），用户隐私保护
- **时间**: 第 1-2 周基础架构，第 3-4 周核心功能，第 5-6 周测试上线
```
