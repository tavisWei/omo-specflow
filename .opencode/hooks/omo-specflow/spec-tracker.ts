import * as fs from "fs/promises";
import * as path from "path";

export type TraceabilityStatus = "pending" | "done" | "blocked";

export type TaskExecutionTraceabilityStatus = TraceabilityStatus | "running" | "failed";

export type BugFixStatus = "discovered" | "fixed" | "verified";

export type EvidenceOutcome = "pass" | "fail" | "unknown";

export interface EvidenceRecord {
  path: string;
  recordedAt: number;
  outcome?: EvidenceOutcome;
  summary?: string;
}

export interface HandoffRecord {
  currentPhase?: string;
  completed: string[];
  pending: string[];
  blockedBy: string[];
  keyDocs: string[];
  nextRecommendedAction?: string;
  updatedAt: number;
}

export interface TodoTraceabilitySummary {
  todoId: string;
  taskIds: string[];
  clauseIds: string[];
  evidencePaths: string[];
  status: TaskExecutionTraceabilityStatus;
}

export interface BugFixRecord {
  bugId: string;
  taskIds: string[];
  todoIds: string[];
  description?: string;
  status: BugFixStatus;
  discoveredAt: number;
  fixedAt?: number;
  verifiedAt?: number;
  evidence: EvidenceRecord[];
  notes?: string;
}

export interface TraceabilityMatrixRow {
  clauseId: string;
  taskIds: string[];
  evidencePaths: string[];
  status: TraceabilityStatus;
  notes?: string;
}

export interface TaskTraceabilityOptions {
  evidence?: Array<string | Partial<EvidenceRecord>>;
  filePaths?: string[];
  references?: string[];
  todoIds?: string[];
  status?: TaskExecutionTraceabilityStatus;
  handoff?: Omit<HandoffRecord, "updatedAt">;
  notes?: string;
  blockedBy?: string[];
}

export interface ClauseTraceabilityOptions {
  evidence?: Array<string | Partial<EvidenceRecord>>;
  coveredByTasks?: string[];
  status?: TraceabilityStatus;
  blockedBy?: string[];
  notes?: string;
}

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
  status?: TraceabilityStatus;
  evidence?: EvidenceRecord[];
  coveredByTasks?: string[];
  blockedBy?: string[];
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
  status?: TaskExecutionTraceabilityStatus;
  evidence?: EvidenceRecord[];
  filePaths?: string[];
  references?: string[];
  todoIds?: string[];
  handoff?: HandoffRecord;
  notes?: string;
  blockedBy?: string[];
  needsResync?: boolean;
  resyncClauseIds?: string[];
  lastSpecVersion?: string;
}

/**
 * Downstream synchronization status after spec changes
 */
export interface SpecSyncState {
  specVersion: string;
  affectedClauseIds: string[];
  affectedTaskIds: string[];
  needsTodoResync: boolean;
  needsTaskResync: boolean;
  needsRegressionReplan: boolean;
  updatedAt: number;
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
  blockedClauses: SpecClause[];
  traceabilityMatrix: TraceabilityMatrixRow[];
  evidenceSummary: {
    tasksWithEvidence: number;
    tasksWithoutEvidence: string[];
    clausesWithEvidence: number;
    clausesWithoutEvidence: string[];
  };
  taskSummary: Record<string, {
    clauseIds: string[];
    evidencePaths: string[];
    todoIds: string[];
    status: TaskExecutionTraceabilityStatus;
    hasHandoff: boolean;
  }>;
  todoSummary: Record<string, {
    taskIds: string[];
    clauseIds: string[];
    evidencePaths: string[];
    status: TaskExecutionTraceabilityStatus;
  }>;
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
  bugFixes: Record<string, BugFixRecord>;
  /** Spec version history */
  versionHistory: SpecVersion[];
  /** Pending downstream synchronization requirements */
  syncState?: SpecSyncState;
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
  bugFixes: {},
  versionHistory: [],
  syncState: undefined,
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

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function toEvidenceRecord(entry: string | Partial<EvidenceRecord>): EvidenceRecord {
  if (typeof entry === "string") {
    return {
      path: entry,
      recordedAt: Date.now(),
    };
  }

  return {
    path: entry.path ?? "",
    recordedAt: entry.recordedAt ?? Date.now(),
    outcome: entry.outcome,
    summary: entry.summary,
  };
}

function mergeEvidence(
  existing: Array<string | Partial<EvidenceRecord>> = [],
  incoming: Array<string | Partial<EvidenceRecord>> = []
): EvidenceRecord[] {
  const merged = [...existing, ...incoming]
    .map(toEvidenceRecord)
    .filter((record) => record.path.length > 0);

  const byPath = new Map<string, EvidenceRecord>();
  for (const record of merged) {
    const previous = byPath.get(record.path);
    byPath.set(record.path, {
      ...previous,
      ...record,
      recordedAt: Math.max(previous?.recordedAt ?? 0, record.recordedAt),
    });
  }

  return [...byPath.values()];
}

function normalizeHandoffRecord(handoff?: Partial<HandoffRecord>): HandoffRecord | undefined {
  if (!handoff) {
    return undefined;
  }

  const hasContent = Boolean(
    handoff.currentPhase ||
    handoff.nextRecommendedAction ||
    handoff.completed?.length ||
    handoff.pending?.length ||
    handoff.blockedBy?.length ||
    handoff.keyDocs?.length
  );

  if (!hasContent) {
    return undefined;
  }

  return {
    currentPhase: handoff.currentPhase,
    completed: dedupe(handoff.completed ?? []),
    pending: dedupe(handoff.pending ?? []),
    blockedBy: dedupe(handoff.blockedBy ?? []),
    keyDocs: dedupe(handoff.keyDocs ?? []),
    nextRecommendedAction: handoff.nextRecommendedAction,
    updatedAt: handoff.updatedAt ?? Date.now(),
  };
}

function normalizeClause(clause: SpecClause): SpecClause {
  const evidence = mergeEvidence(clause.evidence ?? []);
  const coveredByTasks = dedupe([
    ...(clause.coveredByTasks ?? []),
    ...(clause.addressedBy ? [clause.addressedBy] : []),
  ]);
  const status = clause.status === "blocked"
    ? "blocked"
    : clause.completed
      ? "done"
      : "pending";

  return {
    ...clause,
    evidence,
    coveredByTasks,
    blockedBy: dedupe(clause.blockedBy ?? []),
    status,
  };
}

function normalizeTaskRef(taskRef: TaskSpecRef): TaskSpecRef {
  const handoff = normalizeHandoffRecord(taskRef.handoff);
  const status = taskRef.status === "blocked"
    ? "blocked"
    : taskRef.status === "running"
      ? "running"
      : taskRef.status === "failed"
        ? "failed"
        : taskRef.completedAt
          ? "done"
          : "pending";

  return {
    ...taskRef,
    clauseIds: dedupe(taskRef.clauseIds ?? []),
    evidence: mergeEvidence(taskRef.evidence ?? []),
    filePaths: dedupe(taskRef.filePaths ?? []),
    references: dedupe(taskRef.references ?? []),
    todoIds: dedupe(taskRef.todoIds ?? []),
    blockedBy: dedupe(taskRef.blockedBy ?? []),
    needsResync: taskRef.needsResync ?? false,
    resyncClauseIds: dedupe(taskRef.resyncClauseIds ?? []),
    lastSpecVersion: taskRef.lastSpecVersion,
    handoff,
    status,
  };
}

function normalizeSyncState(syncState?: SpecSyncState): SpecSyncState | undefined {
  if (!syncState) {
    return undefined;
  }

  return {
    specVersion: syncState.specVersion,
    affectedClauseIds: dedupe(syncState.affectedClauseIds ?? []),
    affectedTaskIds: dedupe(syncState.affectedTaskIds ?? []),
    needsTodoResync: syncState.needsTodoResync ?? false,
    needsTaskResync: syncState.needsTaskResync ?? false,
    needsRegressionReplan: syncState.needsRegressionReplan ?? false,
    updatedAt: syncState.updatedAt ?? Date.now(),
  };
}

function normalizeBugFixRecord(record: BugFixRecord): BugFixRecord {
  return {
    ...record,
    taskIds: dedupe(record.taskIds ?? []),
    todoIds: dedupe(record.todoIds ?? []),
    evidence: mergeEvidence(record.evidence ?? []),
    status: record.status,
    discoveredAt: record.discoveredAt ?? Date.now(),
  };
}

function normalizeState(state: SpecTrackerState): SpecTrackerState {
  return {
    currentVersion: state.currentVersion ?? DEFAULT_STATE.currentVersion,
    clauses: Object.fromEntries(
      Object.entries(state.clauses ?? {}).map(([clauseId, clause]) => [clauseId, normalizeClause(clause)])
    ),
    taskRefs: Object.fromEntries(
      Object.entries(state.taskRefs ?? {}).map(([taskId, taskRef]) => [taskId, normalizeTaskRef(taskRef)])
    ),
    bugFixes: Object.fromEntries(
      Object.entries(state.bugFixes ?? {}).map(([bugId, record]) => [bugId, normalizeBugFixRecord(record)])
    ),
    versionHistory: (state.versionHistory ?? []).map((version) => ({
      ...version,
      clauses: version.clauses.map(normalizeClause),
    })),
    syncState: normalizeSyncState(state.syncState),
    updatedAt: state.updatedAt ?? Date.now(),
  };
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
    return normalizeState(state);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

async function readSyncStateSnapshot(): Promise<SpecSyncState | undefined> {
  const state = await readStateFile();
  return state?.syncState;
}

async function readTasksNeedingResyncSnapshot(): Promise<TaskSpecRef[]> {
  const state = await readStateFile();
  if (!state) {
    return [];
  }
  return Object.values(state.taskRefs).filter((taskRef) => taskRef.needsResync);
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
    return state ?? normalizeState({ ...DEFAULT_STATE });
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
    const newState = normalizeState({
      ...currentState ?? DEFAULT_STATE,
      ...state,
      updatedAt: Date.now(),
    });

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
      status: "pending",
      evidence: [],
      coveredByTasks: [],
      blockedBy: [],
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
        status: "pending",
        evidence: [],
        coveredByTasks: [],
        blockedBy: [],
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
export async function recordTaskSpecRefs(
  taskId: string,
  clauseIds: string[],
  options: TaskTraceabilityOptions = {}
): Promise<TaskSpecRef> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    const state = currentState ?? { ...DEFAULT_STATE };

    const existingTaskRef = state.taskRefs[taskId];
    const taskRef = normalizeTaskRef({
      taskId,
      clauseIds: dedupe([...(existingTaskRef?.clauseIds ?? []), ...clauseIds]),
      createdAt: existingTaskRef?.createdAt ?? Date.now(),
      completedAt: existingTaskRef?.completedAt,
      status: options.status ?? existingTaskRef?.status,
      evidence: mergeEvidence(existingTaskRef?.evidence ?? [], options.evidence ?? []),
      filePaths: dedupe([...(existingTaskRef?.filePaths ?? []), ...(options.filePaths ?? [])]),
      references: dedupe([...(existingTaskRef?.references ?? []), ...(options.references ?? [])]),
      todoIds: dedupe([...(existingTaskRef?.todoIds ?? []), ...(options.todoIds ?? [])]),
      handoff: normalizeHandoffRecord(options.handoff ?? existingTaskRef?.handoff),
      notes: options.notes ?? existingTaskRef?.notes,
      blockedBy: dedupe([...(existingTaskRef?.blockedBy ?? []), ...(options.blockedBy ?? [])]),
      needsResync: existingTaskRef?.needsResync ?? false,
      resyncClauseIds: dedupe(existingTaskRef?.resyncClauseIds ?? []),
      lastSpecVersion: existingTaskRef?.lastSpecVersion ?? state.currentVersion,
    });

    state.taskRefs[taskId] = taskRef;

    for (const clauseId of taskRef.clauseIds) {
      const clause = state.clauses[clauseId];
      if (!clause) {
        continue;
      }

      state.clauses[clauseId] = normalizeClause({
        ...clause,
        coveredByTasks: dedupe([...(clause.coveredByTasks ?? []), taskId]),
      });
    }

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
export async function completeTask(
  taskId: string,
  notes?: string,
  options: TaskTraceabilityOptions = {}
): Promise<SpecTrackerState> {
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

    taskRef.completedAt = Date.now();
    taskRef.status = "done";
    taskRef.notes = notes ?? options.notes ?? taskRef.notes;
    taskRef.evidence = mergeEvidence(taskRef.evidence ?? [], options.evidence ?? []);
    taskRef.filePaths = dedupe([...(taskRef.filePaths ?? []), ...(options.filePaths ?? [])]);
    taskRef.references = dedupe([...(taskRef.references ?? []), ...(options.references ?? [])]);
    taskRef.todoIds = dedupe([...(taskRef.todoIds ?? []), ...(options.todoIds ?? [])]);
    taskRef.blockedBy = dedupe([...(taskRef.blockedBy ?? []), ...(options.blockedBy ?? [])]);
    taskRef.handoff = normalizeHandoffRecord(options.handoff ?? taskRef.handoff);

    for (const clauseId of taskRef.clauseIds) {
      if (currentState.clauses[clauseId]) {
        currentState.clauses[clauseId] = normalizeClause({
          ...currentState.clauses[clauseId],
          completed: true,
          completedAt: Date.now(),
          addressedBy: taskId,
          notes: notes ?? options.notes ?? currentState.clauses[clauseId].notes,
          status: "done",
          evidence: mergeEvidence(currentState.clauses[clauseId].evidence ?? [], taskRef.evidence ?? []),
          coveredByTasks: dedupe([...(currentState.clauses[clauseId].coveredByTasks ?? []), taskId]),
          blockedBy: dedupe(currentState.clauses[clauseId].blockedBy ?? []),
        });
      }
    }

    currentState.updatedAt = Date.now();
    await writeStateFile(currentState);
    return normalizeState(currentState);
  } finally {
    await release();
  }
}

export async function updateTaskExecutionStatus(
  taskId: string,
  status: TaskExecutionTraceabilityStatus,
  options: TaskTraceabilityOptions = {}
): Promise<TaskSpecRef> {
  const state = await getState();
  const taskRef = state.taskRefs[taskId];
  const clauseIds = taskRef?.clauseIds ?? [];

  return recordTaskSpecRefs(taskId, clauseIds, {
    ...options,
    status,
  });
}

export async function getPendingSyncState(): Promise<SpecSyncState | undefined> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    return await readSyncStateSnapshot();
  } finally {
    await release();
  }
}

export async function clearPendingSyncState(): Promise<SpecTrackerState> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    const state = currentState ?? normalizeState({ ...DEFAULT_STATE });
    state.syncState = undefined;
    state.taskRefs = Object.fromEntries(
      Object.entries(state.taskRefs).map(([taskId, taskRef]) => [taskId, normalizeTaskRef({
        ...taskRef,
        needsResync: false,
        resyncClauseIds: [],
      })])
    );
    state.updatedAt = Date.now();
    await writeStateFile(state);
    return state;
  } finally {
    await release();
  }
}

export async function getTasksNeedingResync(): Promise<TaskSpecRef[]> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    return await readTasksNeedingResyncSnapshot();
  } finally {
    await release();
  }
}

export async function recordBugFix(
  bugId: string,
  options: {
    taskIds?: string[];
    todoIds?: string[];
    description?: string;
    status: BugFixStatus;
    notes?: string;
    evidence?: Array<string | Partial<EvidenceRecord>>;
  }
): Promise<BugFixRecord> {
  const release = await acquireLock(LOCK_FILE_PATH);
  try {
    const currentState = await readStateFile();
    const state = currentState ?? { ...DEFAULT_STATE };
    const existing = state.bugFixes[bugId];
    const nextStatus = options.status;
    const timestamp = Date.now();
    const record = normalizeBugFixRecord({
      bugId,
      taskIds: dedupe([...(existing?.taskIds ?? []), ...(options.taskIds ?? [])]),
      todoIds: dedupe([...(existing?.todoIds ?? []), ...(options.todoIds ?? [])]),
      description: options.description ?? existing?.description,
      status: nextStatus,
      discoveredAt: existing?.discoveredAt ?? timestamp,
      fixedAt: nextStatus === "fixed" || nextStatus === "verified" ? (existing?.fixedAt ?? timestamp) : existing?.fixedAt,
      verifiedAt: nextStatus === "verified" ? timestamp : existing?.verifiedAt,
      evidence: mergeEvidence(existing?.evidence ?? [], options.evidence ?? []),
      notes: options.notes ?? existing?.notes,
    });
    state.bugFixes[bugId] = record;
    state.updatedAt = timestamp;
    await writeStateFile(state);
    return record;
  } finally {
    await release();
  }
}

export async function getBugFixSummary(): Promise<BugFixRecord[]> {
  const state = await getState();
  return Object.values(state.bugFixes)
    .map(normalizeBugFixRecord)
    .sort((a, b) => a.bugId.localeCompare(b.bugId, undefined, { numeric: true }));
}

/**
 * Mark a specific clause as completed.
 */
export async function markClauseComplete(
  clauseId: string,
  addressedBy?: string,
  notes?: string,
  options: ClauseTraceabilityOptions = {}
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

    const updatedClause = normalizeClause({
      ...clause,
      completed: true,
      completedAt: Date.now(),
      addressedBy: addressedBy ?? clause.addressedBy,
      notes: notes ?? options.notes ?? clause.notes,
      status: "done",
      evidence: mergeEvidence(clause.evidence ?? [], options.evidence ?? []),
      coveredByTasks: dedupe([
        ...(clause.coveredByTasks ?? []),
        ...(addressedBy ? [addressedBy] : []),
        ...(options.coveredByTasks ?? []),
      ]),
      blockedBy: dedupe([...(clause.blockedBy ?? []), ...(options.blockedBy ?? [])]),
    });

    currentState.clauses[clauseId] = updatedClause;

    if (addressedBy && currentState.taskRefs[addressedBy]) {
      currentState.taskRefs[addressedBy] = normalizeTaskRef({
        ...currentState.taskRefs[addressedBy],
        clauseIds: dedupe([...(currentState.taskRefs[addressedBy].clauseIds ?? []), clauseId]),
      });
    }

    currentState.updatedAt = Date.now();
    await writeStateFile(currentState);
    return updatedClause;
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

export async function recordTaskEvidence(
  taskId: string,
  evidence: Array<string | Partial<EvidenceRecord>>
): Promise<TaskSpecRef> {
  const state = await getState();
  const taskRef = state.taskRefs[taskId];
  if (!taskRef) {
    throw new SpecTrackerError(`No spec reference found for task: ${taskId}`);
  }

  return recordTaskSpecRefs(taskId, taskRef.clauseIds, { evidence });
}

export async function recordClauseEvidence(
  clauseId: string,
  evidence: Array<string | Partial<EvidenceRecord>>
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

    const updatedClause = normalizeClause({
      ...clause,
      evidence: mergeEvidence(clause.evidence ?? [], evidence),
    });

    currentState.clauses[clauseId] = updatedClause;
    currentState.updatedAt = Date.now();
    await writeStateFile(currentState);
    return updatedClause;
  } finally {
    await release();
  }
}

export async function updateTaskHandoff(
  taskId: string,
  handoff: Omit<HandoffRecord, "updatedAt">
): Promise<TaskSpecRef> {
  const state = await getState();
  const taskRef = state.taskRefs[taskId];
  if (!taskRef) {
    throw new SpecTrackerError(`No spec reference found for task: ${taskId}`);
  }

  return recordTaskSpecRefs(taskId, taskRef.clauseIds, { handoff });
}

export async function getTraceabilityMatrix(): Promise<TraceabilityMatrixRow[]> {
  const state = await getState();
  return Object.values(state.clauses).map((clause) => ({
    clauseId: clause.id,
    taskIds: dedupe([
      ...(clause.coveredByTasks ?? []),
      ...Object.values(state.taskRefs)
        .filter((taskRef) => taskRef.clauseIds.includes(clause.id))
        .map((taskRef) => taskRef.taskId),
    ]),
    evidencePaths: mergeEvidence(
      clause.evidence ?? [],
      Object.values(state.taskRefs)
        .filter((taskRef) => taskRef.clauseIds.includes(clause.id))
        .flatMap((taskRef) => taskRef.evidence ?? [])
    ).map((record) => record.path),
    status: clause.status ?? (clause.completed ? "done" : "pending"),
    notes: clause.notes,
  }));
}

export async function getTodoTraceabilitySummary(): Promise<TodoTraceabilitySummary[]> {
  const state = await getState();
  const todoMap = new Map<string, TodoTraceabilitySummary>();

  for (const taskRef of Object.values(state.taskRefs)) {
    const todoIds = dedupe(taskRef.todoIds ?? []);
    for (const todoId of todoIds) {
      const existing = todoMap.get(todoId) ?? {
        todoId,
        taskIds: [],
        clauseIds: [],
        evidencePaths: [],
        status: "pending" as TaskExecutionTraceabilityStatus,
      };

      const nextTaskIds = dedupe([...existing.taskIds, taskRef.taskId]);
      const nextClauseIds = dedupe([...existing.clauseIds, ...(taskRef.clauseIds ?? [])]);
      const nextEvidencePaths = dedupe([
        ...existing.evidencePaths,
        ...(taskRef.evidence ?? []).map((record) => record.path),
      ]);

      let status: TaskExecutionTraceabilityStatus = existing.status;
      if (taskRef.status === "blocked") {
        status = "blocked";
      } else if (taskRef.status === "failed") {
        status = status === "blocked" ? status : "failed";
      } else if (taskRef.status === "running") {
        status = status === "blocked" || status === "failed" ? status : "running";
      } else if (status !== "blocked" && status !== "failed" && taskRef.completedAt) {
        status = nextTaskIds.every((taskId) => state.taskRefs[taskId]?.completedAt) ? "done" : "pending";
      }

      todoMap.set(todoId, {
        todoId,
        taskIds: nextTaskIds,
        clauseIds: nextClauseIds,
        evidencePaths: nextEvidencePaths,
        status,
      });
    }
  }

  return [...todoMap.values()].sort((a, b) => a.todoId.localeCompare(b.todoId, undefined, { numeric: true }));
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
  const blockedClauses = clauses.filter((c) => c.status === "blocked");
  const traceabilityMatrix = await getTraceabilityMatrix();
  const todoSummaryEntries = await getTodoTraceabilitySummary();
  const taskRefs = Object.values(state.taskRefs);
  const taskSummary: SpecCoverageReport["taskSummary"] = Object.fromEntries(
    taskRefs.map((taskRef) => [
      taskRef.taskId,
      {
        clauseIds: taskRef.clauseIds,
        evidencePaths: (taskRef.evidence ?? []).map((record) => record.path),
        todoIds: taskRef.todoIds ?? [],
        status: taskRef.status ?? (taskRef.completedAt ? "done" : "pending"),
        hasHandoff: Boolean(taskRef.handoff),
      },
    ])
  );
  const evidenceSummary = {
    tasksWithEvidence: taskRefs.filter((taskRef) => (taskRef.evidence?.length ?? 0) > 0).length,
    tasksWithoutEvidence: taskRefs.filter((taskRef) => (taskRef.evidence?.length ?? 0) === 0).map((taskRef) => taskRef.taskId),
    clausesWithEvidence: clauses.filter((clause) => (clause.evidence?.length ?? 0) > 0).length,
    clausesWithoutEvidence: clauses.filter((clause) => (clause.evidence?.length ?? 0) === 0).map((clause) => clause.id),
  };
  const todoSummary = Object.fromEntries(
    todoSummaryEntries.map((todo) => [
      todo.todoId,
      {
        taskIds: todo.taskIds,
        clauseIds: todo.clauseIds,
        evidencePaths: todo.evidencePaths,
        status: todo.status,
      },
    ])
  );

  return {
    totalClauses,
    completedClauses,
    coveragePercent,
    coverageBySection,
    incompleteClauses,
    blockedClauses,
    traceabilityMatrix,
    evidenceSummary,
    taskSummary,
    todoSummary,
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

    const newContent = newClauses.map((c) => `${c.clauseId}:${c.content}`).join("|");
    const _newContentHash = simpleHash(newContent);

    const newClauseMap = new Map<string, SpecClause>();
    for (const c of newClauses) {
      newClauseMap.set(c.clauseId, {
        id: c.clauseId,
        section: c.section,
        title: c.title,
        content: c.content,
        completed: false,
        status: "pending",
        evidence: [],
        coveredByTasks: [],
        blockedBy: [],
      });
    }

    const added: SpecClause[] = [];
    const removed: string[] = [];
    const modified: Array<{ before: SpecClause; after: SpecClause }> = [];

    for (const [clauseId, newClause] of newClauseMap) {
      const existing = state.clauses[clauseId];
      if (!existing) {
        added.push(newClause);
      } else if (existing.content !== newClause.content) {
        const mergedClause = normalizeClause({
          ...newClause,
          completed: existing.completed,
          completedAt: existing.completedAt,
          addressedBy: existing.addressedBy,
          notes: existing.notes,
          status: existing.status,
          evidence: existing.evidence,
          coveredByTasks: existing.coveredByTasks,
          blockedBy: existing.blockedBy,
        });
        modified.push({
          before: existing,
          after: mergedClause,
        });
        newClauseMap.set(clauseId, mergedClause);
      } else {
        newClauseMap.set(clauseId, { ...existing });
      }
    }

    for (const clauseId of Object.keys(state.clauses)) {
      if (!newClauseMap.has(clauseId)) {
        removed.push(clauseId);
      }
    }

    const changedClauseIds = dedupe([
      ...added.map((clause) => clause.id),
      ...removed,
      ...modified.map(({ after }) => after.id),
    ]);
    const affectedTaskIds = dedupe(changedClauseIds.flatMap((clauseId) => {
      const currentClause = state.clauses[clauseId];
      const modifiedClause = modified.find(({ before, after }) => before.id === clauseId || after.id === clauseId);
      return dedupe([
        ...(currentClause?.coveredByTasks ?? []),
        ...(modifiedClause?.before.coveredByTasks ?? []),
        ...(modifiedClause?.after.coveredByTasks ?? []),
      ]);
    }));

    for (const taskId of affectedTaskIds) {
      const existingTaskRef = state.taskRefs[taskId];
      if (!existingTaskRef) {
        continue;
      }
      const impactedClauseIds = changedClauseIds.filter((clauseId) => existingTaskRef.clauseIds.includes(clauseId));
      state.taskRefs[taskId] = normalizeTaskRef({
        ...existingTaskRef,
        needsResync: impactedClauseIds.length > 0,
        resyncClauseIds: dedupe([...(existingTaskRef.resyncClauseIds ?? []), ...impactedClauseIds]),
        lastSpecVersion: newVersion,
      });
    }

    const currentVersionEntry: SpecVersion = {
      version: state.currentVersion,
      createdAt: state.updatedAt,
      contentHash: simpleHash(Object.values(state.clauses).map((c) => `${c.id}:${c.content}`).join("|")),
      clauses: Object.values(state.clauses),
    };
    state.versionHistory.push(currentVersionEntry);

    if (state.versionHistory.length > 10) {
      state.versionHistory = state.versionHistory.slice(-10);
    }

    const syncUpdatedAt = Date.now();
    state.currentVersion = newVersion;
    state.clauses = Object.fromEntries(newClauseMap);
    state.syncState = changedClauseIds.length > 0
      ? {
        specVersion: newVersion,
        affectedClauseIds: changedClauseIds,
        affectedTaskIds,
        needsTodoResync: true,
        needsTaskResync: true,
        needsRegressionReplan: true,
        updatedAt: syncUpdatedAt,
      }
      : undefined;
    state.updatedAt = syncUpdatedAt;

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
