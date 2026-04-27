---
description: Shortcut entry for Brownfield feature iteration in SpecFlow
argument-hint: <describe the incremental feature change>
agent: metis
---

# SpecFlow Iterate — Brownfield Feature 快捷入口 | Brownfield Feature Shortcut

Use this shortcut when you are iterating on an existing project.

## 适用场景 | When to Use

- 现有项目新增功能
- 修改已有模块
- 需要兼容性、影响分析和回归控制
- 日常 QA 后发现“未实现 / 部分实现 / 与原需求有偏差”，需要先做差异识别再进入增量迭代

## 行为 | Behavior

这个快捷入口等价于：

```txt
/spec-start
```

并默认选择入口模式：

- **Brownfield Feature**

后续应以增量方式执行：

**Impact Analysis / Delta Spec → Plan → Tasks → Implement → Test → Complete**

## 建议输入 | Suggested Input

```txt
/sf-iterate 在现有 billing 模块中增加优惠券能力
Affected modules: billing, checkout
Out of scope: reporting
Regression scope: checkout, invoice generation
```

### 日常 QA / 需求对齐建议输入 | Suggested Input for Daily QA / Requirement Alignment

```txt
/sf-iterate 对 <模块/页面/流程> 做一次需求对齐 QA
Original requirement: <原始 PRD / 原型 / 页面说明 / 验收口径>
Current implementation: <当前页面 / 接口 / 模块 / 交互>
Suspected gaps: <怀疑未做 / 做偏 / 部分覆盖的点>
Goal:
- 判断是否已实现
- 判断是否与原始需求一致
- 如有偏差，输出 gap list / delta spec / TODO / TASKS / regression scope
```

## 预期输出 | Expected Outputs

- 影响分析
- 增量 spec
- 回归计划
- 增量 `.spec/TODO.md` / `.spec/TASKS.md`
- 实现、验证与交付证据
- 如从 QA 切入：额外输出需求差异结论（未实现 / 部分实现 / 偏离需求）与对应回归范围
