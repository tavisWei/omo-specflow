# 17 - 回归计划模板 (Regression Planning) | Regression Planning Template

> 本文档定义如何规划和执行回归测试，以确保新变更不会破坏现有功能。

---

## 1. 目的 | Purpose
建立变更后的信心，确保系统核心功能的稳定性，并提供可验证的证据。

## 2. 适用场景 | When to Use
- 在 `15-brownfield-mode.md` 的第五步执行。
- 在 `16-impact-analysis.md` 确定回归范围后。

## 3. 必需输入 | Required Inputs
- 影响分析报告中的“回归范围”。
- 现有的测试用例库。
- 变更后的代码。

## 4. 预期输出 | Expected Outputs
- **回归测试报告**: 包含测试项、结果和证据（日志、截图或测试输出）。

## 5. 步骤规则 | Step-by-Step Rules

### 第一步：确定优先级 (Prioritization)
1. **核心路径 (P0)**: 系统的基本功能（如登录、支付、核心 CRUD）。
2. **受影响路径 (P1)**: 影响分析中识别出的直接关联功能。
3. **边缘路径 (P2)**: 间接关联或低频使用的功能。

### 第二步：选择测试方法 (Method Selection)
- **自动化回归**: 运行现有的单元测试和集成测试。
- **手动/脚本验证**: 对于无法自动化的 UI 交互或复杂流程，编写临时验证脚本或手动检查。
- **冒烟测试**: 快速验证系统是否能正常启动并响应基础请求。

### 第三步：执行与证据收集 (Execution & Evidence)
- 记录每个测试项的通过/失败状态。
- 对于关键路径，必须捕获执行证据（如 `npm test` 的输出摘要）。

## 6. 计划模板 | Planning Template

```markdown
# Regression Plan: [Feature/Bug Name]

## 1. 自动化测试 | Automated Tests
| 类别 Category | 命令 Command | 状态 Status | 备注 Note |
|---|---|---|---|
| Unit Tests | `npm run test:unit` | [ ] | 覆盖 Auth 逻辑 |
| Integration | `npm run test:integration` | [ ] | 覆盖 API 端点 |

## 2. 关键路径验证 | Critical Path Verification
| 功能 Path | 验证方法 Method | 预期结果 Expected | 证据 Evidence |
|---|---|---|---|
| 基础登录 | 手动/脚本 | 成功获取 Token | [Link/Log] |
| 数据库一致性 | SQL 查询 | githubId 字段正确存储 | [Link/Log] |

## 3. 异常场景 | Negative Scenarios
- [ ] 使用已存在的 GitHub 账号重复绑定。
- [ ] GitHub API 返回错误时的降级处理。
```

## 7. 回归覆盖分类 | Regression Coverage Categories

| 分类 | 必须覆盖内容 |
|---|---|
| Core Path (P0) | 登录、核心 CRUD、关键业务提交 |
| Affected Path (P1) | 直接受改动影响的流程 |
| Compatibility (P1) | 向后兼容接口与旧数据行为 |
| Operational (P2) | 日志、监控、告警、配置 |
| Security (P0/P1) | 权限、认证、敏感数据路径 |

## 8. 证据输出要求 | Evidence Output Requirements
- 自动化测试：保存命令摘要与结果。
- 接口验证：保存请求/响应关键信息。
- 页面回归：保存截图或脚本输出摘要。
- 失败用例：必须保留失败证据，不允许只记录“已修复”。

## 9. 下游契约 | Downstream Contracts
- Complete 阶段必须引用回归计划结果。
- Delivery Checklist 必须检查回归证据是否存在。
- Review Protocol 应使用这里的覆盖分类判断是否可放行。

## 10. Agent 执行清单 | Agent Checklist
- [ ] 回归计划是否包含了所有 P0 核心路径？
- [ ] 是否已运行所有现有的自动化测试？
- [ ] 是否针对影响分析中识别的风险点设计了专项测试？
- [ ] 测试证据是否足以证明功能正常？
- [ ] 是否验证了错误处理逻辑？

---

## 证据规范 | Evidence Convention
- **日志**: 截取关键的 Success/Error 日志行。
- **测试输出**: 复制 `Summary: X passed, 0 failed` 类型的行。
- **截图**: 对于 UI 变更，提供关键页面的截图描述。

## 禁止事项 | Must NOT Do
- 禁止在自动化测试失败的情况下宣称回归通过。
- 禁止跳过 P0 核心路径的验证。
- 禁止提供模糊的验证描述（如“看起来没问题”）。
