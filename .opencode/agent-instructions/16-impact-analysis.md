# 16 - 影响分析模板 (Impact Analysis) | Impact Analysis Template

> 本文档定义在存量项目中进行变更时的深度影响评估标准。

---

## 1. 目的 | Purpose
系统化识别代码变更可能引发的连锁反应，降低引入意外 Bug 的风险。

## 2. 适用场景 | When to Use
- 在 `15-brownfield-mode.md` 的第二步执行。
- 任何涉及核心逻辑、公共组件或数据库 Schema 的变更。

## 3. 必需输入 | Required Inputs
- 变更提案 (Proposed Changes)。
- 静态分析结果 (LSP References, Dependency Graph)。
- 现有测试覆盖率报告。

## 4. 预期输出 | Expected Outputs
- 结构化的影响分析报告（存放在 `.spec/impact/` 或作为任务前置说明）。

## 5. 步骤规则 | Step-by-Step Rules

### 第一步：模块分类 (Module Categorization)
将相关模块分为三类：
1. **直接变更模块 (Directly Changed)**: 代码将被修改的模块。
2. **受影响模块 (Affected)**: 调用了变更模块，或被变更模块调用的模块。
3. **隔离模块 (Isolated)**: 理论上不应受影响，但需验证的邻近模块。

### 第二步：兼容性评估 (Compatibility Assessment)
检查以下维度：
- **API 兼容性**: 是否修改了现有接口的签名、返回格式或状态码？
- **数据兼容性**: 数据库迁移是否可逆？旧数据是否适配新逻辑？
- **配置兼容性**: 是否增加了必需的环境变量？

### 第三步：风险识别 (Risk Identification)
- **破坏性变更 (Breaking Changes)**: 必须列出所有会导致上游崩溃的修改。
- **副作用 (Side Effects)**: 如性能下降、日志激增、缓存失效等。
- **回滚难度**: 如果变更失败，恢复到上一个稳定版本的成本。

## 6. 报告模板 | Report Template

```markdown
# Impact Analysis: [Feature/Bug Name]

## 1. 变更范围 | Change Scope
- **Files**: `path/to/file1`, `path/to/file2`
- **Logic**: 简述修改的核心逻辑。

## 2. 模块影响 | Module Impact
| 模块 Module | 影响类型 Type | 描述 Description |
|---|---|---|
| Auth Service | Direct | 增加 OAuth 逻辑 |
| User Model | Direct | 增加 githubId 字段 |
| Frontend Login | Affected | 需要适配新的登录按钮 |

## 3. 兼容性与风险 | Compatibility & Risks
- **Breaking Changes**: None (or list them)
- **Data Migration**: Prisma migration required, non-destructive.
- **Performance**: No significant impact expected.

## 4. 回归范围 | Regression Scope
- [ ] 现有用户名/密码登录流程
- [ ] 密码重置流程
- [ ] 用户 Profile 编辑页面
```

## 7. 扩展分析维度 | Extended Analysis Dimensions

### 接口影响
- 是否修改现有请求参数
- 是否修改现有响应结构
- 是否改变错误码或状态码语义

### 数据影响
- 是否新增字段 / 索引 / 约束
- 是否需要 backfill 或双写
- 是否存在不可逆迁移风险

### 页面影响
- 是否新增页面入口
- 是否改变既有导航路径
- 是否影响现有权限显示逻辑

## 8. 下游契约 | Downstream Contracts
- Plan 阶段必须复用这里的 affected modules 作为任务拆分依据。
- Regression Planning 必须覆盖这里定义的高风险范围。
- Change Management 必须记录这里识别出的 breaking-change 风险。

## 9. Agent 执行清单 | Agent Checklist
- [ ] 是否已检查所有 `lsp_find_references` 结果？
- [ ] 是否考虑了数据库 Schema 变更对旧数据的影响？
- [ ] 是否识别了所有需要更新的环境变量？
- [ ] 是否定义了明确的回归测试范围？
- [ ] 是否评估了回滚方案？

---

## 禁止事项 | Must NOT Do
- 禁止仅凭直觉判断影响范围，必须有静态分析证据。
- 禁止忽略对测试代码的影响（测试本身是否也需要重构）。
- 禁止在未完成影响分析的情况下开始大规模编码。
