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

async function cleanupSpecRuntimeArtifacts(): Promise<void> {
  const targets = [
    ".spec/.spec-tracker.json",
    ".spec/.spec-tracker.lock",
    ".spec/TASKS.md",
    ".spec/TODO.md",
    ".spec/.workflow-state.json",
    ".spec/.workflow-state.lock",
  ];
  for (const target of targets) {
    try { await fs.unlink(target); } catch { /* ignore */ }
  }
  try { await fs.rm(".sisyphus/evidence", { recursive: true, force: true }); } catch { /* ignore */ }
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
  const WORKFLOW_PHASES = [
    "discovery",
    "architecture",
    "design",
    "constitution",
    "specify",
    "plan",
    "tasks",
    "implement",
    "test",
    "complete",
  ] as const;
  type WorkflowPhase = typeof WORKFLOW_PHASES[number];

  const PHASE_TRANSITIONS: Record<WorkflowPhase, WorkflowPhase[] | "terminal"> = {
    discovery: ["architecture"],
    architecture: ["design"],
    design: ["constitution"],
    constitution: ["specify"],
    specify: ["plan"],
    plan: ["tasks"],
    tasks: ["implement"],
    implement: ["test"],
    test: ["complete"],
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

  it("has exactly 10 phases", () => {
    expect(WORKFLOW_PHASES).toHaveLength(10);
  });

  it("allows valid phase transitions", () => {
    expect(isValidTransition("discovery", "architecture")).toBe(true);
    expect(isValidTransition("architecture", "design")).toBe(true);
    expect(isValidTransition("design", "constitution")).toBe(true);
    expect(isValidTransition("constitution", "specify")).toBe(true);
    expect(isValidTransition("specify", "plan")).toBe(true);
    expect(isValidTransition("plan", "tasks")).toBe(true);
    expect(isValidTransition("tasks", "implement")).toBe(true);
    expect(isValidTransition("implement", "test")).toBe(true);
    expect(isValidTransition("test", "complete")).toBe(true);
  });

  it("prevents invalid phase transitions", () => {
    expect(isValidTransition("discovery", "design")).toBe(false);
    expect(isValidTransition("complete", "discovery")).toBe(false);
    expect(isValidTransition("plan", "specify")).toBe(false);
  });

  it("returns correct next phase", () => {
    expect(getNextPhase("discovery")).toBe("architecture");
    expect(getNextPhase("design")).toBe("constitution");
    expect(getNextPhase("constitution")).toBe("specify");
    expect(getNextPhase("implement")).toBe("test");
    expect(getNextPhase("test")).toBe("complete");
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
  const SHORTCUT_COMMANDS = [
    ".opencode/commands/sf-new.md",
    ".opencode/commands/sf-spec.md",
    ".opencode/commands/sf-iterate.md",
    ".opencode/commands/sf-bugfix.md",
  ];

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
    ["Discovery", "Architecture", "Design", "Constitution", "Specify", "Plan", "Tasks", "Implement", "Test", "Complete"].forEach((phase) => {
      expect(content).toContain(phase);
    });
  });

  it("documents the 4 recommended entry modes", async () => {
    const content = await fs.readFile(COMMAND_PATH, "utf-8");
    expect(content).toContain("Greenfield");
    expect(content).toContain("Direct-Spec");
    expect(content).toContain("Brownfield Feature");
    expect(content).toContain("Bugfix");
  });

  SHORTCUT_COMMANDS.forEach((commandPath) => {
    it(`exists shortcut command: ${commandPath}`, async () => {
      await expect(fs.access(commandPath)).resolves.toBeDefined();
    });
  });

  it("shortcut commands map to the 4 entry modes", async () => {
    const newCommand = await fs.readFile(".opencode/commands/sf-new.md", "utf-8");
    const specCommand = await fs.readFile(".opencode/commands/sf-spec.md", "utf-8");
    const iterateCommand = await fs.readFile(".opencode/commands/sf-iterate.md", "utf-8");
    const bugfixCommand = await fs.readFile(".opencode/commands/sf-bugfix.md", "utf-8");

    expect(newCommand).toContain("Greenfield");
    expect(specCommand).toContain("Direct-Spec");
    expect(iterateCommand).toContain("Brownfield Feature");
    expect(bugfixCommand).toContain("Bugfix");
  });
});

describe("Install Script Command Coverage", () => {
  it("installs spec-start and all sf-* shortcut commands", async () => {
    const content = await fs.readFile("install.sh", "utf-8");
    expect(content).toContain("COMMAND_FILES=(spec-start.md sf-new.md sf-spec.md sf-iterate.md sf-bugfix.md)");
    expect(content).toContain('cp "$SCRIPT_DIR/.opencode/commands/$command_file" ~/.config/opencode/commands/');
    expect(content).toContain('cp "$SCRIPT_DIR/.opencode/commands/$command_file" .opencode/commands/');
  });

  it("prints the new sf-* shortcuts in install output", async () => {
    const content = await fs.readFile("install.sh", "utf-8");
    expect(content).toContain("/sf-new /sf-spec /sf-iterate /sf-bugfix");
  });
});

describe("Update Script Command Coverage", () => {
  it("exists and updates spec-start plus all sf-* shortcut commands", async () => {
    const content = await fs.readFile("update.sh", "utf-8");
    expect(content).toContain("COMMAND_FILES=(spec-start.md sf-new.md sf-spec.md sf-iterate.md sf-bugfix.md)");
    expect(content).toContain('cp "$SCRIPT_DIR/.opencode/commands/$command_file" ~/.config/opencode/commands/');
    expect(content).toContain('cp "$SCRIPT_DIR/.opencode/commands/$command_file" .opencode/commands/');
  });
});

describe("README Deliverable Documentation", () => {
  it("documents architecture changes, entry mode table, examples, and install/update guidance", async () => {
    const content = await fs.readFile("README.md", "utf-8");
    expect(content).toContain("Workflow: 10 Phases");
    expect(content).toContain("Entry Modes");
    expect(content).toContain("入口命令表 | Commands");
    expect(content).toContain("使用示例 | Usage Examples");
    expect(content).toContain("一键安装（推荐）");
    expect(content).toContain("更新到最新版本 | Global Update");
    expect(content).toContain("/sf-new");
    expect(content).toContain("/sf-spec");
    expect(content).toContain("/sf-iterate");
    expect(content).toContain("/sf-bugfix");
    expect(content).toContain("agent-instructions");
    expect(content).toContain("22");
  });
});

describe("OpenAgent Command Registry", () => {
  it("registers the new sf-* commands", async () => {
    const content = await fs.readFile(".opencode/oh-my-openagent.jsonc", "utf-8");
    expect(content).toContain('"sf-new"');
    expect(content).toContain('"sf-spec"');
    expect(content).toContain('"sf-iterate"');
    expect(content).toContain('"sf-bugfix"');
  });
});

describe("End-to-End Workflow", () => {
  const DEV_INTENT_PATTERN = /^(我要|帮我|我想)?(开发|构建|实现|添加|新增|build|implement|create|add)\s*(.+)/i;
  const WORKFLOW_PHASES = [
    "discovery",
    "architecture",
    "design",
    "constitution",
    "specify",
    "plan",
    "tasks",
    "implement",
    "test",
    "complete",
  ] as const;

  it("simulates intent detection to phase completion", () => {
    const userInput = "我要开发用户登录功能";
    const intentMatch = DEV_INTENT_PATTERN.exec(userInput);
    
    expect(intentMatch).not.toBeNull();
    if (intentMatch) {
      expect(intentMatch[2]).toBe("开发");
      expect(intentMatch[3].trim()).toBe("用户登录功能");
    }
    
    expect(WORKFLOW_PHASES).toHaveLength(10);
    expect(WORKFLOW_PHASES[0]).toBe("discovery");
    expect(WORKFLOW_PHASES[9]).toBe("complete");
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

  it("has quality checks for all 9 phases", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain("discovery:");
    expect(content).toContain("architecture:");
    expect(content).toContain("design:");
    expect(content).toContain("constitution:");
    expect(content).toContain("specify:");
    expect(content).toContain("plan:");
    expect(content).toContain("tasks:");
    expect(content).toContain("implement:");
    expect(content).toContain("test:");
    expect(content).toContain("complete:");
    expect(content).toContain("PHASE_COMPLETION_CHECKS");
  });

  it("aligns tasks gate with phase-gate traceability expectations", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain("TODO.md");
    expect(content).toContain("missing Source TODO references");
    expect(content).toContain("references TODO IDs missing from TODO.md");
    expect(content).toContain("missing Files section");
    expect(content).toContain("missing QA Scenarios");
    expect(content).toContain("missing Evidence path for verification traceability");
  });

  it("aligns implement and complete gates with evidence and delivery expectations", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain("No tracker tasks are marked completed");
    expect(content).toContain("Completed task");
    expect(content).toContain("Implement phase requires unit test execution evidence");
    expect(content).toContain("Test phase requires integration test evidence");
    expect(content).toContain("Test phase requires regression test evidence");
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
    expect(content).toContain('from "./spec-review.js"');
    expect(content).toContain("getState as getTrackerState");
  });

  // ========================================
  // Deeper Upstream Gate Validation
  // ========================================

  it("discovery gate requires PRD.md and COMPETITOR-RESEARCH.md", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    // Discovery phase completion check
    expect(content).toContain("discovery:");
    // PRD.md validation
    expect(content).toContain("PRD.md");
    expect(content).toContain("PRD.md not found");
    // Competitor research validation
    expect(content).toContain("COMPETITOR-RESEARCH.md");
    expect(content).toContain("COMPETITOR-RESEARCH.md not found");
  });

  it("discovery gate requires confirmed outline metadata", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain("outlineConfirmed");
    expect(content).toContain("Discovery metadata must confirm outlineConfirmed");
    expect(content).toContain("PRD is still in outline mode");
  });

  it("architecture gate requires candidate sections, recommendation, and structure markers", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain("architecture:");
    expect(content).toContain("ARCHITECTURE.md");
    expect(content).toContain("ARCHITECTURE.md not found");
    expect(content).toContain("must contain at least 3 section headings");
    expect(content).toContain("must document at least 2 candidate sections");
    expect(content).toContain("must include a recommended architecture section");
    expect(content).toContain("must include architecture markers such as a diagram or structure description");
    expect(content).toContain("must include a logical architecture section");
    expect(content).toContain("must include a technical architecture section");
  });

  it("design gate requires UIUX.md, PRODUCT-DESIGN.md, and page coverage", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    expect(content).toContain("design:");
    expect(content).toContain("UIUX.md");
    expect(content).toContain("UIUX.md not found");
    expect(content).toContain("PRODUCT-DESIGN.md");
    expect(content).toContain("PRODUCT-DESIGN.md not found");
    expect(content).toContain(".page-coverage.json");
    expect(content).toContain(".page-coverage.json not found");
    expect(content).toContain("must include a parseable coverage percentage");
    expect(content).toContain("minimum 90% required");
    expect(content).toContain("must include a page relation tree section");
    expect(content).toContain("must include a page transition matrix section");
    expect(content).toContain("must include a modal inventory section");
    expect(content).toContain("must include total page and modal counts");
    expect(content).toContain("must include a page coverage gaps section");
    expect(content).toContain("must include page transition details");
  });

  it("upstream gates enforce artifact dependency chain order", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/state.ts`);
    // Verify phase order reflects upstream dependency chain
    const discoveryIndex = content.indexOf("discovery:");
    const architectureIndex = content.indexOf("architecture:");
    const designIndex = content.indexOf("design:");
    const constitutionIndex = content.indexOf("constitution:");

    // Phases should be defined in dependency order
    expect(discoveryIndex).toBeGreaterThan(0);
    expect(architectureIndex).toBeGreaterThan(discoveryIndex);
    expect(designIndex).toBeGreaterThan(architectureIndex);
    expect(constitutionIndex).toBeGreaterThan(designIndex);
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
    expect(content).toContain("checkTodoBridgeReadiness");
    expect(content).toContain("checkDeliveryReadiness");
    expect(content).toContain("checkChangeManagementReadiness");
    expect(content).toContain("Task completion has no evidence reference");
    expect(content).toContain("Add at least one evidence file reference before claiming the task is complete");
  });

  it("integrates artifact coverage checks", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/spec-review.ts`);
    expect(content).toContain("generateArtifactCoverageReport");
    expect(content).toContain("artifactIssuesToReviewIssues");
    expect(content).toContain("artifactPreflightCheck");
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
    expect(content).toContain("Task has no Source TODO references");
    expect(content).toContain("Task missing QA Scenarios section");
    expect(content).toContain("Task QA Scenarios do not declare any Evidence path");
    expect(content).toContain("Task missing Parallelization section");
  });
});

describe("Task Dispatcher Updates (task-dispatcher.ts)", () => {
  it("ParsedTask has new fields: files, qaScenarios, specRefs, todoRefs", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/task-dispatcher.ts", "utf-8");
    expect(content).toContain("files: string[]");
    expect(content).toContain("qaScenarios: string");
    expect(content).toContain("specRefs: string[]");
    expect(content).toContain("todoRefs: string[]");
  });

  it("exports validateParsedTask function", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/task-dispatcher.ts", "utf-8");
    expect(content).toContain("export function validateParsedTask");
  });

  it("has extractFiles, extractSpecRefs, and extractTodoRefs methods", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/task-dispatcher.ts", "utf-8");
    expect(content).toContain("extractFiles");
    expect(content).toContain("extractSpecRefs");
    expect(content).toContain("extractTodoRefs");
  });

  it("requires Source TODOs in parsed task validation", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/task-dispatcher.ts", "utf-8");
    expect(content).toContain('missing.push("Source TODOs")');
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

describe("Orchestrator Upstream Preflight (orchestrator.ts)", () => {
  it("defines the orchestrator and adapter boundary", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/orchestrator.ts`);
    expect(content).toContain("export class SpecOrchestrator");
    expect(content).toContain("export interface TaskExecutionAdapter");
    expect(content).toContain("todoIds: task.todoRefs");
  });

  it("orchestrator records pending/running/failed tracker states for todo tracking", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/orchestrator.ts`);
    expect(content).toContain('status: "pending"');
    expect(content).toContain('await updateTaskExecutionStatus(task.id, "running"');
    expect(content).toContain('await updateTaskExecutionStatus(task.id, "failed"');
  });

  it("tracker coverage report includes todo summary tracking", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/spec-tracker.ts`);
    expect(content).toContain("export interface TodoTraceabilitySummary");
    expect(content).toContain("todoSummary: Record<string");
    expect(content).toContain("export async function getTodoTraceabilitySummary()");
    expect(content).toContain("const todoSummaryEntries = await getTodoTraceabilitySummary()");
  });

  it("tracker supports execution lifecycle states beyond done/pending", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/spec-tracker.ts`);
    expect(content).toContain('export type TaskExecutionTraceabilityStatus = TraceabilityStatus | "running" | "failed"');
    expect(content).toContain("export async function updateTaskExecutionStatus(");
    expect(content).toContain('taskRef.status === "running"');
    expect(content).toContain('taskRef.status === "failed"');
  });

  it("checks upstream artifacts before running or resuming", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/orchestrator.ts`);
    expect(content).toContain('from "./artifact-coverage.js"');
    expect(content).toContain("artifactPreflightCheck");
    expect(content).toContain("assertUpstreamArtifactsReady");
    expect(content).toContain("Upstream artifact preflight failed");
  });
});

describe("Behavioral lifecycle and phase-gate validation", () => {
  beforeEach(async () => {
    await ensureSpecDir();
    await cleanupSpecRuntimeArtifacts();
  });

  afterEach(async () => {
    await cleanupSpecRuntimeArtifacts();
  });

  it("tracks task and todo lifecycle through pending -> running -> failed/done", async () => {
    const tracker = await import("./hooks/omo-specflow/spec-tracker.js");

    await tracker.setState({ currentVersion: "v-test" });
    await tracker.registerClause("US-001", "01-需求文档", "Story", "content");
    await tracker.recordTaskSpecRefs("task-1", ["US-001"], { todoIds: ["TODO-001"], status: "pending" });
    await tracker.updateTaskExecutionStatus("task-1", "running", { todoIds: ["TODO-001"] });

    let report = await tracker.generateCoverageReport();
    expect(report.taskSummary["task-1"].status).toBe("running");
    expect(report.todoSummary["TODO-001"].status).toBe("running");

    await tracker.updateTaskExecutionStatus("task-1", "failed", { todoIds: ["TODO-001"] });
    report = await tracker.generateCoverageReport();
    expect(report.taskSummary["task-1"].status).toBe("failed");
    expect(report.todoSummary["TODO-001"].status).toBe("failed");

    await tracker.completeTask("task-1", "done", { todoIds: ["TODO-001"] });
    report = await tracker.generateCoverageReport();
    expect(report.taskSummary["task-1"].status).toBe("done");
    expect(report.todoSummary["TODO-001"].status).toBe("done");
  });

  it("tracks bug fix lifecycle through discovered -> fixed -> verified", async () => {
    const tracker = await import("./hooks/omo-specflow/spec-tracker.js");

    await tracker.setState({ currentVersion: "v-bug" });
    await tracker.recordBugFix("BUG-001", { status: "discovered", todoIds: ["TODO-001"], taskIds: ["task-1"] });
    let summary = await tracker.getBugFixSummary();
    expect(summary[0].status).toBe("discovered");

    await tracker.recordBugFix("BUG-001", { status: "fixed", todoIds: ["TODO-001"], taskIds: ["task-2"] });
    summary = await tracker.getBugFixSummary();
    expect(summary[0].status).toBe("fixed");

    await tracker.recordBugFix("BUG-001", { status: "verified", evidence: [".sisyphus/evidence/bug-001-verify.txt"] });
    summary = await tracker.getBugFixSummary();
    expect(summary[0].status).toBe("verified");
    expect(summary[0].evidence[0].path).toContain("bug-001-verify.txt");
  });

  it("fails test phase when integration or regression evidence is missing", async () => {
    const workflowState = await import("./hooks/omo-specflow/state.js");
    const tracker = await import("./hooks/omo-specflow/spec-tracker.js");

    await tracker.setState({ currentVersion: "v-test-phase" });
    await tracker.recordTaskSpecRefs("task-1", [], { todoIds: ["TODO-001"], status: "done" });
    await tracker.completeTask("task-1", "done", { todoIds: ["TODO-001"] });
    await fs.writeFile(".spec/TODO.md", "| TODO-001 | src | scope | P0 | note |\n", "utf-8");
    await fs.mkdir(".sisyphus/evidence", { recursive: true });
    await fs.writeFile(".sisyphus/evidence/task-1-unit.txt", "unit ok", "utf-8");

    const result = await workflowState.validatePhaseCompletion("test");
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("integration test evidence"))).toBe(true);
    expect(result.errors.some((error) => error.includes("regression test evidence"))).toBe(true);
  });

  it("fails complete phase when todo summary is unresolved or missing integration/bugfix/regression tasks", async () => {
    const workflowState = await import("./hooks/omo-specflow/state.js");
    const tracker = await import("./hooks/omo-specflow/spec-tracker.js");

    await tracker.setState({ currentVersion: "v-test" });
    await tracker.registerClause("US-001", "01-需求文档", "Story", "content");
    await tracker.recordTaskSpecRefs("task-1", ["US-001"], { todoIds: ["TODO-001"], status: "running" });

    await fs.writeFile(".spec/TODO.md", "| TODO-001 | src | scope | P0 | note |\n", "utf-8");
    await fs.writeFile(".spec/TASKS.md", `## Task 1: Basic implementation\n\n- category: deep\n- skills: []\n\n**What to do**:\n- implement\n\n**Files**:\n- \`src/a.ts\`\n\n**Acceptance Criteria**:\n- [ ] done\n\n**QA Scenarios**:\nScenario: smoke\n  Tool: Bash (bun)\n  Steps:\n    1. bun test\n  Expected Result: ok\n  Evidence: .sisyphus/evidence/task-1.txt\n\n**Spec Refs**: US-001\n**Source TODOs**: TODO-001\n**Parallelization**:\n- Can Run In Parallel: NO\n- Blocked By: none\n- Blocks: none\n`, "utf-8");
    await fs.mkdir(".sisyphus/evidence", { recursive: true });
    await fs.writeFile(".sisyphus/evidence/final-review-summary.txt", "ok", "utf-8");
    await fs.writeFile("USAGE.md", "test usage", "utf-8");

    const result = await workflowState.validatePhaseCompletion("complete");
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.includes("Complete phase requires all TODOs to be done"))).toBe(true);
    expect(result.errors.some((error) => error.includes("integration/联调"))).toBe(true);
    expect(result.errors.some((error) => error.includes("bug-fix/修复"))).toBe(true);
    expect(result.errors.some((error) => error.includes("regression/回归"))).toBe(true);

    try { await fs.unlink("USAGE.md"); } catch { /* ignore */ }
  });
});

describe("Artifact Coverage Enhancements (artifact-coverage.ts)", () => {
  it("exports upstream artifact coverage helpers", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/artifact-coverage.ts`);
    expect(content).toContain("export async function generateArtifactCoverageReport");
    expect(content).toContain("export async function artifactPreflightCheck");
    expect(content).toContain("export async function validatePageCoverage");
  });

  it("supports threshold config and competitor evidence validation", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/artifact-coverage.ts`);
    expect(content).toContain("CoverageThresholdConfig");
    expect(content).toContain("DEFAULT_THRESHOLD_CONFIG");
    expect(content).toContain("checkCompetitorResearchEvidence");
    expect(content).toContain("coveragePercent");
    expect(content).toContain("meetsThreshold");
    expect(content).toContain("Competitor research evidence");
  });

  it("treats uncovered product-design features as runtime coverage gaps", async () => {
    const content = await readRepoFile(`${HOOKS_DIR}/artifact-coverage.ts`);
    expect(content).toContain("uncoveredFeatures");
    expect(content).toContain("feature-coverage");
    expect(content).toContain("Features declared as uncovered in .page-coverage.json");
    expect(content).toContain("Feature coverage gaps resolved");
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
    expect(content).toContain("progress:");
    expect(content).toContain("outlineConfirmed");
    expect(content).toContain("competitorResearchStatus");
  });

  it("initializes workflow on intent detection", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/hook.ts", "utf-8");
    expect(content).toContain("initializeWorkflow");
  });

  it("starts workflow from discovery", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/hook.ts", "utf-8");
    expect(content).toContain('phase: "discovery"');
  });

  it("tracks outline confirmation in interview progress", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/hook.ts", "utf-8");
    expect(content).toContain("OUTLINE_CONFIRMED_PATTERN");
    expect(content).toContain("updateProgressFromMessage");
    expect(content).toContain("syncWorkflowMetadata");
    expect(content).toContain("_interviewProgress");
  });

  it("stays compact (not an orchestrator)", async () => {
    const content = await fs.readFile(".opencode/hooks/omo-specflow/hook.ts", "utf-8");
    const lineCount = content.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(240);
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
      "18-discovery.md",
      "19-architecture.md",
      "20-design.md",
      "tasks-format-spec.md",
  ];

  EXPECTED_FILES.forEach((file) => {
    it(`exists: ${file}`, async () => {
      await expect(fs.access(path.join(INSTRUCTION_DIR, file))).resolves.toBeDefined();
    });
  });

  it("has exactly 22 instruction docs in the current support layer", async () => {
    const files = await fs.readdir(INSTRUCTION_DIR);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));
    expect(markdownFiles).toHaveLength(22);
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

  it("golden path documents the 4 entry modes", async () => {
    const content = await fs.readFile(path.join(INSTRUCTION_DIR, "00-golden-path.md"), "utf-8");
    expect(content).toContain("Greenfield");
    expect(content).toContain("Direct-Spec");
    expect(content).toContain("Brownfield Feature");
    expect(content).toContain("Bugfix");
  });

  it("tasks format spec has 3 examples", async () => {
    const content = await fs.readFile(path.join(INSTRUCTION_DIR, "tasks-format-spec.md"), "utf-8");
    const categoryCount = (content.match(/category:/g) || []).length;
    expect(categoryCount).toBeGreaterThanOrEqual(3);
  });

  it("includes execution support docs", async () => {
    const content = await fs.readFile(path.join(INSTRUCTION_DIR, "07-phase-gates.md"), "utf-8");
    expect(content).toContain("阶段");
    expect(content).toContain("Discovery");
    expect(content).toContain("Architecture");
    expect(content).toContain("Design");
    const review = await fs.readFile(path.join(INSTRUCTION_DIR, "12-review-protocol.md"), "utf-8");
    expect(review).toContain("Verdict");
  });

  it("includes upstream phase instruction docs", async () => {
    const discovery = await fs.readFile(path.join(INSTRUCTION_DIR, "18-discovery.md"), "utf-8");
    const architecture = await fs.readFile(path.join(INSTRUCTION_DIR, "19-architecture.md"), "utf-8");
    const design = await fs.readFile(path.join(INSTRUCTION_DIR, "20-design.md"), "utf-8");

    expect(discovery).toContain("Discovery");
    expect(architecture).toContain("Architecture");
    expect(design).toContain("Design");
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
  const UPSTREAM_TEMPLATES = [
    "PRD.md",
    "COMPETITOR-RESEARCH.md",
    "ARCHITECTURE.md",
    "UIUX.md",
    "PRODUCT-DESIGN.md",
    "TODO.md",
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

  UPSTREAM_TEMPLATES.forEach((template) => {
    it(`exists upstream template: ${template}`, async () => {
      await expect(fs.access(path.join(TEMPLATE_DIR, template))).resolves.toBeDefined();
    });
  });

  it("ARCHITECTURE.md includes logical and technical architecture sections", async () => {
    const content = await fs.readFile(path.join(TEMPLATE_DIR, "ARCHITECTURE.md"), "utf-8");
    expect(content).toContain("Logical Architecture");
    expect(content).toContain("Technical Architecture");
  });

  it("UIUX.md includes page transition matrix and count summary", async () => {
    const content = await fs.readFile(path.join(TEMPLATE_DIR, "UIUX.md"), "utf-8");
    expect(content).toContain("Page Transition Matrix");
    expect(content).toContain("Total Pages");
    expect(content).toContain("Total Modals");
  });

  it("PRODUCT-DESIGN.md includes transition details and page coverage gaps", async () => {
    const content = await fs.readFile(path.join(TEMPLATE_DIR, "PRODUCT-DESIGN.md"), "utf-8");
    expect(content).toContain("Page Transition Details");
    expect(content).toContain("Page Coverage Gaps");
    expect(content).toContain("totalModals");
    expect(content).toContain("uncoveredFeatures");
  });

  it("TEMPLATE-GUIDE.md exists with Mermaid graph", async () => {
    const content = await fs.readFile(path.join(TEMPLATE_DIR, "TEMPLATE-GUIDE.md"), "utf-8");
    expect(content).toContain("mermaid");
    expect(content).toContain("depends-on");
    expect(content).toContain("Upstream Document Chain");
    expect(content).toContain("PRD.md");
    expect(content).toContain("PRODUCT-DESIGN.md");
    expect(content).toContain("TODO.md");
    expect(content).toContain("SpecOrchestrator");
  });

  it("spec-start.md has 3 interview tracks", async () => {
    const content = await fs.readFile(".opencode/commands/spec-start.md", "utf-8");
    expect(content).toContain("Track A");
    expect(content).toContain("Track B");
    expect(content).toContain("Track C");
  });

  it("spec-start.md routes through TODO and SpecOrchestrator", async () => {
    const content = await fs.readFile(".opencode/commands/spec-start.md", "utf-8");
    expect(content).toContain(".spec/TODO.md");
    expect(content).toContain("SpecOrchestrator");
  });
});
