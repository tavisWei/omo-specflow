import * as fs from "fs/promises";
import * as path from "path";
import { generateCoverageReport, getState as getTrackerState } from "./spec-tracker.js";
import { performSpecReview } from "./spec-review.js";

const EVIDENCE_DIR = ".sisyphus/evidence";
const README_CANDIDATES = ["README.md", "README.zh-CN.md", "README.cn.md", "USAGE.md"] as const;

interface TaskGateBlock {
  taskNumber: string;
  block: string;
}

/**
 * Workflow phases in order
 */
export const WORKFLOW_PHASES = [
  "constitution",
  "specify",
  "plan",
  "tasks",
  "implement",
  "complete",
] as const;

export type WorkflowPhase = (typeof WORKFLOW_PHASES)[number];

/**
 * Phase transition map - defines valid next phases from each phase
 */
const PHASE_TRANSITIONS: Record<WorkflowPhase, WorkflowPhase[] | "terminal"> = {
  constitution: ["specify"],
  specify: ["plan"],
  plan: ["tasks"],
  tasks: ["implement"],
  implement: ["complete"],
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
}

/**
 * Default initial state
 */
const DEFAULT_STATE: SpecWorkflowState = {
  phase: "constitution",
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

async function getExistingReadmeFiles(): Promise<string[]> {
  const existing = await Promise.all(
    README_CANDIDATES.map(async (candidate) => ((await pathExists(candidate)) ? candidate : null))
  );
  return existing.filter((file): file is string => !!file);
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
    const errors: string[] = [];
    const tasksPath = path.join(specDir, "TASKS.md");
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
    const errors: string[] = [];
    const tasksPath = path.join(specDir, "TASKS.md");
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
      }
    } catch {
      errors.push("TASKS.md not found at " + tasksPath);
    }
    return { valid: errors.length === 0, errors };
  },

  implement: async (_specDir) => {
    const errors: string[] = [];
    try {
      const report = await generateCoverageReport();
      if (report.coveragePercent < 80) {
        errors.push(`Spec coverage is ${report.coveragePercent}% (minimum 80% required)`);
      }

      const trackerState = await getTrackerState();
      const completedTaskRefs = Object.values(trackerState.taskRefs).filter((taskRef) => !!taskRef.completedAt);
      if (Object.keys(trackerState.taskRefs).length > 0 && completedTaskRefs.length === 0) {
        errors.push("No tracker tasks are marked completed — implement phase requires completed key tasks before exit");
      }

      for (const taskRef of completedTaskRefs) {
        const taskNumberMatch = /(?:^|-)task-(\d+)(?:-|$)/i.exec(taskRef.taskId)
          ?? /(?:^|-)?(\d+)(?:-|$)/.exec(taskRef.taskId);
        const evidencePrefix = taskNumberMatch ? `task-${taskNumberMatch[1]}-` : taskRef.taskId;
        const hasEvidenceDir = await pathExists(EVIDENCE_DIR);
        if (!hasEvidenceDir) {
          errors.push(`Evidence directory ${EVIDENCE_DIR} not found for completed task ${taskRef.taskId}`);
          break;
        }

        const evidenceFiles = await fs.readdir(EVIDENCE_DIR);
        const matchingEvidence = evidenceFiles.filter((file) => file.includes(evidencePrefix));
        if (matchingEvidence.length === 0) {
          errors.push(`Completed task ${taskRef.taskId} has no evidence file in ${EVIDENCE_DIR}`);
        }
      }
    } catch {
      errors.push("Failed to generate coverage report");
    }
    return { valid: errors.length === 0, errors };
  },

  complete: async (_specDir) => {
    const errors: string[] = [];
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
        const finalReviewEvidence = evidenceFiles.find((file) => /final-review|review-summary/i.test(file));
        if (!finalReviewEvidence) {
          errors.push("Final review evidence file is missing from .sisyphus/evidence/");
        }
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
export async function reset(startPhase: WorkflowPhase = "constitution"): Promise<SpecWorkflowState> {
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
      phase: phase ?? currentState?.phase ?? "constitution",
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
