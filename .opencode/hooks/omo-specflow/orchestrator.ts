/**
 * SpecOrchestrator - Execution Runtime Core
 *
 * Orchestrates task execution using the dispatcher for planning
 * and an injected adapter interface for host execution.
 *
 * Key responsibilities:
 * - Load/parse TASKS.md via SpecTaskDispatcher
 * - Build and execute groups sequentially
 * - Execute tasks within groups via adapter (parallel or sequential)
 * - Persist execution state for resume/recovery
 * - Record structured results for tracker/review integration
 */

import * as fs from "fs/promises";
import * as path from "path";
import {
  SpecTaskDispatcher,
  type ParsedTask,
  type ParallelTaskGroup,
  type TaskCategory,
  type DispatchResult,
} from "./task-dispatcher.js";
import {
  recordTaskSpecRefs,
  completeTask,
  updateTaskExecutionStatus,
  type TaskSpecRef,
  type EvidenceRecord,
  type TaskTraceabilityOptions,
} from "./spec-tracker.js";
import {
  preExecutionVerify,
  postCompletionVerify,
  type PreExecutionResult,
  type PostCompletionResult,
} from "./spec-review.js";
import { artifactPreflightCheck } from "./artifact-coverage.js";

// ============================================================================
// Adapter Interface - Host Integration Contract
// ============================================================================

/**
 * Result of a single task execution.
 * The adapter returns this after attempting to execute a task.
 */
export interface TaskExecutionResult {
  /** Task ID that was executed */
  taskId: string;
  /** Whether execution succeeded */
  success: boolean;
  /** Output/error message */
  message: string;
  /** Files that were created or modified */
  filesChanged: string[];
  /** Evidence artifacts produced */
  evidence: string[];
  /** Timestamp when execution started */
  startedAt: number;
  /** Timestamp when execution completed */
  completedAt: number;
  /** Optional error details if failed */
  error?: {
    code: string;
    details?: string;
  };
}

/**
 * Options for executing a single task.
 */
export interface TaskExecutionOptions {
  /** Task category for routing */
  category: TaskCategory;
  /** Skills to load */
  skills: string[];
  /** Whether to run in background */
  runInBackground: boolean;
  /** Full prompt for execution */
  prompt: string;
  /** Task metadata */
  task: ParsedTask;
}

/**
 * Options for executing a group of tasks.
 */
export interface GroupExecutionOptions {
  /** Group ID */
  groupId: string;
  /** Tasks in this group */
  tasks: ParsedTask[];
  /** Whether tasks can run in parallel */
  parallelizable: boolean;
  /** Whether this is a background group */
  isBackground: boolean;
}

/**
 * Adapter interface for host execution.
 * The runtime host must implement this to integrate with the orchestrator.
 *
 * This interface is intentionally minimal - it does NOT assume any specific
 * OMO SDK methods. The host decides how to actually execute tasks.
 */
export interface TaskExecutionAdapter {
  /**
   * Execute a single task.
   * The host can use any mechanism (task(), shell, LLM, etc.)
   */
  executeTask(options: TaskExecutionOptions): Promise<TaskExecutionResult>;

  /**
   * Execute multiple tasks in parallel.
   * Default implementation calls executeTask for each task concurrently.
   */
  executeParallel?(
    tasks: Array<{ options: TaskExecutionOptions; task: ParsedTask }>
  ): Promise<TaskExecutionResult[]>;

  /**
   * Optional: Check if the host is ready to execute.
   * Called before starting orchestration.
   */
  isReady?(): Promise<boolean>;

  /**
   * Optional: Called when orchestration completes or fails.
   */
  onOrchestrationComplete?(summary: OrchestrationSummary): Promise<void>;
}

// ============================================================================
// Execution State Persistence
// ============================================================================

/**
 * Status of a single task in the execution state.
 */
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "skipped";

/**
 * State of a single task execution.
 */
export interface TaskState {
  /** Task ID */
  taskId: string;
  /** Current status */
  status: TaskStatus;
  /** Group ID this task belongs to */
  groupId: string;
  /** Execution result if completed */
  result?: TaskExecutionResult;
  /** Number of retry attempts */
  retryCount: number;
  /** Last error message if failed */
  lastError?: string;
  /** Timestamp when state was last updated */
  updatedAt: number;
}

/**
 * Status of a group execution.
 */
export type GroupStatus = "pending" | "running" | "completed" | "failed" | "partial";

/**
 * State of a group execution.
 */
export interface GroupState {
  /** Group ID */
  groupId: string;
  /** Current status */
  status: GroupStatus;
  /** Task IDs in this group */
  taskIds: string[];
  /** Completed task IDs */
  completedTaskIds: string[];
  /** Failed task IDs */
  failedTaskIds: string[];
  /** Timestamp when group started */
  startedAt?: number;
  /** Timestamp when group completed */
  completedAt?: number;
}

/**
 * Overall orchestration state.
 * Persisted to .spec/.orchestration-state.json for recovery.
 */
export interface OrchestrationState {
  /** Unique orchestration run ID */
  runId: string;
  /** Source TASKS.md path */
  tasksPath: string;
  /** When orchestration started */
  startedAt: number;
  /** When orchestration completed (if finished) */
  completedAt?: number;
  /** Overall status */
  status: "running" | "completed" | "failed" | "paused";
  /** All groups in execution order */
  groups: GroupState[];
  /** Task states by ID */
  tasks: Record<string, TaskState>;
  /** Total task count */
  totalTasks: number;
  /** Completed task count */
  completedTasks: number;
  /** Failed task count */
  failedTasks: number;
  /** Current group index being executed */
  currentGroupIndex: number;
  /** Last checkpoint timestamp */
  lastCheckpoint: number;
  /** Error that caused failure (if any) */
  fatalError?: string;
}

/**
 * Summary of orchestration run.
 */
export interface OrchestrationSummary {
  /** Run ID */
  runId: string;
  /** Whether orchestration completed successfully */
  success: boolean;
  /** Total tasks */
  totalTasks: number;
  /** Completed tasks */
  completedTasks: number;
  /** Failed tasks */
  failedTasks: number;
  /** Skipped tasks */
  skippedTasks: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Groups executed */
  groupsExecuted: number;
  /** Errors encountered */
  errors: Array<{ taskId: string; error: string }>;
  /** Files changed across all tasks */
  filesChanged: string[];
  /** Evidence produced */
  evidence: string[];
}

// ============================================================================
// Orchestration Options
// ============================================================================

/**
 * Options for starting orchestration.
 */
export interface OrchestrationOptions {
  /** Path to TASKS.md (default: .spec/TASKS.md) */
  tasksPath?: string;
  /** Maximum retry attempts per task (default: 1) */
  maxRetries?: number;
  /** Continue on task failure (default: false) */
  continueOnFailure?: boolean;
  /** Skip pre-execution verification (default: false) */
  skipPreVerification?: boolean;
  /** Skip post-execution verification (default: false) */
  skipPostVerification?: boolean;
  /** Resume from previous state if available (default: true) */
  resume?: boolean;
  /** Record results to spec-tracker (default: true) */
  recordToTracker?: boolean;
  /** Callback for progress updates */
  onProgress?: (event: ProgressEvent) => void;
}

/**
 * Progress event for orchestration.
 */
export interface ProgressEvent {
  type: "group_started" | "group_completed" | "task_started" | "task_completed" | "checkpoint";
  groupId?: string;
  taskId?: string;
  status?: TaskStatus | GroupStatus;
  message?: string;
  state: OrchestrationState;
}

// ============================================================================
// Constants
// ============================================================================

const ORCHESTRATION_STATE_PATH = ".spec/.orchestration-state.json";
const ORCHESTRATION_LOCK_PATH = ".spec/.orchestration-state.lock";
const EVIDENCE_DIR = ".sisyphus/evidence";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique run ID.
 */
function generateRunId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `orch-${timestamp}-${random}`;
}

/**
 * Acquire file lock for state access.
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

  throw new Error("Failed to acquire lock for orchestration state");
}

/**
 * Ensure directory exists.
 */
async function ensureDir(dirPath: string): Promise<void> {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "EEXIST") {
      throw err;
    }
  }
}

async function assertUpstreamArtifactsReady(tasksPath: string): Promise<void> {
  const specDir = path.dirname(tasksPath);
  const readiness = await artifactPreflightCheck("web", specDir);
  if (!readiness.ready) {
    const failedChecks = readiness.checks
      .filter((check) => !check.passed)
      .map((check) => `${check.name}: ${check.message}`);
    throw new Error(`Upstream artifact preflight failed:\n- ${failedChecks.join("\n- ")}`);
  }
}

// ============================================================================
// SpecOrchestrator Class
// ============================================================================

/**
 * Main orchestrator class for task execution.
 */
export class SpecOrchestrator {
  private dispatcher: SpecTaskDispatcher;
  private adapter: TaskExecutionAdapter;
  private state: OrchestrationState | null = null;
  private options: Required<Omit<OrchestrationOptions, "onProgress">> & { onProgress?: (event: ProgressEvent) => void };

  /**
   * Create a new orchestrator with the given adapter.
   */
  constructor(adapter: TaskExecutionAdapter, options: OrchestrationOptions = {}) {
    this.dispatcher = new SpecTaskDispatcher();
    this.adapter = adapter;
    this.options = {
      tasksPath: options.tasksPath ?? ".spec/TASKS.md",
      maxRetries: options.maxRetries ?? 1,
      continueOnFailure: options.continueOnFailure ?? false,
      skipPreVerification: options.skipPreVerification ?? false,
      skipPostVerification: options.skipPostVerification ?? false,
      resume: options.resume ?? true,
      recordToTracker: options.recordToTracker ?? true,
      onProgress: options.onProgress,
    };
  }

  /**
   * Get the current orchestration state.
   */
  getState(): OrchestrationState | null {
    return this.state;
  }

  /**
   * Load persisted state for recovery.
   */
  async loadState(): Promise<OrchestrationState | null> {
    const release = await acquireLock(ORCHESTRATION_LOCK_PATH);
    try {
      const content = await fs.readFile(ORCHESTRATION_STATE_PATH, "utf-8");
      this.state = JSON.parse(content) as OrchestrationState;
      return this.state;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw err;
    } finally {
      await release();
    }
  }

  /**
   * Persist current state to disk.
   */
  async saveState(): Promise<void> {
    if (!this.state) return;

    const release = await acquireLock(ORCHESTRATION_LOCK_PATH);
    try {
      await ensureDir(path.dirname(ORCHESTRATION_STATE_PATH));
      const tempPath = `${ORCHESTRATION_STATE_PATH}.tmp.${process.pid}.${Date.now()}`;
      await fs.writeFile(tempPath, JSON.stringify(this.state, null, 2), "utf-8");
      await fs.rename(tempPath, ORCHESTRATION_STATE_PATH);
    } finally {
      await release();
    }
  }

  /**
   * Clear persisted state.
   */
  async clearState(): Promise<void> {
    const release = await acquireLock(ORCHESTRATION_LOCK_PATH);
    try {
      await fs.unlink(ORCHESTRATION_STATE_PATH).catch(() => {});
      this.state = null;
    } finally {
      await release();
    }
  }

  /**
   * Initialize orchestration state from TASKS.md.
   */
  private async initializeState(): Promise<OrchestrationState> {
    const tasks = await this.dispatcher.parseTasks(this.options.tasksPath);
    const groups = this.dispatcher.buildExecutionPlan(tasks);

    const taskStates: Record<string, TaskState> = {};
    const groupStates: GroupState[] = [];

    for (const group of groups) {
      const groupState: GroupState = {
        groupId: group.groupId,
        status: "pending",
        taskIds: group.tasks.map((t) => t.id),
        completedTaskIds: [],
        failedTaskIds: [],
      };
      groupStates.push(groupState);

      for (const task of group.tasks) {
        taskStates[task.id] = {
          taskId: task.id,
          status: "pending",
          groupId: group.groupId,
          retryCount: 0,
          updatedAt: Date.now(),
        };
      }
    }

    this.state = {
      runId: generateRunId(),
      tasksPath: this.options.tasksPath,
      startedAt: Date.now(),
      status: "running",
      groups: groupStates,
      tasks: taskStates,
      totalTasks: tasks.length,
      completedTasks: 0,
      failedTasks: 0,
      currentGroupIndex: 0,
      lastCheckpoint: Date.now(),
    };

    if (this.options.recordToTracker) {
      for (const task of tasks) {
        await recordTaskSpecRefs(task.id, task.specRefs, {
          todoIds: task.todoRefs,
          filePaths: task.files,
          references: task.references,
          handoff: task.handoff,
          blockedBy: task.blockedBy,
          status: "pending",
        });
      }
    }

    await this.saveState();
    return this.state;
  }

  /**
   * Emit a progress event.
   */
  private emitProgress(event: Omit<ProgressEvent, "state">): void {
    if (this.options.onProgress && this.state) {
      this.options.onProgress({ ...event, state: this.state });
    }
  }

  /**
   * Execute a single task with pre/post verification.
   */
  private async executeTaskWithVerification(
    task: ParsedTask,
    group: ParallelTaskGroup
  ): Promise<TaskExecutionResult> {
    const taskState = this.state!.tasks[task.id];
    taskState.status = "running";
    taskState.updatedAt = Date.now();
    if (this.options.recordToTracker) {
      await updateTaskExecutionStatus(task.id, "running", {
        todoIds: task.todoRefs,
        filePaths: task.files,
        references: task.references,
        handoff: task.handoff,
        blockedBy: task.blockedBy,
      });
    }
    await this.saveState();

    this.emitProgress({
      type: "task_started",
      groupId: group.groupId,
      taskId: task.id,
    });

    // Pre-execution verification
    if (!this.options.skipPreVerification) {
      const preResult = await preExecutionVerify(task.description);
      if (preResult.verdict === "REJECT") {
        if (this.options.recordToTracker) {
          await updateTaskExecutionStatus(task.id, "failed", {
            todoIds: task.todoRefs,
            notes: preResult.warnings.join("; "),
            blockedBy: task.blockedBy,
          });
        }
        return {
          taskId: task.id,
          success: false,
          message: `Pre-execution verification rejected: ${preResult.warnings.join("; ")}`,
          filesChanged: [],
          evidence: [],
          startedAt: Date.now(),
          completedAt: Date.now(),
          error: { code: "PRE_VERIFICATION_FAILED", details: preResult.warnings.join("; ") },
        };
      }
    }

    // Execute via adapter
    const dispatchCalls = this.dispatcher.generateDispatchCalls({
      ...group,
      tasks: [task],
    });

    const dispatch = dispatchCalls[0];
    const result = await this.adapter.executeTask({
      category: dispatch.category,
      skills: dispatch.skills,
      runInBackground: dispatch.runInBackground,
      prompt: dispatch.prompt,
      task,
    });

    // Post-execution verification
    if (!this.options.skipPostVerification && result.success) {
      const postResult = await postCompletionVerify(
        task.id,
        task.description,
        result.filesChanged
      );

      if (this.options.recordToTracker) {
        const evidenceRecords: Array<string | Partial<EvidenceRecord>> = result.evidence.map((e) => ({
          path: e,
          recordedAt: Date.now(),
          outcome: "pass" as const,
        }));

        await recordTaskSpecRefs(task.id, task.specRefs, {
          evidence: evidenceRecords,
          filePaths: result.filesChanged,
          todoIds: task.todoRefs,
          status: "done",
        });

        await completeTask(task.id, result.message, {
          evidence: evidenceRecords,
          filePaths: result.filesChanged,
          todoIds: task.todoRefs,
        });
      }
    } else if (this.options.recordToTracker && !result.success) {
      await updateTaskExecutionStatus(task.id, "failed", {
        todoIds: task.todoRefs,
        filePaths: result.filesChanged,
        notes: result.message,
        blockedBy: task.blockedBy,
      });
    }

    // Update task state
    taskState.status = result.success ? "completed" : "failed";
    taskState.result = result;
    taskState.updatedAt = Date.now();
    if (!result.success) {
      taskState.lastError = result.message;
    }

    this.emitProgress({
      type: "task_completed",
      groupId: group.groupId,
      taskId: task.id,
      status: taskState.status,
      message: result.message,
    });

    return result;
  }

  /**
   * Execute a group of tasks.
   */
  private async executeGroup(group: ParallelTaskGroup): Promise<GroupState> {
    const groupState = this.state!.groups.find((g) => g.groupId === group.groupId)!;
    groupState.status = "running";
    groupState.startedAt = Date.now();

    this.emitProgress({ type: "group_started", groupId: group.groupId });

    // Check if adapter supports parallel execution
    const canParallelize = group.isBackground && this.adapter.executeParallel;

    if (canParallelize && group.tasks.length > 1) {
      // Parallel execution
      const taskOptions = group.tasks.map((task) => {
        const dispatchCalls = this.dispatcher.generateDispatchCalls({
          ...group,
          tasks: [task],
        });
        const dispatch = dispatchCalls[0];
        return {
          options: {
            category: dispatch.category,
            skills: dispatch.skills,
            runInBackground: dispatch.runInBackground,
            prompt: dispatch.prompt,
            task,
          } as TaskExecutionOptions,
          task,
        };
      });

      const results = await this.adapter.executeParallel!(taskOptions);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const task = group.tasks[i];
        const taskState = this.state!.tasks[task.id];

        taskState.status = result.success ? "completed" : "failed";
        taskState.result = result;
        taskState.updatedAt = Date.now();

        if (result.success) {
          groupState.completedTaskIds.push(task.id);
          this.state!.completedTasks++;
        } else {
          groupState.failedTaskIds.push(task.id);
          this.state!.failedTasks++;
          taskState.lastError = result.message;
        }
      }
    } else {
      // Sequential execution
      for (const task of group.tasks) {
        const taskState = this.state!.tasks[task.id];

        // Skip already completed tasks (for resume)
        if (taskState.status === "completed") {
          groupState.completedTaskIds.push(task.id);
          continue;
        }

        // Skip failed tasks if max retries reached
        if (taskState.status === "failed" && taskState.retryCount >= this.options.maxRetries) {
          if (!this.options.continueOnFailure) {
            groupState.status = "failed";
            groupState.completedAt = Date.now();
            return groupState;
          }
          continue;
        }

        // Retry logic
        if (taskState.status === "failed") {
          taskState.retryCount++;
        }

        const result = await this.executeTaskWithVerification(task, group);

        if (result.success) {
          groupState.completedTaskIds.push(task.id);
          this.state!.completedTasks++;
        } else {
          groupState.failedTaskIds.push(task.id);
          this.state!.failedTasks++;

          if (!this.options.continueOnFailure && taskState.retryCount >= this.options.maxRetries) {
            groupState.status = "failed";
            groupState.completedAt = Date.now();
            await this.saveState();
            return groupState;
          }
        }

        await this.saveState();
      }
    }

    // Determine group status
    if (groupState.failedTaskIds.length === 0) {
      groupState.status = "completed";
    } else if (groupState.completedTaskIds.length > 0) {
      groupState.status = "partial";
    } else {
      groupState.status = "failed";
    }

    groupState.completedAt = Date.now();

    this.emitProgress({ type: "group_completed", groupId: group.groupId, status: groupState.status });

    return groupState;
  }

  /**
   * Run the orchestration.
   */
  async run(): Promise<OrchestrationSummary> {
    // Check if adapter is ready
    if (this.adapter.isReady) {
      const ready = await this.adapter.isReady();
      if (!ready) {
        throw new Error("Task execution adapter is not ready");
      }
    }

    await assertUpstreamArtifactsReady(this.options.tasksPath);

    // Load or initialize state
    if (this.options.resume) {
      const existingState = await this.loadState();
      if (existingState && existingState.status === "running") {
        this.state = existingState;
      } else {
        await this.initializeState();
      }
    } else {
      await this.initializeState();
    }

    // Parse tasks and groups
    const tasks = await this.dispatcher.parseTasks(this.options.tasksPath);
    const groups = this.dispatcher.buildExecutionPlan(tasks);

    // Execute groups sequentially
    for (let i = this.state!.currentGroupIndex; i < groups.length; i++) {
      this.state!.currentGroupIndex = i;
      const group = groups[i];

      // Find group state
      const groupState = this.state!.groups.find((g) => g.groupId === group.groupId);
      if (!groupState || groupState.status === "completed") {
        continue;
      }

      await this.executeGroup(group);

      // Check if we should stop
      if (groupState.status === "failed" && !this.options.continueOnFailure) {
        this.state!.status = "failed";
        this.state!.completedAt = Date.now();
        await this.saveState();
        break;
      }

      // Checkpoint
      this.state!.lastCheckpoint = Date.now();
      this.emitProgress({ type: "checkpoint" });
      await this.saveState();
    }

    // Finalize
    if (this.state!.status === "running") {
      this.state!.status = "completed";
    }
    this.state!.completedAt = Date.now();
    await this.saveState();

    // Build summary
    const summary = this.buildSummary();

    // Notify adapter
    if (this.adapter.onOrchestrationComplete) {
      await this.adapter.onOrchestrationComplete(summary);
    }

    return summary;
  }

  /**
   * Pause the orchestration.
   */
  async pause(): Promise<void> {
    if (this.state && this.state.status === "running") {
      this.state.status = "paused";
      await this.saveState();
    }
  }

  /**
   * Resume a paused orchestration.
   */
  async resume(): Promise<OrchestrationSummary> {
    if (!this.state || this.state.status !== "paused") {
      throw new Error("No paused orchestration to resume");
    }

    this.state.status = "running";
    await this.saveState();

    await assertUpstreamArtifactsReady(this.options.tasksPath);

    return this.run();
  }

  /**
   * Build summary from current state.
   */
  private buildSummary(): OrchestrationSummary {
    if (!this.state) {
      throw new Error("No orchestration state available");
    }

    const errors: Array<{ taskId: string; error: string }> = [];
    const filesChanged: string[] = [];
    const evidence: string[] = [];

    for (const taskState of Object.values(this.state.tasks)) {
      if (taskState.status === "failed" && taskState.lastError) {
        errors.push({ taskId: taskState.taskId, error: taskState.lastError });
      }
      if (taskState.result) {
        filesChanged.push(...taskState.result.filesChanged);
        evidence.push(...taskState.result.evidence);
      }
    }

    const skippedTasks = Object.values(this.state.tasks).filter(
      (t) => t.status === "skipped"
    ).length;

    return {
      runId: this.state.runId,
      success: this.state.status === "completed",
      totalTasks: this.state.totalTasks,
      completedTasks: this.state.completedTasks,
      failedTasks: this.state.failedTasks,
      skippedTasks,
      durationMs: (this.state.completedAt ?? Date.now()) - this.state.startedAt,
      groupsExecuted: this.state.groups.filter(
        (g) => g.status === "completed" || g.status === "partial"
      ).length,
      errors,
      filesChanged: [...new Set(filesChanged)],
      evidence: [...new Set(evidence)],
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple adapter that logs tasks without executing.
 * Useful for dry-run and testing.
 */
export function createDryRunAdapter(): TaskExecutionAdapter {
  return {
    async executeTask(options: TaskExecutionOptions): Promise<TaskExecutionResult> {
      console.log(`[DRY-RUN] Task ${options.task.id}: ${options.task.title}`);
      console.log(`  Category: ${options.category}`);
      console.log(`  Skills: ${options.skills.join(", ") || "none"}`);
      console.log(`  Background: ${options.runInBackground}`);

      return {
        taskId: options.task.id,
        success: true,
        message: "Dry-run completed",
        filesChanged: options.task.files,
        evidence: options.task.evidence.paths,
        startedAt: Date.now(),
        completedAt: Date.now(),
      };
    },

    async isReady(): Promise<boolean> {
      return true;
    },
  };
}

/**
 * Get the orchestration state file path.
 */
export function getOrchestrationStatePath(): string {
  return ORCHESTRATION_STATE_PATH;
}

/**
 * Check if an orchestration state exists.
 */
export async function hasOrchestrationState(): Promise<boolean> {
  try {
    await fs.access(ORCHESTRATION_STATE_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load orchestration state without creating an orchestrator.
 */
export async function loadOrchestrationState(): Promise<OrchestrationState | null> {
  try {
    const content = await fs.readFile(ORCHESTRATION_STATE_PATH, "utf-8");
    return JSON.parse(content) as OrchestrationState;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Clear any existing orchestration state.
 */
export async function clearOrchestrationState(): Promise<void> {
  const release = await acquireLock(ORCHESTRATION_LOCK_PATH);
  try {
    await fs.unlink(ORCHESTRATION_STATE_PATH).catch(() => {});
  } finally {
    await release();
  }
}

// ============================================================================
// Re-exports for Convenience
// ============================================================================

export type {
  ParsedTask,
  ParallelTaskGroup,
  TaskCategory,
  DispatchResult,
} from "./task-dispatcher.js";

export type {
  TaskSpecRef,
  EvidenceRecord,
  TaskTraceabilityOptions,
} from "./spec-tracker.js";

export type {
  PreExecutionResult,
  PostCompletionResult,
} from "./spec-review.js";
