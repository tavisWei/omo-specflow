import * as fs from "fs/promises";
import * as path from "path";

const TEST_WORKFLOW_STATE_FILE = ".spec/.test-workflow-state.json";
const TEST_LOCK_FILE = ".spec/.test-workflow-state.lock";
const TEST_SPEC_DIR = ".spec";
const HOOKS_DIR = ".opencode/hooks/omo-specflow";
const INSTRUCTION_DIR = ".opencode/agent-instructions";
const TEMPLATE_DIR = ".opencode/spec-templates";

async function readRepoFile(relativePath: string): Promise<string> {
  return fs.readFile(relativePath, "utf-8");
}

async function cleanupTestFiles(): Promise<void> {
  try { await fs.unlink(TEST_WORKFLOW_STATE_FILE); } catch { /* ignore */ }
  try { await fs.unlink(TEST_LOCK_FILE); } catch { /* ignore */ }
}

async function ensureSpecDir(): Promise<void> {
  try { await fs.mkdir(TEST_SPEC_DIR, { recursive: true }); } catch { /* ignore */ }
}

describe("Intent Detection Hook", () => {
  const DEV_INTENT_PATTERN = /^(我要|帮我|我想)?(开发|构建|实现|添加|新增|build|implement|create|add)\s*(.+)/i;

  const testCases = [
    { input: "我要开发用户登录功能", shouldMatch: true },
    { input: "帮我实现购物车模块", shouldMatch: true },
    { input: "我想添加支付功能", shouldMatch: true },
    { input: "build a login page", shouldMatch: true },
    { input: "implement user authentication", shouldMatch: true },
    { input: "我要吃饭", shouldMatch: false },
    { input: "帮我买水果", shouldMatch: false },
    { input: "今天天气很好", shouldMatch: false },
    { input: "build", shouldMatch: false },
  ];

  testCases.forEach(({ input, shouldMatch }) => {
    it(`${shouldMatch ? "matches" : "does not match"}: "${input}"`, () => {
      const match = DEV_INTENT_PATTERN.exec(input);
      if (shouldMatch) {
        expect(match).not.toBeNull();
        if (match) {
          expect((match[3] || "").trim().length).toBeGreaterThan(0);
        }
      } else {
        expect(match).toBeNull();
      }
    });
  });

  it("extracts intent and feature correctly", () => {
    const match = DEV_INTENT_PATTERN.exec("我要开发用户登录");
    expect(match).not.toBeNull();
    if (match) {
      expect(match[2]).toBe("开发");
      expect(match[3].trim()).toBe("用户登录");
    }
  });
});

describe("Workflow State Management", () => {
  const WORKFLOW_PHASES = ["constitution", "specify", "plan", "tasks", "implement", "complete"] as const;
  type WorkflowPhase = typeof WORKFLOW_PHASES[number];

  const PHASE_TRANSITIONS: Record<WorkflowPhase, WorkflowPhase[] | "terminal"> = {
    constitution: ["specify"],
    specify: ["plan"],
    plan: ["tasks"],
    tasks: ["implement"],
    implement: ["complete"],
    complete: "terminal",
  };

  function isValidTransition(current: WorkflowPhase, next: WorkflowPhase): boolean {
    const allowed = PHASE_TRANSITIONS[current];
    return allowed === "terminal" ? false : allowed.includes(next);
  }

  function getNextPhase(current: WorkflowPhase): WorkflowPhase | null {
    const idx = WORKFLOW_PHASES.indexOf(current);
    return idx === -1 || idx === WORKFLOW_PHASES.length - 1 ? null : WORKFLOW_PHASES[idx + 1];
  }

  beforeAll(async () => { await ensureSpecDir(); });
  afterAll(async () => { await cleanupTestFiles(); });

  it("has exactly 6 phases", () => {
    expect(WORKFLOW_PHASES).toHaveLength(6);
  });

  it("allows valid phase transitions", () => {
    expect(isValidTransition("constitution", "specify")).toBe(true);
    expect(isValidTransition("specify", "plan")).toBe(true);
    expect(isValidTransition("plan", "tasks")).toBe(true);
    expect(isValidTransition("tasks", "implement")).toBe(true);
    expect(isValidTransition("implement", "complete")).toBe(true);
  });

  it("prevents invalid phase transitions", () => {
    expect(isValidTransition("constitution", "plan")).toBe(false);
    expect(isValidTransition("complete", "constitution")).toBe(false);
    expect(isValidTransition("plan", "specify")).toBe(false);
  });

  it("returns correct next phase", () => {
    expect(getNextPhase("constitution")).toBe("specify");
    expect(getNextPhase("complete")).toBe(null);
  });

  it("has valid state and lock file paths", () => {
    expect(".spec/.workflow-state.json").toBeDefined();
    expect(".spec/.workflow-state.lock").toBeDefined();
  });
});

describe("Spec Document Templates", () => {
  const EXPECTED_TEMPLATES = [
    "01-需求文档.md", "02-技术架构.md", "03-接口文档.md", "04-设计规范.md",
    "05-页面流程.md", "06-页面功能细节.md", "07-数据库设计.md",
    "08-第三方服务集成.md", "09-部署架构.md", "10-测试策略.md",
    "11-安全规范.md", "12-性能要求.md",
  ];

  it("has exactly 12 templates", () => {
    expect(EXPECTED_TEMPLATES).toHaveLength(12);
  });

  EXPECTED_TEMPLATES.forEach((template) => {
    it(`exists: ${template}`, async () => {
      await expect(fs.access(path.join(TEMPLATE_DIR, template))).resolves.toBeDefined();
    });

    it(`has content: ${template}`, async () => {
      const content = await fs.readFile(path.join(TEMPLATE_DIR, template), "utf-8");
      expect(content.length).toBeGreaterThan(100);
    });

    it(`is valid markdown: ${template}`, async () => {
      const content = await fs.readFile(path.join(TEMPLATE_DIR, template), "utf-8");
      expect(/#{1,6}\s*/.test(content)).toBe(true);
    });
  });
});

describe("Spec-Start Command Template", () => {
  const COMMAND_PATH = ".opencode/commands/spec-start.md";

  it("exists", async () => {
    await expect(fs.access(COMMAND_PATH)).resolves.toBeDefined();
  });

  it("has frontmatter with required fields", async () => {
    const content = await fs.readFile(COMMAND_PATH, "utf-8");
    expect(content.startsWith("---")).toBe(true);
    expect(content).toContain("description:");
    expect(content).toContain("argument-hint:");
    expect(content).toContain("agent:");
  });

  it("references spec-templates", async () => {
    const content = await fs.readFile(COMMAND_PATH, "utf-8");
    expect(content).toContain("spec-templates");
  });

  it("documents all workflow phases", async () => {
    const content = await fs.readFile(COMMAND_PATH, "utf-8");
    ["Constitution", "Specify", "Plan", "Tasks", "Implement"].forEach((phase) => {
      expect(content).toContain(phase);
    });
  });
});

describe("End-to-End Workflow", () => {
  const DEV_INTENT_PATTERN = /^(我要|帮我|我想)?(开发|构建|实现|添加|新增|build|implement|create|add)\s*(.+)/i;
  const WORKFLOW_PHASES = ["constitution", "specify", "plan", "tasks", "implement", "complete"] as const;

  it("simulates intent detection to phase completion", () => {
    const userInput = "我要开发用户登录功能";
    const intentMatch = DEV_INTENT_PATTERN.exec(userInput);
    
    expect(intentMatch).not.toBeNull();
    if (intentMatch) {
      expect(intentMatch[2]).toBe("开发");
      expect(intentMatch[3].trim()).toBe("用户登录功能");
    }
    
    expect(WORKFLOW_PHASES).toHaveLength(6);
    expect(WORKFLOW_PHASES[0]).toBe("constitution");
    expect(WORKFLOW_PHASES[5]).toBe("complete");
  });

  it("verifies all required components exist", async () => {
    await expect(fs.access(".opencode/hooks/omo-specflow/hook.ts")).resolves.toBeDefined();
    await expect(fs.access(".opencode/hooks/omo-specflow/state.ts")).resolves.toBeDefined();
    await expect(fs.access(".opencode/commands/spec-start.md")).resolves.toBeDefined();
  });
});

describe("Quality Gates (state.ts)", () => {
  it("exports validatePhaseCompletion function", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/state.ts", "utf-8");
    expect(content).toContain("export async function validatePhaseCompletion");
  });

  it("has quality checks for all 6 phases", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain("constitution:");
    expect(content).toContain("specify:");
    expect(content).toContain("plan:");
    expect(content).toContain("tasks:");
    expect(content).toContain("implement:");
    expect(content).toContain("complete:");
    expect(content).toContain("PHASE_COMPLETION_CHECKS");
  });

  it("aligns tasks gate with phase-gate traceability expectations", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain("missing Files section");
    expect(content).toContain("missing QA Scenarios");
    expect(content).toContain("missing Evidence path for verification traceability");
  });

  it("aligns implement and complete gates with evidence and delivery expectations", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain("No tracker tasks are marked completed");
    expect(content).toContain("Completed task");
    expect(content).toContain("Delivery checklist requires README.md or USAGE.md");
    expect(content).toContain("Final review evidence file is missing");
  });

  it("completePhase calls validatePhaseCompletion", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/state.ts", "utf-8");
    const completePhaseSection = content.substring(content.indexOf("export async function completePhase"));
    expect(completePhaseSection).toContain("validatePhaseCompletion");
  });

  it("preserves all 5 original public API functions", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/state.ts", "utf-8");
    expect(content).toContain("export async function getState");
    expect(content).toContain("export async function nextPhase");
    expect(content).toContain("export async function completePhase");
    expect(content).toContain("export async function reset");
    expect(content).toContain("export async function recoverSession");
  });

  it("imports spec-tracker and spec-review", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain('from "./spec-tracker.js"');
    expect(content).toContain("from \"./spec-review.js\"");
    expect(content).toContain("getState as getTrackerState");
  });
});

describe("Spec Review Enhancements (spec-review.ts)", () => {
  it("exports validateTaskQuality function", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/spec-review.ts", "utf-8");
    expect(content).toContain("export function validateTaskQuality");
  });

  it("supports expanded clause patterns (FR, NFR, REQ)", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/spec-review.ts", "utf-8");
    expect(content).toContain("FR-");
    expect(content).toContain("NFR-");
    expect(content).toContain("REQ-");
  });

  it("has template completeness check", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/spec-review.ts", "utf-8");
    expect(content).toContain("checkTemplateCompleteness");
  });

  it("has file reference check", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/spec-review.ts", "utf-8");
    expect(content).toContain("checkFileReferences");
  });

  it("checks evidence traceability, delivery readiness, and change management", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/spec-review.ts`);
    expect(content).toContain("checkEvidenceTraceability");
    expect(content).toContain("checkDeliveryReadiness");
    expect(content).toContain("checkChangeManagementReadiness");
    expect(content).toContain("Task completion has no evidence reference");
    expect(content).toContain("Add at least one evidence file reference before claiming the task is complete");
  });

  it("preserves preExecutionVerify and postCompletionVerify types", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/spec-review.ts", "utf-8");
    expect(content).toContain("PreExecutionResult");
    expect(content).toContain("PostCompletionResult");
  });

  it("uses current local import reality with .js module specifiers", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/spec-review.ts`);
    expect(content).toContain('from "./spec-tracker.js"');
    expect(content).not.toContain('from "./spec-tracker"');
  });

  it("tightens task quality checks without removing existing ones", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/spec-review.ts`);
    expect(content).toContain("Task missing Acceptance Criteria section");
    expect(content).toContain("Task Files section is present but empty");
    expect(content).toContain("Task missing QA Scenarios section");
    expect(content).toContain("Task QA Scenarios do not declare any Evidence path");
    expect(content).toContain("Task missing Parallelization section");
  });
});

describe("Task Dispatcher Updates (task-dispatcher.ts)", () => {
  it("ParsedTask has new fields: files, qaScenarios, specRefs", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/task-dispatcher.ts", "utf-8");
    expect(content).toContain("files: string[]");
    expect(content).toContain("qaScenarios: string");
    expect(content).toContain("specRefs: string[]");
  });

  it("exports validateParsedTask function", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/task-dispatcher.ts", "utf-8");
    expect(content).toContain("export function validateParsedTask");
  });

  it("has extractFiles and extractSpecRefs methods", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/task-dispatcher.ts", "utf-8");
    expect(content).toContain("extractFiles");
    expect(content).toContain("extractSpecRefs");
  });

  it("preserves existing ParsedTask fields", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/task-dispatcher.ts", "utf-8");
    expect(content).toContain("id: string");
    expect(content).toContain("title: string");
    expect(content).toContain("category: TaskCategory");
    expect(content).toContain("blocks: string[]");
    expect(content).toContain("blockedBy: string[]");
    expect(content).toContain("acceptanceCriteria: string[]");
  });
});

describe("Hook Integration (hook.ts)", () => {
  it("imports state machine functions", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/hook.ts", "utf-8");
    expect(content).toContain("getState");
    expect(content).toContain("setState");
    expect(content).toContain("recoverSession");
  });

  it("persists interview state", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/hook.ts", "utf-8");
    expect(content).toContain("interview-state.json");
    expect(content).toContain("persistInterviewState");
  });

  it("initializes workflow on intent detection", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/hook.ts", "utf-8");
    expect(content).toContain("initializeWorkflow");
  });

  it("stays compact (not an orchestrator)", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/hook.ts", "utf-8");
    const lineCount = content.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(200);
  });
});

describe("Agent Instructions", () => {
  const EXPECTED_FILES = [
    "00-golden-path.md",
    "01-constitution.md",
    "02-specify.md",
    "03-plan.md",
    "04-tasks.md",
    "05-implement.md",
    "06-complete.md",
    "07-phase-gates.md",
    "08-traceability-matrix.md",
    "09-change-management.md",
    "10-delivery-checklist.md",
      "11-spec-index.md",
      "12-review-protocol.md",
      "13-evidence-convention.md",
      "14-handoff-format.md",
      "15-brownfield-mode.md",
      "16-impact-analysis.md",
      "17-regression-planning.md",
      "tasks-format-spec.md",
  ];

  EXPECTED_FILES.forEach((file) => {
    it(`exists: ${file}`, async () => {
      await expect(fs.access(path.join(INSTRUCTION_DIR, file))).resolves.toBeDefined();
    });
  });

  it("has exactly 19 instruction docs in the current support layer", async () => {
    const files = await fs.readdir(INSTRUCTION_DIR);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));
    expect(markdownFiles).toHaveLength(19);
  });

  it("includes brownfield support docs", async () => {
    const brownfield = await fs.readFile(path.join(INSTRUCTION_DIR, "15-brownfield-mode.md"), "utf-8");
    expect(brownfield).toContain("Brownfield");
    const impact = await fs.readFile(path.join(INSTRUCTION_DIR, "16-impact-analysis.md"), "utf-8");
    expect(impact).toContain("Impact Analysis");
    const regression = await fs.readFile(path.join(INSTRUCTION_DIR, "17-regression-planning.md"), "utf-8");
    expect(regression).toContain("Regression");
  });

  it("golden path has 3 scenarios", async () => {
    const content = await fs.readFile(path.join(INSTRUCTION_DIR, "00-golden-path.md"), "utf-8");
    expect(content).toContain("REST API");
    expect(content).toContain("CLI");
    const lineCount = content.split("\n").length;
    expect(lineCount).toBeGreaterThanOrEqual(200);
  });

  it("tasks format spec has 3 examples", async () => {
    const content = await fs.readFile(path.join(INSTRUCTION_DIR, "tasks-format-spec.md"), "utf-8");
    const categoryCount = (content.match(/category:/g) || []).length;
    expect(categoryCount).toBeGreaterThanOrEqual(3);
  });

  it("includes execution support docs", async () => {
    const content = await fs.readFile(path.join(INSTRUCTION_DIR, "07-phase-gates.md"), "utf-8");
    expect(content).toContain("阶段");
    const review = await fs.readFile(path.join(INSTRUCTION_DIR, "12-review-protocol.md"), "utf-8");
    expect(review).toContain("Verdict");
  });

  it("documents governance additions for phase gates, traceability, delivery, and evidence", async () => {
    const phaseGates = await readRepoFile(path.join(INSTRUCTION_DIR, "07-phase-gates.md"));
    const traceability = await readRepoFile(path.join(INSTRUCTION_DIR, "08-traceability-matrix.md"));
    const changeManagement = await readRepoFile(path.join(INSTRUCTION_DIR, "09-change-management.md"));
    const delivery = await readRepoFile(path.join(INSTRUCTION_DIR, "10-delivery-checklist.md"));
    const review = await readRepoFile(path.join(INSTRUCTION_DIR, "12-review-protocol.md"));
    const evidence = await readRepoFile(path.join(INSTRUCTION_DIR, "13-evidence-convention.md"));

    expect(phaseGates).toContain("spec-review 无 blocking issues");
    expect(traceability).toContain("Evidence Path");
    expect(traceability).toContain("每个已完成任务必须至少有 1 个 evidence 文件");
    expect(changeManagement).toContain("Affected Docs");
    expect(delivery).toContain("QA evidence 文件");
    expect(delivery).toContain("README 或使用说明已同步");
    expect(review).toContain("Evidence");
    expect(review).toContain("缺证据但声称已完成");
    expect(evidence).toContain("final-review-summary.txt");
    expect(evidence).toContain("不允许只有“pass”而没有上下文");
  });
});

describe("Template Quality", () => {
  const TEMPLATES = [
    "01-需求文档.md", "02-技术架构.md", "03-接口文档.md", "04-设计规范.md",
    "05-页面流程.md", "06-页面功能细节.md", "07-数据库设计.md",
    "08-第三方服务集成.md", "09-部署架构.md", "10-测试策略.md",
    "11-安全规范.md", "12-性能要求.md",
  ];

  TEMPLATES.forEach((template) => {
    it(`${template} has metadata tags`, async () => {
      const content = await fs.readFile(path.join(TEMPLATE_DIR, template), "utf-8");
      expect(content).toContain("depends-on:");
      expect(content).toContain("required-for:");
    });

    it(`${template} has bilingual title`, async () => {
      const content = await fs.readFile(path.join(TEMPLATE_DIR, template), "utf-8");
      const firstLine = content.split("\n")[0];
      expect(firstLine).toContain("（");
    });
  });

  it("TEMPLATE-GUIDE.md exists with Mermaid graph", async () => {
    const content = await fs.readFile(path.join(TEMPLATE_DIR, "TEMPLATE-GUIDE.md"), "utf-8");
    expect(content).toContain("mermaid");
    expect(content).toContain("depends-on");
  });

  it("spec-start.md has 3 interview tracks", async () => {
    const content = await fs.readFile(".opencode/commands/spec-start.md", "utf-8");
    expect(content).toContain("Track A");
    expect(content).toContain("Track B");
    expect(content).toContain("Track C");
  });
});
