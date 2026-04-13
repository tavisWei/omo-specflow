# OMO-SpecFlow 最终验收手册 | Final Acceptance Manual

> 本手册用于验证 OMO-SpecFlow 是否已经达到“可用于 Greenfield 与 Brownfield 的多 Agent spec-driven 开发系统”交付标准。

---

## 1. 验收目标 | Acceptance Goals

本次验收需要确认 4 件事：

1. **文档体系完整**：12 份核心模板 + 19 份 Agent / governance / brownfield 文档齐备。
2. **代码逻辑闭环**：hook / state / review / tracker / dispatcher / tests / config / README 已对齐。
3. **运行时可验证**：Bun 可运行，测试可通过。
4. **使用场景完整**：同时支持 Greenfield（从 0 到 1）和 Brownfield（存量项目迭代）。

---

## 2. 环境要求 | Environment Requirements

- Node.js 20+
- Bun 1.3+
- 可访问本仓库根目录

### 当前本次验收使用环境 | This Validation Run

- Node.js: `v22.17.0`
- Bun: `1.3.12`
- 平台: `darwin`

---

## 3. 必跑命令 | Required Commands

### 3.1 安装/验证 Bun

```bash
bun --version
```

预期：输出 Bun 版本号。

### 3.2 运行工作流测试

```bash
bun test ./.opencode/spec-workflow.tests.ts
```

预期：全部测试通过。

### 3.3 检查模板元数据和规模

```bash
python3 - <<'PY'
from pathlib import Path
base = Path('.opencode/spec-templates')
for f in sorted(base.glob('*.md')):
    txt = f.read_text()
    print(f'{f.name}\tlines={len(txt.splitlines())}\tdepends={"depends-on:" in txt}\trequired={"required-for:" in txt}')
PY
```

预期：
- 每份核心模板存在
- 均有 `depends-on:` 和 `required-for:`

### 3.4 检查 instruction inventory

```bash
python3 - <<'PY'
from pathlib import Path
files = sorted(Path('.opencode/agent-instructions').glob('*.md'))
print(len(files))
for f in files:
    print(f.name)
PY
```

预期：当前版本为 **19** 份文档。

---

## 4. 本次实际验收结果 | Actual Acceptance Results

### 4.1 测试结果

命令：

```bash
bun test ./.opencode/spec-workflow.tests.ts
```

结果：

```text
132 pass
0 fail
```

结论：**通过**

### 4.2 模板规模检查

关键模板当前行数：

| 文件 | 行数 |
|---|---:|
| 01-需求文档.md | 315 |
| 02-技术架构.md | 366 |
| 03-接口文档.md | 652 |
| 05-页面流程.md | 321 |
| 06-页面功能细节.md | 350 |
| 07-数据库设计.md | 817 |
| 10-测试策略.md | 894 |
| 11-安全规范.md | 598 |
| 12-性能要求.md | 809 |

结论：**通过**

### 4.3 Agent instruction 数量

- 当前 instruction/support docs：**19** 份

覆盖范围：
- Greenfield phases
- Governance / traceability / review / evidence / handoff
- Brownfield / impact analysis / regression planning

结论：**通过**

### 4.4 README / config / tests 对齐

已验证：
- README badge 已更新为 `19 Files`
- `oh-my-openagent.jsonc` 已包含 19 项 instruction 列表
- `spec-workflow.tests.ts` 已验证 19 份 instruction docs

结论：**通过**

---

## 5. Greenfield 验收步骤 | Greenfield Validation Steps

### 目标
验证系统可以从 0 到 1 启动规范开发流程。

### 手工验收路径

1. 触发：

```text
/spec-start 开发一个电商后台管理系统
```

2. 观察点：
- 进入 Greenfield 分支
- 选择 Web/API/CLI 轨道
- 生成 Constitution / Specify / Plan / Tasks / Implement / Complete 的完整流转说明

3. 关键检查：
- 生成 `.spec/SPEC.md`
- 生成 `.spec/TASKS.md`
- 生成与项目类型匹配的模板子集

---

## 6. Brownfield 验收步骤 | Brownfield Validation Steps

### 目标
验证系统可以在存量项目中做增量功能开发，而不是重建整个 spec 集。

### 手工验收路径

1. 触发：

```text
/spec-start 在现有管理后台中新增优惠券管理功能。这是增量迭代，不是新项目。只影响商品、订单、营销模块；保持现有登录、权限、支付流程不变。
```

2. 观察点：
- 进入 Brownfield 分支
- 触发 `BQ1`~`BQ5`
- 只更新受影响文档
- 如涉及迁移，可额外生成 `.spec/MIGRATION.md`

3. 关键检查：
- `15-brownfield-mode.md` 可作为主流程说明
- `16-impact-analysis.md` 可用于风险评估
- `17-regression-planning.md` 可用于回归验证与 evidence 输出

---

## 7. 放行标准 | Release Criteria

满足以下条件即可视为通过最终验收：

- [x] Bun 已安装且可运行
- [x] `bun test ./.opencode/spec-workflow.tests.ts` 全绿
- [x] 12 份核心模板存在且带元数据
- [x] 19 份 instruction/support docs 存在
- [x] README / config / tests 同步一致
- [x] Greenfield 和 Brownfield 路径均有完整文档支撑

---

## 8. 已知限制 | Known Limits

当前已经完成仓库级验收，但仍有两类外部依赖型限制：

1. **OpenCode / OMO 宿主环境联调**
   - 本次没有真实在 OMO UI/宿主内完整演练一次交互式工作流。
2. **TypeScript LSP 环境**
   - 本次依赖 Bun 测试与 bundling 验证，未在本地装 `typescript-language-server`。

这两项不阻塞仓库交付，但如果要做更高强度联调，可作为下一轮环境验证项。

---

## 9. 最终结论 | Final Verdict

**结论：通过。**

OMO-SpecFlow 现在已经从“文档骨架”升级为“可驱动多 Agent 进行 Greenfield + Brownfield spec-driven 开发的规范系统”。

- 适合新项目从 0 到 1 建模
- 也适合存量项目做增量功能迭代
- 具备任务拆分、审查、证据、交接、回归与交付治理能力
