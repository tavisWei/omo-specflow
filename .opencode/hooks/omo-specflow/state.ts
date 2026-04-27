import * as fs from "fs/promises";
import * as path from "path";
import { generateCoverageReport, getBugFixSummary, getPendingSyncState, getState as getTrackerState, getTasksNeedingResync } from "./spec-tracker.js";
import { detectTemplateGaps, inferProjectType } from "./artifact-coverage.js";
import { performSpecReview } from "./spec-review.js";

const EVIDENCE_DIR = ".sisyphus/evidence";
const README_CANDIDATES = ["README.md", "README.zh-CN.md", "README.cn.md", "USAGE.md"] as const;

interface TaskGateBlock {
  taskNumber: string;
  block: string;
}

interface TodoBridgeItem {
  todoId: string;
  source: string;
  scope: string;
  priority: string;
  notes: string;
}

function isExecutionLifecycleStatus(status: unknown): status is "pending" | "running" | "failed" | "done" | "blocked" {
  return status === "pending"
    || status === "running"
    || status === "failed"
    || status === "done"
    || status === "blocked";
}

/**
 * Workflow phases in order
 * Upstream phases: discovery → architecture → design → constitution
 * Downstream phases: specify → plan → tasks → implement → test → complete
 */
export const WORKFLOW_PHASES = [
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

export type WorkflowPhase = (typeof WORKFLOW_PHASES)[number];

/**
 * Phase transition map - defines valid next phases from each phase
 */
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

/**
 * SpecWorkflowState interface
 */
export interface SpecWorkflowState {
  /** Current phase in the workflow */
  phase: WorkflowPhase;
  /** Whether the current phase has been completed */
  phaseCompleted: boolean;
  /** Timestamp when the workflow was initialized */
  initializedAt: number;
  /** Timestamp when the current phase started */
  phaseStartedAt: number;
  /** Session ID for recovery purposes */
  sessionId?: string;
  /** Optional metadata for each phase */
  metadata?: Partial<Record<WorkflowPhase, Record<string, unknown>>>;
  /** Pending downstream synchronization requirements */
  syncRequirements?: {
    specVersion: string;
    needsTodoResync: boolean;
    needsTaskResync: boolean;
    needsRegressionReplan: boolean;
    templateGaps?: string[];
    updatedAt: number;
  };
}

/**
 * Default initial state
 */
const DEFAULT_STATE: SpecWorkflowState = {
  phase: "discovery",
  phaseCompleted: false,
  initializedAt: Date.now(),
  phaseStartedAt: Date.now(),
};

/**
 * Path to the state file within .spec/ directory
 */
const STATE_FILE_PATH = ".spec/.workflow-state.json";

/**
 * Lock file path for concurrent access handling
 */
const LOCK_FILE_PATH = ".spec/.workflow-state.lock";

/**
 * Error class for workflow state errors
 */
export class WorkflowStateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowStateError";
  }
}

/**
 * Acquires a file lock using a simple lock file approach.
 * Uses a spin-wait with exponential backoff for lock acquisition.
 */
async function acquireLock(lockPath: string, maxWaitMs = 5000): Promise<() => Promise<void>> {
  const startTime = Date.now();
  let lockHandle: import("fs/promises").FileHandle | null = null;

  while (Date.now() - startTime < maxWaitMs) {
    try {
      lockHandle = await fs.open(lockPath, "wx");
      return async () => {
        if (lockHandle !== null) {
          await lockHandle.close();
          try {
            await fs.unlink(lockPath);
          } catch {
            // Ignore if lock file already removed
          }
        }
      };
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 10));
    }
  }

  throw new WorkflowStateError("Failed to acquire lock for state file");
}

/**
 * Atomically read and parse the state file
 */
async function readStateFile(): Promise<SpecWorkflowState | null> {
  try {
    const content = await fs.readFile(STATE_FILE_PATH, "utf-8");
    const state = JSON.parse(content) as SpecWorkflowState;
    return state;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Atomically write state to file using temp file + rename pattern
 */
async function writeStateFile(state: SpecWorkflowState): Promise<void> {
  const dir = path.dirname(STATE_FILE_PATH);

  // Ensure .spec directory exists
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      throw err;
    }
  }

  // Write to temp file first
  const tempPath = `${STATE_FILE_PATH}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), "utf-8");

  // Atomic rename (on POSIX systems this is atomic if on same filesystem)
  await fs.rename(tempPath, STATE_FILE_PATH);
}

/**
 * Validates if a phase transition is allowed
 */
function isValidTransition(currentPhase: WorkflowPhase, nextPhase: WorkflowPhase): boolean {
  const allowed = PHASE_TRANSITIONS[currentPhase];
  if (allowed === "terminal") {
    return false;
  }
  return allowed.includes(nextPhase);
}

/**
 * Gets the next phase in the workflow
 */
function getNextPhase(currentPhase: WorkflowPhase): WorkflowPhase | null {
  const currentIndex = WORKFLOW_PHASES.indexOf(currentPhase);
  if (currentIndex === -1 || currentIndex === WORKFLOW_PHASES.length - 1) {
    return null;
  }
  return WORKFLOW_PHASES[currentIndex + 1];
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseTaskBlocks(content: string): TaskGateBlock[] {
  const matches = [...content.matchAll(/^## Task\s+(\d+)\s*:/gm)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? content.length;
    return {
      taskNumber: match[1],
      block: content.slice(start, end).trim(),
    };
  });
}

function extractEvidencePaths(content: string): string[] {
  const matches = [...content.matchAll(/Evidence:\s*([^\s`]+)/g)];
  return [...new Set(matches.map((match) => match[1].trim()))];
}

function extractTodoRefs(content: string): string[] {
  return [...new Set((content.match(/TODO-\d+/gi) || []).map((match) => match.toUpperCase()))];
}

function parseTodoBridge(content: string): TodoBridgeItem[] {
  const lines = content.split("\n");
  return lines
    .filter((line) => /^\|\s*TODO-\d+/i.test(line))
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim()).filter(Boolean);
      return {
        todoId: (parts[0] || "").toUpperCase(),
        source: parts[1] || "",
        scope: parts[2] || "",
        priority: parts[3] || "",
        notes: parts[4] || "",
      };
    })
    .filter((item) => item.todoId.length > 0);
}

function hasTaskSection(content: string, sectionTitle: string): boolean {
  const normalized = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\*\\*${normalized}\\*\\*:`, "i");
  return pattern.test(content);
}

function hasTaskKeyword(content: string, keywords: string[]): boolean {
  return keywords.some((keyword) => new RegExp(keyword, "i").test(content));
}

async function getExistingReadmeFiles(): Promise<string[]> {
  const existing = await Promise.all(
    README_CANDIDATES.map(async (candidate) => ((await pathExists(candidate)) ? candidate : null))
  );
  return existing.filter((file): file is (typeof README_CANDIDATES)[number] => file !== null);
}

async function getConfiguredTodoIds(specDir: string): Promise<Set<string>> {
  try {
    const todoContent = await fs.readFile(path.join(specDir, "TODO.md"), "utf-8");
    return new Set(parseTodoBridge(todoContent).map((item) => item.todoId));
  } catch {
    return new Set<string>();
  }
}

async function getDetectedTemplateGaps(specDir: string, workflowState?: SpecWorkflowState): Promise<string[]> {
  const trackerState = await getTrackerState();
  const discoveryMetadata = workflowState?.metadata?.discovery ?? {};
  const interviewTrack = typeof discoveryMetadata.interviewTrack === "string"
    ? discoveryMetadata.interviewTrack.toLowerCase()
    : "web";
  const specDirEntries = await fs.readdir(specDir).catch(() => [] as string[]);
  const existingFiles = new Set(specDirEntries);
  const clauseText = Object.values(trackerState.clauses)
    .map((clause) => `${clause.section}\n${clause.title}\n${clause.content}`)
    .join("\n");

  return detectTemplateGaps({
    projectType: inferProjectType(interviewTrack),
    clauseText,
    existingFiles,
  });
}

async function syncWorkflowStateWithTracker(): Promise<SpecWorkflowState> {
  const workflowState = await readStateFile() ?? { ...DEFAULT_STATE };
  const syncState = await getPendingSyncState();
  if (!syncState) {
    if (!workflowState.syncRequirements) {
      return workflowState;
    }

    const nextState: SpecWorkflowState = {
      ...workflowState,
      syncRequirements: undefined,
    };
    await writeStateFile(nextState);
    return nextState;
  }

  const templateGaps = await getDetectedTemplateGaps(".spec", workflowState);
  const nextState: SpecWorkflowState = {
    ...workflowState,
    syncRequirements: {
      specVersion: syncState.specVersion,
      needsTodoResync: syncState.needsTodoResync,
      needsTaskResync: syncState.needsTaskResync,
      needsRegressionReplan: syncState.needsRegressionReplan,
      templateGaps,
      updatedAt: syncState.updatedAt,
    },
  };
  await writeStateFile(nextState);
  return nextState;
}

async function collectSyncGateErrors(specDir: string): Promise<string[]> {
  const errors: string[] = [];
  const syncedState = await syncWorkflowStateWithTracker();
  const syncRequirements = syncedState.syncRequirements;
  if (!syncRequirements) {
    return errors;
  }

  if (syncRequirements.needsTodoResync) {
    errors.push(`Spec changed in ${syncRequirements.specVersion}; TODO.md must be resynchronized before proceeding`);
  }
  if (syncRequirements.needsTaskResync) {
    errors.push(`Spec changed in ${syncRequirements.specVersion}; TASKS.md must be resynchronized before proceeding`);
  }
  if (syncRequirements.needsRegressionReplan) {
    errors.push(`Spec changed in ${syncRequirements.specVersion}; regression plan and evidence scope must be refreshed before proceeding`);
  }
  if ((syncRequirements.templateGaps?.length ?? 0) > 0) {
    errors.push(`Spec scope requires additional template coverage: ${syncRequirements.templateGaps?.join(", ")}`);
  }

  const tasksNeedingResync = await getTasksNeedingResync();
  if (tasksNeedingResync.length > 0) {
    errors.push(`Tasks requiring spec resync: ${tasksNeedingResync.map((task) => task.taskId).join(", ")}`);
  }

  return errors;
}

async function getEvidenceFiles(): Promise<string[]> {
  if (!(await pathExists(EVIDENCE_DIR))) {
    return [];
  }
  return fs.readdir(EVIDENCE_DIR);
}

function hasEvidenceMatch(evidenceFiles: string[], patterns: RegExp[]): boolean {
  return evidenceFiles.some((file) => patterns.some((pattern) => pattern.test(file)));
}

function countHeadings(content: string): number {
  return (content.match(/^#{1,3}\s+/gm) || []).length;
}

function hasEvidenceSignals(content: string): boolean {
  return /https?:\/\//i.test(content)
    || /\|[^\n]+\|/.test(content)
    || /\[[^\]]+\]\([^)]+\)/.test(content)
    || /Stars?|GitHub|Repo/i.test(content);
}

function hasStructuredCompetitorEntries(content: string): boolean {
  const sectionMatches = content.match(/^##\s+/gm) || [];
  const bulletMatches = content.match(/^-\s+/gm) || [];
  const tableRows = content.match(/^\|.+\|$/gm) || [];
  return sectionMatches.length >= 3 || bulletMatches.length >= 3 || tableRows.length >= 4;
}

function hasArchitectureMarkers(content: string): boolean {
  return /mermaid|graph\s+TD|flowchart|sequenceDiagram/i.test(content)
    || /目录结构|Directory Structure|模块划分|Modules?/i.test(content);
}

function hasRecommendation(content: string): boolean {
  return /推荐方案|Recommended|Recommendation|推荐结论/i.test(content);
}

function countCandidateSections(content: string): number {
  const matches = content.match(/^(?:##|###)\s+.*(?:方案|Candidate|Option)/gim) || [];
  return matches.length;
}

function parsePageCoverage(content: string): { percent?: number; totalPages?: number; coveredPages?: number } | null {
  try {
    const data = JSON.parse(content) as {
      coveragePercent?: number;
      coverage?: number;
      percent?: number;
      totalPages?: number;
      coveredPages?: number;
      uncoveredPages?: string[];
    };

    const explicitPercent = [data.coveragePercent, data.coverage, data.percent].find(
      (value): value is number => typeof value === "number" && Number.isFinite(value)
    );
    if (typeof explicitPercent === "number") {
      return {
        percent: explicitPercent,
        totalPages: data.totalPages,
        coveredPages: data.coveredPages,
      };
    }

    if (
      typeof data.totalPages === "number"
      && Number.isFinite(data.totalPages)
      && data.totalPages > 0
    ) {
      const coveredPages = typeof data.coveredPages === "number"
        ? data.coveredPages
        : data.totalPages - (data.uncoveredPages?.length ?? 0);
      return {
        percent: (coveredPages / data.totalPages) * 100,
        totalPages: data.totalPages,
        coveredPages,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function hasPageTransitionMatrix(content: string): boolean {
  return /页面跳转矩阵|Page Transition Matrix/i.test(content);
}

function hasPageRelationTree(content: string): boolean {
  return /页面关系树|Page Relation Tree/i.test(content);
}

function hasModalInventory(content: string): boolean {
  return /模态框清单|Modal Inventory/i.test(content);
}

function hasPageCountSummary(content: string): boolean {
  return /页面总数|Total Pages/i.test(content) && /弹窗总数|Total Modals/i.test(content);
}

function hasLogicalArchitecture(content: string): boolean {
  return /逻辑架构|Logical Architecture/i.test(content);
}

function hasTechnicalArchitecture(content: string): boolean {
  return /技术架构|Technical Architecture/i.test(content);
}

function hasPageCoverageGaps(content: string): boolean {
  return /页面功能缺口|Page Coverage Gaps/i.test(content);
}

/**
 * Get the current workflow state.
 * Returns default state if no state file exists.
 */
export async function getState(): Promise<SpecWorkflowState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const state = await readStateFile();
    return state ?? { ...DEFAULT_STATE };
  } finally {
    await release();
  }
}

/**
 * Set the workflow state directly.
 * Use with caution - prefer nextPhase() or completePhase() for normal flow.
 */
export async function setState(state: Partial<SpecWorkflowState> & { phase: WorkflowPhase }): Promise<SpecWorkflowState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    const newState: SpecWorkflowState = {
      ...currentState ?? DEFAULT_STATE,
      ...state,
      phaseStartedAt: state.phase !== currentState?.phase ? Date.now() : currentState?.phaseStartedAt ?? Date.now(),
    };

    // Validate phase is a known phase
    if (!WORKFLOW_PHASES.includes(newState.phase)) {
      throw new WorkflowStateError(`Invalid phase: ${newState.phase}`);
    }

    await writeStateFile(newState);
    return newState;
  } finally {
    await release();
  }
}

/**
 * Advance to the next phase in the workflow.
 * Validates that the current phase is completed before advancing.
 */
export async function nextPhase(sessionId?: string): Promise<SpecWorkflowState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();

    if (!currentState) {
      throw new WorkflowStateError("No workflow state found. Initialize with setState() first.");
    }

    if (!currentState.phaseCompleted) {
      throw new WorkflowStateError(
        `Cannot advance from phase "${currentState.phase}" until it is completed. Call completePhase() first.`
      );
    }

    const nextPhase = getNextPhase(currentState.phase);
    if (nextPhase === null) {
      throw new WorkflowStateError(`Cannot advance from terminal phase "${currentState.phase}"`);
    }

    const newState: SpecWorkflowState = {
      ...currentState,
      phase: nextPhase,
      phaseCompleted: false,
      phaseStartedAt: Date.now(),
      sessionId: sessionId ?? currentState.sessionId,
    };

    await writeStateFile(newState);
    return newState;
  } finally {
    await release();
  }
}

/**
 * Phase completion criteria — defines what must be true for each phase to complete.
 */
const PHASE_COMPLETION_CHECKS: Record<WorkflowPhase, (specDir: string) => Promise<{ valid: boolean; errors: string[] }>> = {
  constitution: async (specDir) => {
    const errors: string[] = [];
    const specPath = path.join(specDir, "SPEC.md");
    try {
      const content = await fs.readFile(specPath, "utf-8");
      if (!content.includes("Vision") && !content.includes("愿景")) {
        errors.push("SPEC.md missing Vision section");
      }
      if (!content.includes("Values") && !content.includes("价值观")) {
        errors.push("SPEC.md missing Values section");
      }
      if (!content.includes("Constraints") && !content.includes("约束")) {
        errors.push("SPEC.md missing Constraints section");
      }
    } catch {
      errors.push("SPEC.md not found at " + specPath);
    }
    return { valid: errors.length === 0, errors };
  },

  discovery: async (specDir) => {
    const errors: string[] = [];
    const workflowState = await getState();
    const discoveryMetadata = workflowState.metadata?.discovery;
    const prdPath = path.join(specDir, "PRD.md");
    try {
      const content = await fs.readFile(prdPath, "utf-8");
      if (countHeadings(content) < 3) {
        errors.push("PRD.md must contain at least 3 section headings");
      }
    } catch {
      errors.push("PRD.md not found at " + prdPath);
    }
    const researchPath = path.join(specDir, "COMPETITOR-RESEARCH.md");
    try {
      const content = await fs.readFile(researchPath, "utf-8");
      if (!hasStructuredCompetitorEntries(content)) {
        errors.push("COMPETITOR-RESEARCH.md must contain at least 3 structured competitor entries");
      }
      if (!hasEvidenceSignals(content)) {
        errors.push("COMPETITOR-RESEARCH.md must include evidence signals such as URLs, citations, or comparison tables");
      }
    } catch {
      errors.push("COMPETITOR-RESEARCH.md not found at " + researchPath);
    }
    if (!discoveryMetadata?.outlineConfirmed) {
      errors.push("Discovery metadata must confirm outlineConfirmed before leaving outline-first PRD mode");
    }
    if (discoveryMetadata?.prdStatus === "outline") {
      errors.push("Discovery metadata indicates PRD is still in outline mode");
    }
    return { valid: errors.length === 0, errors };
  },

  architecture: async (specDir) => {
    const errors: string[] = [];
    const archPath = path.join(specDir, "ARCHITECTURE.md");
    try {
      const content = await fs.readFile(archPath, "utf-8");
      if (countHeadings(content) < 3) {
        errors.push("ARCHITECTURE.md must contain at least 3 section headings");
      }
      if (countCandidateSections(content) < 2) {
        errors.push("ARCHITECTURE.md must document at least 2 candidate sections");
      }
      if (!hasRecommendation(content)) {
        errors.push("ARCHITECTURE.md must include a recommended architecture section");
      }
      if (!hasArchitectureMarkers(content)) {
        errors.push("ARCHITECTURE.md must include architecture markers such as a diagram or structure description");
      }
      if (!hasLogicalArchitecture(content)) {
        errors.push("ARCHITECTURE.md must include a logical architecture section");
      }
      if (!hasTechnicalArchitecture(content)) {
        errors.push("ARCHITECTURE.md must include a technical architecture section");
      }
    } catch {
      errors.push("ARCHITECTURE.md not found at " + archPath);
    }
    return { valid: errors.length === 0, errors };
  },

  design: async (specDir) => {
    const errors: string[] = [];
    const uiuxPath = path.join(specDir, "UIUX.md");
    try {
      const uiuxContent = await fs.readFile(uiuxPath, "utf-8");
      if (countHeadings(uiuxContent) < 3) {
        errors.push("UIUX.md must contain at least 3 meaningful section headings");
      }
      if (!hasPageRelationTree(uiuxContent)) {
        errors.push("UIUX.md must include a page relation tree section");
      }
      if (!hasPageTransitionMatrix(uiuxContent)) {
        errors.push("UIUX.md must include a page transition matrix section");
      }
      if (!hasModalInventory(uiuxContent)) {
        errors.push("UIUX.md must include a modal inventory section");
      }
      if (!hasPageCountSummary(uiuxContent)) {
        errors.push("UIUX.md must include total page and modal counts");
      }
    } catch {
      errors.push("UIUX.md not found at " + uiuxPath);
    }
    const productDesignPath = path.join(specDir, "PRODUCT-DESIGN.md");
    try {
      const productDesignContent = await fs.readFile(productDesignPath, "utf-8");
      if (countHeadings(productDesignContent) < 3) {
        errors.push("PRODUCT-DESIGN.md must contain at least 3 meaningful section headings");
      }
      if (!hasPageCoverageGaps(productDesignContent)) {
        errors.push("PRODUCT-DESIGN.md must include a page coverage gaps section");
      }
      if (!hasPageTransitionMatrix(productDesignContent) && !/页面跳转详情|Page Transition Details/i.test(productDesignContent)) {
        errors.push("PRODUCT-DESIGN.md must include page transition details");
      }
    } catch {
      errors.push("PRODUCT-DESIGN.md not found at " + productDesignPath);
    }
    const coveragePath = path.join(specDir, ".page-coverage.json");
    try {
      const coverageContent = await fs.readFile(coveragePath, "utf-8");
      const coverage = parsePageCoverage(coverageContent);
      if (!coverage || typeof coverage.percent !== "number") {
        errors.push(".page-coverage.json must include a parseable coverage percentage or total/covered page counts");
      } else if (coverage.percent < 90) {
        errors.push(`.page-coverage.json coverage is ${coverage.percent.toFixed(1)}% (minimum 90% required)`);
      }
    } catch {
      errors.push(".page-coverage.json not found at " + coveragePath);
    }
    return { valid: errors.length === 0, errors };
  },

  specify: async (_specDir) => {
    const errors: string[] = [];
    try {
      const report = await generateCoverageReport();
      if (report.totalClauses < 3) {
        errors.push(`Only ${report.totalClauses} US/AC clauses registered (minimum 3 required)`);
      }
    } catch {
      errors.push("Failed to check spec-tracker clauses — ensure clauses are registered");
    }
    return { valid: errors.length === 0, errors };
  },

  plan: async (specDir) => {
    const errors: string[] = await collectSyncGateErrors(specDir);
    const tasksPath = path.join(specDir, "TASKS.md");
    const todoPath = path.join(specDir, "TODO.md");
    try {
      const todoContent = await fs.readFile(todoPath, "utf-8");
      const todoItems = parseTodoBridge(todoContent);
      if (todoItems.length === 0) {
        errors.push("TODO.md must contain at least 1 TODO row (| TODO-001 | ...) before generating TASKS.md");
      }
    } catch {
      errors.push("TODO.md not found at " + todoPath);
    }
    try {
      const content = await fs.readFile(tasksPath, "utf-8");
      const taskMatches = content.match(/^## Task \d+/gm);
      if (!taskMatches || taskMatches.length < 1) {
        errors.push("TASKS.md must contain at least 1 task (## Task N: format)");
      }
    } catch {
      errors.push("TASKS.md not found at " + tasksPath);
    }
    return { valid: errors.length === 0, errors };
  },

  tasks: async (specDir) => {
    const errors: string[] = await collectSyncGateErrors(specDir);
    const tasksPath = path.join(specDir, "TASKS.md");
    const todoPath = path.join(specDir, "TODO.md");
    let todoIds = new Set<string>();
    const referencedTodoIds = new Set<string>();
    try {
      const todoContent = await fs.readFile(todoPath, "utf-8");
      todoIds = new Set(parseTodoBridge(todoContent).map((item) => item.todoId));
      if (todoIds.size === 0) {
        errors.push("TODO.md must contain at least 1 TODO row before task refinement");
      }
    } catch {
      errors.push("TODO.md not found at " + todoPath);
    }
    try {
      const content = await fs.readFile(tasksPath, "utf-8");
      const taskBlocks = parseTaskBlocks(content);
      for (let i = 0; i < taskBlocks.length; i++) {
        const block = taskBlocks[i].block;
        if (!block.includes("Acceptance Criteria")) {
          errors.push(`Task ${taskBlocks[i].taskNumber} missing Acceptance Criteria`);
        }
        if (!block.match(/US-\d+|AC-\d+|Spec Refs/)) {
          errors.push(`Task ${taskBlocks[i].taskNumber} missing spec clause references`);
        }
        if (!block.includes("**Files**:") && !block.includes("Files:")) {
          errors.push(`Task ${taskBlocks[i].taskNumber} missing Files section`);
        }
        if (!block.includes("**QA Scenarios**:")) {
          errors.push(`Task ${taskBlocks[i].taskNumber} missing QA Scenarios`);
        }
        if (extractEvidencePaths(block).length === 0) {
          errors.push(`Task ${taskBlocks[i].taskNumber} missing Evidence path for verification traceability`);
        }
        const taskTodoRefs = extractTodoRefs(block);
        if (taskTodoRefs.length === 0) {
          errors.push(`Task ${taskBlocks[i].taskNumber} missing Source TODO references`);
        }
        taskTodoRefs.forEach((todoId) => referencedTodoIds.add(todoId));
        const invalidTodoRefs = taskTodoRefs.filter((todoId) => !todoIds.has(todoId));
        if (invalidTodoRefs.length > 0) {
          errors.push(`Task ${taskBlocks[i].taskNumber} references TODO IDs missing from TODO.md: ${invalidTodoRefs.join(", ")}`);
        }

        const isIntegrationTask = hasTaskKeyword(block, ["联调", "integration", "frontend-backend", "front-end/back-end", "api contract"]);
        if (isIntegrationTask && !hasTaskSection(block, "Integration Validation")) {
          errors.push(`Task ${taskBlocks[i].taskNumber} missing Integration Validation section`);
        }

        const isBugFixTask = hasTaskKeyword(block, ["bug", "缺陷", "修复", "fix"]);
        if (isBugFixTask && !hasTaskSection(block, "Bug Fix Trace")) {
          errors.push(`Task ${taskBlocks[i].taskNumber} missing Bug Fix Trace section`);
        }

        const isRegressionTask = hasTaskKeyword(block, ["regression", "回归"]);
        if (isRegressionTask && !hasTaskSection(block, "Regression Scope")) {
          errors.push(`Task ${taskBlocks[i].taskNumber} missing Regression Scope section`);
        }
      }

      const unmappedTodoIds = [...todoIds].filter((todoId) => !referencedTodoIds.has(todoId));
      if (unmappedTodoIds.length > 0) {
        errors.push(`TODO items missing task coverage in TASKS.md: ${unmappedTodoIds.join(", ")}`);
      }
    } catch {
      errors.push("TASKS.md not found at " + tasksPath);
    }
    return { valid: errors.length === 0, errors };
  },

  implement: async (specDir) => {
    const errors: string[] = await collectSyncGateErrors(specDir);
    try {
      const report = await generateCoverageReport();
      if (report.coveragePercent < 80) {
        errors.push(`Spec coverage is ${report.coveragePercent}% (minimum 80% required)`);
      }

      const todoEntries = Object.entries(report.todoSummary);
      if (todoEntries.length === 0) {
        errors.push("No TODO lifecycle entries found in coverage report — implement phase requires spec->todo tracking");
      }

      const configuredTodoIds = await getConfiguredTodoIds(specDir);
      const missingTrackedTodos = [...configuredTodoIds].filter((todoId) => !(todoId in report.todoSummary));
      if (missingTrackedTodos.length > 0) {
        errors.push(`Implement phase requires every TODO to be tracked in coverage report: ${missingTrackedTodos.join(", ")}`);
      }

      const failedTodos = todoEntries.filter(([, todo]) => todo.status === "failed");
      if (failedTodos.length > 0) {
        errors.push(`TODOs in failed state must be resolved before leaving implement phase: ${failedTodos.map(([todoId]) => todoId).join(", ")}`);
      }

      const invalidTodoStates = todoEntries.filter(([, todo]) => !isExecutionLifecycleStatus(todo.status));
      if (invalidTodoStates.length > 0) {
        errors.push(`Coverage report contains invalid TODO lifecycle states: ${invalidTodoStates.map(([todoId]) => todoId).join(", ")}`);
      }

       const trackerState = await getTrackerState();
       const completedTaskRefs = Object.values(trackerState.taskRefs).filter((taskRef) => !!taskRef.completedAt);
       if (Object.keys(trackerState.taskRefs).length > 0 && completedTaskRefs.length === 0) {
         errors.push("No tracker tasks are marked completed — implement phase requires completed key tasks before exit");
      }

      const evidenceFiles = await getEvidenceFiles();
      if (!hasEvidenceMatch(evidenceFiles, [/unit/i, /vitest/i, /jest/i, /test/i])) {
        errors.push(`Implement phase requires unit test execution evidence in ${EVIDENCE_DIR}`);
      }

      for (const taskRef of completedTaskRefs) {
        const taskNumberMatch = /(?:^|-)task-(\d+)(?:-|$)/i.exec(taskRef.taskId)
          ?? /(?:^|-)?(\d+)(?:-|$)/.exec(taskRef.taskId);
        const evidencePrefix = taskNumberMatch ? `task-${taskNumberMatch[1]}-` : taskRef.taskId;
        if (evidenceFiles.length === 0) {
          errors.push(`Evidence directory ${EVIDENCE_DIR} not found for completed task ${taskRef.taskId}`);
          break;
        }
        const matchingEvidence = evidenceFiles.filter((file: string) => file.includes(evidencePrefix));
        if (matchingEvidence.length === 0) {
          errors.push(`Completed task ${taskRef.taskId} has no evidence file in ${EVIDENCE_DIR}`);
        }
      }
    } catch {
      errors.push("Failed to generate coverage report");
    }
    return { valid: errors.length === 0, errors };
  },

  test: async (specDir) => {
    const errors: string[] = await collectSyncGateErrors(specDir);
    try {
      const report = await generateCoverageReport();
      const configuredTodoIds = await getConfiguredTodoIds(specDir);
      const todoEntries = Object.entries(report.todoSummary);
      const missingTrackedTodos = [...configuredTodoIds].filter((todoId) => !(todoId in report.todoSummary));
      if (missingTrackedTodos.length > 0) {
        errors.push(`Test phase requires every TODO to remain tracked: ${missingTrackedTodos.join(", ")}`);
      }

      const activeTodos = todoEntries.filter(([, todo]) => todo.status === "running" || todo.status === "failed");
      if (activeTodos.length > 0) {
        errors.push(`Test phase requires no running or failed TODOs: ${activeTodos.map(([todoId, todo]) => `${todoId}=${todo.status}`).join(", ")}`);
      }

      const evidenceFiles = await getEvidenceFiles();
      if (!hasEvidenceMatch(evidenceFiles, [/integration/i, /联调/i, /contract/i, /e2e/i])) {
        errors.push(`Test phase requires integration test evidence in ${EVIDENCE_DIR}`);
      }
      if (!hasEvidenceMatch(evidenceFiles, [/regression/i, /回归/i])) {
        errors.push(`Test phase requires regression test evidence in ${EVIDENCE_DIR}`);
      }

      const bugFixSummary = await getBugFixSummary();
      const unresolvedBugFixes = bugFixSummary.filter((bug) => bug.status !== "verified");
      if (unresolvedBugFixes.length > 0) {
        errors.push(`Test phase requires bug fixes to be verified: ${unresolvedBugFixes.map((bug) => `${bug.bugId}=${bug.status}`).join(", ")}`);
      }
    } catch {
      errors.push("Failed to validate test phase artifacts");
    }
    return { valid: errors.length === 0, errors };
  },

  complete: async (_specDir) => {
    const errors: string[] = await collectSyncGateErrors(".spec");
    try {
      const review = await performSpecReview();
      if (review.verdict !== "OKAY") {
        errors.push(`Spec review verdict is ${review.verdict}`);
      }
      const blockingIssues = review.issues.filter((i) => i.severity === "blocking");
      if (blockingIssues.length > 0) {
        for (const issue of blockingIssues) {
          errors.push(`Blocking: ${issue.description}`);
        }
      }

      const readmeFiles = await getExistingReadmeFiles();
      if (readmeFiles.length === 0) {
        errors.push("Delivery checklist requires README.md or USAGE.md to be present");
      }

      if (!(await pathExists(EVIDENCE_DIR))) {
        errors.push(`Delivery checklist requires ${EVIDENCE_DIR} with QA evidence files`);
      } else {
        const evidenceFiles = await fs.readdir(EVIDENCE_DIR);
        const finalReviewEvidence = evidenceFiles.find((file: string) => /final-review|review-summary/i.test(file));
        if (!finalReviewEvidence) {
          errors.push("Final review evidence file is missing from .sisyphus/evidence/");
        }
      }

      const report = await generateCoverageReport();
      const todoEntries = Object.entries(report.todoSummary);
      if (todoEntries.length === 0) {
        errors.push("Complete phase requires todoSummary entries in coverage report");
      }

      const configuredTodoIds = await getConfiguredTodoIds(".spec");
      const missingTrackedTodos = [...configuredTodoIds].filter((todoId) => !(todoId in report.todoSummary));
      if (missingTrackedTodos.length > 0) {
        errors.push(`Complete phase requires every TODO to be tracked: ${missingTrackedTodos.join(", ")}`);
      }

      const unresolvedTodos = todoEntries.filter(([, todo]) => todo.status !== "done");
      if (unresolvedTodos.length > 0) {
        errors.push(`Complete phase requires all TODOs to be done: ${unresolvedTodos.map(([todoId, todo]) => `${todoId}=${todo.status}`).join(", ")}`);
      }

      const bugFixSummary = await getBugFixSummary();
      const unresolvedBugFixes = bugFixSummary.filter((bug) => bug.status !== "verified");
      if (unresolvedBugFixes.length > 0) {
        errors.push(`Complete phase requires bug fixes to be verified: ${unresolvedBugFixes.map((bug) => `${bug.bugId}=${bug.status}`).join(", ")}`);
      }

      const tasksContent = await fs.readFile(path.join(".spec", "TASKS.md"), "utf-8");
      const taskBlocks = parseTaskBlocks(tasksContent);
      const hasIntegrationTask = taskBlocks.some((task) => {
        const block = task.block;
        return hasTaskKeyword(block, ["联调", "integration", "frontend-backend", "front-end/back-end", "api contract"])
          || hasTaskSection(block, "Integration Validation");
      });
      if (!hasIntegrationTask) {
        errors.push("Complete phase requires at least 1 integration/联调 task tracked in TASKS.md");
      }

      const hasBugfixTask = taskBlocks.some((task) => {
        const block = task.block;
        return hasTaskKeyword(block, ["bug", "缺陷", "修复", "fix"]) || hasTaskSection(block, "Bug Fix Trace");
      });
      if (!hasBugfixTask) {
        errors.push("Complete phase requires at least 1 bug-fix/修复 task tracked in TASKS.md");
      }

      const hasRegressionTask = taskBlocks.some((task) => {
        const block = task.block;
        return hasTaskKeyword(block, ["regression", "回归"]) || hasTaskSection(block, "Regression Scope");
      });
      if (!hasRegressionTask) {
        errors.push("Complete phase requires at least 1 regression/回归 task tracked in TASKS.md");
      }
    } catch {
      errors.push("Failed to run spec review");
    }
    return { valid: errors.length === 0, errors };
  },
};

/**
 * Validate whether a phase's completion criteria are met.
 * Returns validation result with any errors found.
 */
export async function validatePhaseCompletion(
  phase: WorkflowPhase,
  specDir: string = ".spec"
): Promise<{ valid: boolean; errors: string[] }> {
  const check = PHASE_COMPLETION_CHECKS[phase];
  return check(specDir);
}

/**
 * Mark the current phase as completed.
 * Validates phase completion criteria before marking complete.
 * Throws WorkflowStateError if criteria are not met.
 */
export async function completePhase(metadata?: Record<string, unknown>): Promise<SpecWorkflowState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();

    if (!currentState) {
      throw new WorkflowStateError("No workflow state found. Initialize with setState() first.");
    }

    if (currentState.phaseCompleted) {
      throw new WorkflowStateError(`Phase "${currentState.phase}" is already completed.`);
    }

    const validation = await validatePhaseCompletion(currentState.phase);
    if (!validation.valid) {
      throw new WorkflowStateError(
        `Phase "${currentState.phase}" completion criteria not met:\n- ${validation.errors.join("\n- ")}`
      );
    }

    const newMetadata = metadata
      ? { ...currentState.metadata, [currentState.phase]: { ...currentState.metadata?.[currentState.phase], ...metadata } }
      : currentState.metadata;

    const newState: SpecWorkflowState = {
      ...currentState,
      phaseCompleted: true,
      metadata: newMetadata,
    };

    await writeStateFile(newState);
    return newState;
  } finally {
    await release();
  }
}

/**
 * Reset the workflow state to initial state.
 * Optionally starts with a specific phase.
 */
export async function reset(startPhase: WorkflowPhase = "discovery"): Promise<SpecWorkflowState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const newState: SpecWorkflowState = {
      ...DEFAULT_STATE,
      phase: startPhase,
      initializedAt: Date.now(),
      phaseStartedAt: Date.now(),
    };

    await writeStateFile(newState);
    return newState;
  } finally {
    await release();
  }
}

/**
 * Recover a session by restoring state with a specific session ID.
 * Useful for resuming interrupted workflows.
 */
export async function recoverSession(sessionId: string, phase?: WorkflowPhase): Promise<SpecWorkflowState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();

    if (currentState && currentState.sessionId === sessionId) {
      // Session matches, return existing state
      return currentState;
    }

    // Create new state for recovered session
    const newState: SpecWorkflowState = {
      ...DEFAULT_STATE,
      phase: phase ?? currentState?.phase ?? "discovery",
      sessionId,
      initializedAt: Date.now(),
      phaseStartedAt: Date.now(),
    };

    await writeStateFile(newState);
    return newState;
  } finally {
    await release();
  }
}

/**
 * Get the state file path for external reference
 */
export function getStateFilePath(): string {
  return STATE_FILE_PATH;
}
