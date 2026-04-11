import * as fs from "fs/promises";
import * as path from "path";

/**
 * Represents a single spec clause with its tracking information
 */
export interface SpecClause {
  /** Unique identifier for the clause (e.g., "US-001", "AC-001.1") */
  id: string;
  /** Section reference (e.g., "03-接口文档", "06-页面功能细节") */
  section: string;
  /** Title or brief description of the clause */
  title: string;
  /** Full text content of the clause */
  content: string;
  /** Completion status */
  completed: boolean;
  /** Timestamp when marked complete */
  completedAt?: number;
  /** Task ID that addressed this clause */
  addressedBy?: string;
  /** Notes or comments about implementation */
  notes?: string;
}

/**
 * Represents a task and its associated spec clauses
 */
export interface TaskSpecRef {
  /** Task identifier */
  taskId: string;
  /** List of spec clause IDs this task addresses */
  clauseIds: string[];
  /** When this reference was created */
  createdAt: number;
  /** When the task was completed */
  completedAt?: number;
}

/**
 * Represents a version of the spec for tracking changes
 */
export interface SpecVersion {
  /** Version identifier (e.g., "v1.0", "v2.1") */
  version: string;
  /** Timestamp when this version was created */
  createdAt: number;
  /** Hash or signature of the spec content for comparison */
  contentHash: string;
  /** List of clauses in this version */
  clauses: SpecClause[];
}

/**
 * Coverage report for spec compliance
 */
export interface SpecCoverageReport {
  /** Total number of clauses */
  totalClauses: number;
  /** Number of completed clauses */
  completedClauses: number;
  /** Coverage percentage (0-100) */
  coveragePercent: number;
  /** Coverage by section */
  coverageBySection: Record<string, {
    total: number;
    completed: number;
    percent: number;
  }>;
  /** List of incomplete clauses */
  incompleteClauses: SpecClause[];
  /** Version information */
  specVersion: string;
  /** Report generation timestamp */
  generatedAt: number;
}

/**
 * Main spec tracker state
 */
export interface SpecTrackerState {
  /** Current spec version */
  currentVersion: string;
  /** All tracked spec clauses */
  clauses: Record<string, SpecClause>;
  /** Task to clause mappings */
  taskRefs: Record<string, TaskSpecRef>;
  /** Spec version history */
  versionHistory: SpecVersion[];
  /** Last updated timestamp */
  updatedAt: number;
}

/**
 * Default empty state
 */
const DEFAULT_STATE: SpecTrackerState = {
  currentVersion: "v0.0",
  clauses: {},
  taskRefs: {},
  versionHistory: [],
  updatedAt: Date.now(),
};

/**
 * Path to the spec tracker state file
 */
const TRACKER_STATE_PATH = ".spec/.spec-tracker.json";

/**
 * Lock file path for concurrent access handling
 */
const LOCK_FILE_PATH = ".spec/.spec-tracker.lock";

/**
 * Error class for spec tracker errors
 */
export class SpecTrackerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpecTrackerError";
  }
}

/**
 * Simple hash function for content comparison
 * Note: For production, consider using a proper cryptographic hash
 */
function simpleHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Acquires a file lock using a simple lock file approach.
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

  throw new SpecTrackerError("Failed to acquire lock for spec tracker state file");
}

/**
 * Atomically read and parse the state file
 */
async function readStateFile(): Promise<SpecTrackerState | null> {
  try {
    const content = await fs.readFile(TRACKER_STATE_PATH, "utf-8");
    const state = JSON.parse(content) as SpecTrackerState;
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
async function writeStateFile(state: SpecTrackerState): Promise<void> {
  const dir = path.dirname(TRACKER_STATE_PATH);

  // Ensure .spec directory exists
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      throw err;
    }
  }

  // Write to temp file first
  const tempPath = `${TRACKER_STATE_PATH}.tmp.${process.pid}.${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(state, null, 2), "utf-8");

  // Atomic rename (on POSIX systems this is atomic if on same filesystem)
  await fs.rename(tempPath, TRACKER_STATE_PATH);
}

/**
 * Get the current spec tracker state.
 * Returns default state if no state file exists.
 */
export async function getState(): Promise<SpecTrackerState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const state = await readStateFile();
    return state ?? { ...DEFAULT_STATE };
  } finally {
    await release();
  }
}

/**
 * Set the spec tracker state directly.
 */
export async function setState(state: Partial<SpecTrackerState> & { currentVersion: string }): Promise<SpecTrackerState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    const newState: SpecTrackerState = {
      ...currentState ?? DEFAULT_STATE,
      ...state,
      updatedAt: Date.now(),
    };

    await writeStateFile(newState);
    return newState;
  } finally {
    await release();
  }
}

/**
 * Register a new spec clause to track.
 */
export async function registerClause(
  clauseId: string,
  section: string,
  title: string,
  content: string
): Promise<SpecClause> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    const state = currentState ?? { ...DEFAULT_STATE };

    const clause: SpecClause = {
      id: clauseId,
      section,
      title,
      content,
      completed: false,
    };

    state.clauses[clauseId] = clause;
    state.updatedAt = Date.now();

    await writeStateFile(state);
    return clause;
  } finally {
    await release();
  }
}

/**
 * Register multiple spec clauses at once.
 */
export async function registerClauses(clauses: Array<{
  clauseId: string;
  section: string;
  title: string;
  content: string;
}>): Promise<SpecClause[]> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    const state = currentState ?? { ...DEFAULT_STATE };

    const registered: SpecClause[] = [];

    for (const { clauseId, section, title, content } of clauses) {
      const clause: SpecClause = {
        id: clauseId,
        section,
        title,
        content,
        completed: false,
      };
      state.clauses[clauseId] = clause;
      registered.push(clause);
    }

    state.updatedAt = Date.now();
    await writeStateFile(state);
    return registered;
  } finally {
    await release();
  }
}

/**
 * Record that a task addresses specific spec clauses.
 */
export async function recordTaskSpecRefs(taskId: string, clauseIds: string[]): Promise<TaskSpecRef> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    const state = currentState ?? { ...DEFAULT_STATE };

    const taskRef: TaskSpecRef = {
      taskId,
      clauseIds,
      createdAt: Date.now(),
    };

    state.taskRefs[taskId] = taskRef;
    state.updatedAt = Date.now();

    await writeStateFile(state);
    return taskRef;
  } finally {
    await release();
  }
}

/**
 * Mark a task as completed and update addressed clauses.
 */
export async function completeTask(taskId: string, notes?: string): Promise<SpecTrackerState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    if (!currentState) {
      throw new SpecTrackerError("No spec tracker state found. Initialize tracking first.");
    }

    const taskRef = currentState.taskRefs[taskId];
    if (!taskRef) {
      throw new SpecTrackerError(`No spec reference found for task: ${taskId}`);
    }

    // Mark task as completed
    taskRef.completedAt = Date.now();

    // Mark all addressed clauses as completed
    for (const clauseId of taskRef.clauseIds) {
      if (currentState.clauses[clauseId]) {
        currentState.clauses[clauseId].completed = true;
        currentState.clauses[clauseId].completedAt = Date.now();
        currentState.clauses[clauseId].addressedBy = taskId;
        if (notes) {
          currentState.clauses[clauseId].notes = notes;
        }
      }
    }

    currentState.updatedAt = Date.now();
    await writeStateFile(currentState);
    return currentState;
  } finally {
    await release();
  }
}

/**
 * Mark a specific clause as completed.
 */
export async function markClauseComplete(
  clauseId: string,
  addressedBy?: string,
  notes?: string
): Promise<SpecClause> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    if (!currentState) {
      throw new SpecTrackerError("No spec tracker state found. Initialize tracking first.");
    }

    const clause = currentState.clauses[clauseId];
    if (!clause) {
      throw new SpecTrackerError(`Clause not found: ${clauseId}`);
    }

    clause.completed = true;
    clause.completedAt = Date.now();
    if (addressedBy) {
      clause.addressedBy = addressedBy;
    }
    if (notes) {
      clause.notes = notes;
    }

    currentState.updatedAt = Date.now();
    await writeStateFile(currentState);
    return clause;
  } finally {
    await release();
  }
}

/**
 * Get a specific clause by ID.
 */
export async function getClause(clauseId: string): Promise<SpecClause | null> {
  const state = await getState();
  return state.clauses[clauseId] ?? null;
}

/**
 * Get all clauses for a specific section.
 */
export async function getClausesBySection(section: string): Promise<SpecClause[]> {
  const state = await getState();
  return Object.values(state.clauses).filter((clause) => clause.section === section);
}

/**
 * Get all incomplete clauses.
 */
export async function getIncompleteClauses(): Promise<SpecClause[]> {
  const state = await getState();
  return Object.values(state.clauses).filter((clause) => !clause.completed);
}

/**
 * Generate a spec coverage report.
 */
export async function generateCoverageReport(): Promise<SpecCoverageReport> {
  const state = await getState();

  const clauses = Object.values(state.clauses);
  const totalClauses = clauses.length;
  const completedClauses = clauses.filter((c) => c.completed).length;
  const coveragePercent = totalClauses > 0 ? Math.round((completedClauses / totalClauses) * 100) : 0;

  // Calculate coverage by section
  const coverageBySection: Record<string, { total: number; completed: number; percent: number }> = {};
  const sectionMap = new Map<string, SpecClause[]>();

  for (const clause of clauses) {
    const existing = sectionMap.get(clause.section) || [];
    existing.push(clause);
    sectionMap.set(clause.section, existing);
  }

  for (const [section, sectionClauses] of sectionMap) {
    const total = sectionClauses.length;
    const completed = sectionClauses.filter((c) => c.completed).length;
    coverageBySection[section] = {
      total,
      completed,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  const incompleteClauses = clauses.filter((c) => !c.completed);

  return {
    totalClauses,
    completedClauses,
    coveragePercent,
    coverageBySection,
    incompleteClauses,
    specVersion: state.currentVersion,
    generatedAt: Date.now(),
  };
}

/**
 * Update the spec version and record the change.
 * Returns the diff of clauses that were added, removed, or modified.
 */
export async function updateSpecVersion(
  newVersion: string,
  newClauses: Array<{
    clauseId: string;
    section: string;
    title: string;
    content: string;
  }>
): Promise<{
  added: SpecClause[];
  removed: string[];
  modified: Array<{ before: SpecClause; after: SpecClause }>;
  versionHistory: SpecVersion[];
}> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    const state = currentState ?? { ...DEFAULT_STATE };

    // Create content hash for the new spec
    const newContent = newClauses.map((c) => `${c.clauseId}:${c.content}`).join("|");
    const newContentHash = simpleHash(newContent);

    // Build new clause map
    const newClauseMap = new Map<string, SpecClause>();
    for (const c of newClauses) {
      newClauseMap.set(c.clauseId, {
        id: c.clauseId,
        section: c.section,
        title: c.title,
        content: c.content,
        completed: false, // Reset completion on spec update
      });
    }

    // Calculate diff
    const added: SpecClause[] = [];
    const removed: string[] = [];
    const modified: Array<{ before: SpecClause; after: SpecClause }> = [];

    // Find added and modified clauses
    for (const [clauseId, newClause] of newClauseMap) {
      const existing = state.clauses[clauseId];
      if (!existing) {
        added.push(newClause);
      } else if (existing.content !== newClause.content) {
        // Preserve completion status if content didn't change meaningfully
        modified.push({
          before: existing,
          after: { ...newClause, completed: existing.completed, addressedBy: existing.addressedBy },
        });
      } else {
        // No change, preserve existing clause data
        newClauseMap.set(clauseId, { ...existing });
      }
    }

    // Find removed clauses
    for (const clauseId of Object.keys(state.clauses)) {
      if (!newClauseMap.has(clauseId)) {
        removed.push(clauseId);
      }
    }

    // Save the current version to history before updating
    const currentVersionEntry: SpecVersion = {
      version: state.currentVersion,
      createdAt: state.updatedAt,
      contentHash: simpleHash(Object.values(state.clauses).map((c) => `${c.id}:${c.content}`).join("|")),
      clauses: Object.values(state.clauses),
    };
    state.versionHistory.push(currentVersionEntry);

    // Keep only last 10 versions
    if (state.versionHistory.length > 10) {
      state.versionHistory = state.versionHistory.slice(-10);
    }

    // Update state with new version and clauses
    state.currentVersion = newVersion;
    state.clauses = Object.fromEntries(newClauseMap);
    state.updatedAt = Date.now();

    await writeStateFile(state);

    return {
      added,
      removed,
      modified,
      versionHistory: state.versionHistory,
    };
  } finally {
    await release();
  }
}

/**
 * Compare two spec versions and return the differences.
 */
export async function compareVersions(version1: string, version2: string): Promise<{
  version1Clauses: SpecClause[];
  version2Clauses: SpecClause[];
  added: string[];
  removed: string[];
  modified: Array<{ clauseId: string; before: string; after: string }>;
} | null> {
  const state = await getState();

  const v1Entry = state.versionHistory.find((v) => v.version === version1);
  const v2Entry = state.versionHistory.find((v) => v.version === version2);

  if (!v1Entry || !v2Entry) {
    return null;
  }

  const v1ClauseMap = new Map(v1Entry.clauses.map((c) => [c.id, c.content]));
  const v2ClauseMap = new Map(v2Entry.clauses.map((c) => [c.id, c.content]));

  const added: string[] = [];
  const removed: string[] = [];
  const modified: Array<{ clauseId: string; before: string; after: string }> = [];

  for (const [clauseId, content] of v2ClauseMap) {
    if (!v1ClauseMap.has(clauseId)) {
      added.push(clauseId);
    } else if (v1ClauseMap.get(clauseId) !== content) {
      modified.push({
        clauseId,
        before: v1ClauseMap.get(clauseId) as string,
        after: content,
      });
    }
  }

  for (const clauseId of v1ClauseMap.keys()) {
    if (!v2ClauseMap.has(clauseId)) {
      removed.push(clauseId);
    }
  }

  return {
    version1Clauses: v1Entry.clauses,
    version2Clauses: v2Entry.clauses,
    added,
    removed,
    modified,
  };
}

/**
 * Reset the spec tracker state.
 */
export async function reset(): Promise<SpecTrackerState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const newState: SpecTrackerState = {
      ...DEFAULT_STATE,
      updatedAt: Date.now(),
    };

    await writeStateFile(newState);
    return newState;
  } finally {
    await release();
  }
}

/**
 * Get the tracker state file path for external reference.
 */
export function getTrackerStatePath(): string {
  return TRACKER_STATE_PATH;
}
