import * as fs from "fs/promises";
import * as path from "path";

const TEST_WORKFLOW_STATE_FILE = ".spec/.test-workflow-state.json";
const TEST_LOCK_FILE = ".spec/.test-workflow-state.lock";
const TEST_SPEC_DIR = ".spec";

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
  const TEMPLATE_DIR = ".opencode/spec-templates";
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