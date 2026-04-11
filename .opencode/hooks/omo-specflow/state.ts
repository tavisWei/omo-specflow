import * as fs from "fs/promises";
import * as path from "path";

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
 * Mark the current phase as completed.
 * Updates the state to indicate the current phase is done.
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
