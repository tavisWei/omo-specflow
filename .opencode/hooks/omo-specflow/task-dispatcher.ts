/**
 * SpecTaskDispatcher - Atlas Parallel Task Dispatcher
 * 
 * Reads TASKS.md, analyzes dependencies, generates parallel task groups,
 * and dispatches tasks using OMO's task() function.
 * 
 * Based on DEFAULT_ATLAS_PARALLEL_EXECUTION patterns.
 */

import * as fs from "fs/promises";
import * as path from "path";

/**
 * Task priority categories for OMO routing
 */
export type TaskCategory = 
  | "quick" 
  | "deep" 
  | "writing" 
  | "visual-engineering"
  | "unspecified-high"
  | "unspecified-low"
  | "ultrabrain";

/**
 * Represents a single task parsed from TASKS.md
 */
export interface ParsedTask {
  /** Unique task identifier */
  id: string;
  /** Task title/name */
  title: string;
  /** Full task description */
  description: string;
  /** Recommended category for dispatch */
  category: TaskCategory;
  /** Skills to load for this task */
  skills: string[];
  /** Task IDs this task blocks (must complete before dependents) */
  blocks: string[];
  /** Task IDs this task depends on (must complete before this) */
  blockedBy: string[];
  /** Wave number for grouping */
  wave?: number;
  /** Whether this task can run in parallel with others */
  parallelizable: boolean;
  /** Parallel group name if applicable */
  parallelGroup?: string;
  /** Acceptance criteria for verification */
  acceptanceCriteria: string[];
  /** References to external docs */
  references: string[];
}

/**
 * A group of tasks that can execute in parallel
 */
export interface ParallelTaskGroup {
  /** Group identifier */
  groupId: string;
  /** Tasks in this group (all can run in parallel) */
  tasks: ParsedTask[];
  /** Whether this group uses background execution */
  isBackground: boolean;
}

/**
 * Result of task dispatch
 */
export interface DispatchResult {
  /** Total tasks dispatched */
  total: number;
  /** Groups dispatched */
  groups: ParallelTaskGroup[];
  /** Task IDs that were dispatched */
  taskIds: string[];
  /** Errors if any */
  errors: Array<{ taskId: string; error: string }>;
}

/**
 * Atlas parallel execution rules from DEFAULT_ATLAS_PARALLEL_EXECUTION:
 * - Exploration tasks (explore/librarian): ALWAYS background
 * - Task execution: NEVER background
 * - Parallel task groups: Invoke multiple in ONE message
 */
export class SpecTaskDispatcher {
  private tasks: Map<string, ParsedTask> = new Map();
  private taskOrder: string[] = [];

  /**
   * Default categories for task routing
   */
  static readonly DEFAULT_CATEGORY: TaskCategory = "unspecified-high";
  
  /**
   * Default skills
   */
  static readonly DEFAULT_SKILLS: string[] = [];

  /**
   * Parse TASKS.md content and extract tasks
   */
  async parseTasks(tasksPath: string = ".spec/TASKS.md"): Promise<ParsedTask[]> {
    const content = await fs.readFile(tasksPath, "utf-8");
    return this.parseTasksContent(content);
  }

  /**
   * Parse TASKS.md content directly
   */
  parseTasksContent(content: string): ParsedTask[] {
    const tasks: ParsedTask[] = [];
    const taskBlocks = this.splitIntoTaskBlocks(content);
    
    for (const block of taskBlocks) {
      const task = this.parseTaskBlock(block);
      if (task) {
        tasks.push(task);
        this.tasks.set(task.id, task);
        this.taskOrder.push(task.id);
      }
    }
    
    return tasks;
  }

  /**
   * Split content into individual task blocks
   * Tasks are delimited by headers like "## Task N" or "- [ ] N." or wave headers
   */
  private splitIntoTaskBlocks(content: string): string[] {
    // Match task headers: ## Task N, - [ ] N., ## Wave N, etc.
    const taskHeaderPattern = /(?:^|\n)(?:#{1,3}\s+(?:Task|Task\s+#)\s*(\d+[A-Z]?|[A-Z]\d?|F\d+)|(?:^|\n)(?:-\s*\[\s*[xX]\s*\]|-)\s+(\d+[A-Z]?|[A-Z]\d?|F\d+)\.\s*)/gm;
    
    const blocks: string[] = [];
    let lastIndex = 0;
    let match;
    
    // Find all task headers
    const headers: Array<{ index: number; id: string }> = [];
    while ((match = taskHeaderPattern.exec(content)) !== null) {
      const id = match[1] || match[2];
      if (id) {
        headers.push({ index: match.index, id });
      }
    }
    
    // Extract blocks between headers
    for (let i = 0; i < headers.length; i++) {
      const start = headers[i].index;
      const end = i < headers.length - 1 ? headers[i + 1].index : content.length;
      const block = content.slice(start, end).trim();
      if (block) {
        blocks.push(block);
      }
    }
    
    return blocks;
  }

  /**
   * Parse a single task block into a ParsedTask
   */
  private parseTaskBlock(block: string): ParsedTask | null {
    // Extract task ID from various formats
    const idMatch = block.match(/(?:^|\n)(?:#{1,3}\s+(?:Task|Task\s+#)\s*)?(?:-?\s*\[\s*[xX]\s*\]\s*)?(\d+[A-Z]?|[A-Z]\d?|F\d+)\.?\s*(?:\n|$)/i);
    if (!idMatch) {
      return null;
    }
    const id = idMatch[1].trim();
    
    // Extract title (first heading or bold text)
    const titleMatch = block.match(/(?:^|\n)#+\s+(.+?)(?:\n|$)|\*\*(.+?)\*\*/);
    const title = titleMatch 
      ? (titleMatch[1] || titleMatch[2]).trim() 
      : `Task ${id}`;
    
    // Extract category
    const category = this.extractCategory(block);
    
    // Extract skills
    const skills = this.extractSkills(block);
    
    // Extract parallelization info
    const parallelInfo = this.extractParallelization(block);
    
    // Extract dependencies
    const { blocks, blockedBy } = this.extractDependencies(block, id);
    
    // Extract wave number
    const waveMatch = block.match(/Wave\s*(\d+)/i);
    const wave = waveMatch ? parseInt(waveMatch[1], 10) : undefined;
    
    // Extract acceptance criteria
    const acceptanceCriteria = this.extractSection(block, "Acceptance Criteria", "QA Scenarios");
    
    // Extract references
    const references = this.extractReferences(block);
    
    return {
      id,
      title,
      description: block,
      category,
      skills,
      blocks,
      blockedBy,
      wave,
      parallelizable: parallelInfo.parallelizable,
      parallelGroup: parallelInfo.parallelGroup,
      acceptanceCriteria,
      references,
    };
  }

  /**
   * Extract category from task block
   */
  private extractCategory(block: string): TaskCategory {
    const categoryPatterns: Array<{ pattern: RegExp; category: TaskCategory }> = [
      [/category["\s:]+["']?(?:quick)["']?/i, "quick"],
      [/category["\s:]+["']?(?:deep)["']?/i, "deep"],
      [/category["\s:]+["']?(?:writing)["']?/i, "writing"],
      [/category["\s:]+["']?(?:visual-engineering)["']?/i, "visual-engineering"],
      [/category["\s:]+["']?(?:unspecified-high)["']?/i, "unspecified-high"],
      [/category["\s:]+["']?(?:unspecified-low)["']?/i, "unspecified-low"],
      [/category["\s:]+["']?(?:ultrabrain)["']?/i, "ultrabrain"],
    ];
    
    for (const { pattern, category } of categoryPatterns) {
      if (pattern.test(block)) {
        return category;
      }
    }
    
    // Infer from content
    if (/\b(writing|documentation|doc|template)\b/i.test(block)) {
      return "writing";
    }
    if (/\b(deep|complex|architecture|design)\b/i.test(block)) {
      return "deep";
    }
    if (/\b(quick|simple|easy|minor)\b/i.test(block)) {
      return "quick";
    }
    
    return SpecTaskDispatcher.DEFAULT_CATEGORY;
  }

  /**
   * Extract skills from task block
   */
  private extractSkills(block: string): string[] {
    const skillsMatch = block.match(/skills["\s:]+[\[]([^\]]+)[\]]|skills?:\s*(.+?)(?:\n|$)/i);
    if (!skillsMatch) {
      return SpecTaskDispatcher.DEFAULT_SKILLS;
    }
    
    const skillsStr = skillsMatch[1] || skillsMatch[2];
    return skillsStr
      .split(/[,|]/)
      .map((s) => s.trim().replace(/["'\[\]]/g, ""))
      .filter((s) => s.length > 0);
  }

  /**
   * Extract parallelization info from task block
   */
  private extractParallelization(block: string): { parallelizable: boolean; parallelGroup?: string } {
    const parallelSection = this.extractSection(block, "Parallelization");
    
    const canParallel = /can\s+run\s+in\s+parallel[:\s]+(?:yes|true)/i.test(parallelSection);
    const groupMatch = parallelSection.match(/parallel\s+group[:\s]+([^,\n]+)/i);
    
    return {
      parallelizable: canParallel,
      parallelGroup: groupMatch ? groupMatch[1].trim() : undefined,
    };
  }

  /**
   * Extract dependencies (blocks/blockedBy)
   */
  private extractDependencies(block: string, currentId: string): { blocks: string[]; blockedBy: string[] } {
    const parallelSection = this.extractSection(block, "Parallelization");
    
    // Extract "Blocks: Tasks X-Y, Z"
    const blocksMatch = parallelSection.match(/blocks?[:\s]+(?:Tasks?\s*)?([^\n,]+(?:\s*,\s*[^\n,]+)*)/i);
    const blocks = blocksMatch 
      ? this.parseTaskIdList(blocksMatch[1])
      : [];
    
    // Extract "Blocked By: Task X"
    const blockedByMatch = parallelSection.match(/blocked\s*by[:\s]+(?:Tasks?\s*)?([^\n,]+(?:\s*,\s*[^\n,]+)*)/i);
    const blockedBy = blockedByMatch 
      ? this.parseTaskIdList(blockedByMatch[1])
      : [];
    
    // Self-reference check
    return {
      blocks: blocks.filter((id) => id !== currentId),
      blockedBy: blockedBy.filter((id) => id !== currentId),
    };
  }

  /**
   * Parse a list of task IDs like "1, 2, 3" or "Tasks 1-5" or "1, 3-7"
   */
  private parseTaskIdList(listStr: string): string[] {
    const ids: string[] = [];
    const parts = listStr.split(/[\s,]+/).filter((s) => s.length > 0);
    
    for (const part of parts) {
      // Handle ranges like "4-21" or "3-7"
      const rangeMatch = part.match(/^(\d+[A-Z]?)-(\d+[A-Z]?)$/i);
      if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        for (let i = start; i <= end; i++) {
          ids.push(String(i));
        }
      } else {
        // Single ID
        ids.push(part.replace(/[^0-9A-Za-z]/gi, ""));
      }
    }
    
    return ids;
  }

  /**
   * Extract a section from the task block
   */
  private extractSection(block: string, ...sectionNames: string[]): string {
    for (const sectionName of sectionNames) {
      // Match section header (various formats)
      const sectionPattern = new RegExp(
        `(?:^|\\n)(?:${sectionName}|\\*\\*${sectionName}\\*\\*|${sectionName}[:\\s]*)\\n([\\s\\S]*?)(?=\\n(?:[A-Z#*]|$))`,
        "i"
      );
      const match = block.match(sectionPattern);
      if (match) {
        return match[1].trim();
      }
    }
    return "";
  }

  /**
   * Extract references
   */
  private extractReferences(block: string): string[] {
    const refSection = this.extractSection(block, "References");
    if (!refSection) {
      return [];
    }
    
    const refs: string[] = [];
    const lines = refSection.split("\n");
    
    for (const line of lines) {
      // Match file paths or URLs
      const pathMatch = line.match(/(?:[-*]\s*)?([^\n]+?\.(?:md|ts|js|json|d\.ts)(?:\s*:.+)?)/i);
      const urlMatch = line.match(/(?:https?:\/\/[^\s]+)/);
      
      if (pathMatch) {
        refs.push(pathMatch[1].trim());
      } else if (urlMatch) {
        refs.push(urlMatch[0]);
      }
    }
    
    return refs;
  }

  /**
   * Analyze task dependencies and compute execution order
   * Returns tasks grouped by parallelizability
   */
  analyzeDependencies(tasks: ParsedTask[]): ParallelTaskGroup[] {
    const taskMap = new Map<string, ParsedTask>();
    const inDegree = new Map<string, number>();
    const adjacency = new Map<string, string[]>();
    
    // Initialize
    for (const task of tasks) {
      taskMap.set(task.id, task);
      inDegree.set(task.id, 0);
      adjacency.set(task.id, []);
    }
    
    // Build graph
    for (const task of tasks) {
      for (const depId of task.blockedBy) {
        if (taskMap.has(depId)) {
          adjacency.get(depId)!.push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      }
    }
    
    // Topological sort with level tracking
    const levels: string[][] = [];
    const visited = new Set<string>();
    const currentLevel: string[] = [];
    
    while (visited.size < tasks.length) {
      // Find all tasks with inDegree 0 that aren't visited
      for (const [taskId, degree] of inDegree) {
        if (degree === 0 && !visited.has(taskId)) {
          currentLevel.push(taskId);
        }
      }
      
      if (currentLevel.length === 0) {
        // Cycle detected or remaining tasks - break
        const remaining = tasks.filter((t) => !visited.has(t.id));
        if (remaining.length > 0) {
          levels.push(remaining.map((t) => t.id));
        }
        break;
      }
      
      // Sort current level by wave if available, then by id
      currentLevel.sort((a, b) => {
        const taskA = taskMap.get(a)!;
        const taskB = taskMap.get(b)!;
        if (taskA.wave !== undefined && taskB.wave !== undefined) {
          return taskA.wave - taskB.wave;
        }
        return a.localeCompare(b, undefined, { numeric: true });
      });
      
      levels.push([...currentLevel]);
      
      // Remove current level from graph
      for (const taskId of currentLevel) {
        visited.add(taskId);
        for (const neighbor of adjacency.get(taskId) || []) {
          inDegree.set(neighbor, (inDegree.get(neighbor) || 1) - 1);
        }
      }
      
      currentLevel.length = 0;
    }
    
    // Convert to ParallelTaskGroups
    return levels.map((levelTaskIds, levelIndex) => {
      const levelTasks = levelTaskIds
        .map((id) => taskMap.get(id))
        .filter((t): t is ParsedTask => t !== undefined);
      
      // Determine if background is needed (exploration tasks only)
      const isBackground = levelTasks.every(
        (t) => t.category === "unspecified-high" || t.category === "unspecified-low"
      );
      
      return {
        groupId: `level-${levelIndex + 1}`,
        tasks: levelTasks,
        isBackground,
      };
    });
  }

  /**
   * Generate parallel task groups using explicit parallelization hints from tasks
   */
  generateParallelGroups(tasks: ParsedTask[]): ParallelTaskGroup[] {
    // Group by wave first
    const waveGroups = new Map<number | "none", ParsedTask[]>();
    
    for (const task of tasks) {
      const waveKey = task.wave ?? "none";
      if (!waveGroups.has(waveKey)) {
        waveGroups.set(waveKey, []);
      }
      waveGroups.get(waveKey)!.push(task);
    }
    
    // Within each wave, check explicit parallel group hints
    const parallelGroups: ParallelTaskGroup[] = [];
    let groupIndex = 0;
    
    for (const [wave, waveTasks] of waveGroups) {
      if (wave === "none") {
        // Tasks without wave - analyze dependencies
        const depsResult = this.analyzeDependencies(waveTasks);
        parallelGroups.push(...depsResult);
      } else {
        // Tasks with explicit wave - group by parallel group hint
        const groupMap = new Map<string | "_sequential_", ParsedTask[]>();
        
        for (const task of waveTasks) {
          const key = task.parallelGroup || "_sequential_";
          if (!groupMap.has(key)) {
            groupMap.set(key, []);
          }
          groupMap.get(key)!.push(task);
        }
        
        for (const [groupKey, groupTasks] of groupMap) {
          const isBackground = groupTasks.some((t) => t.parallelizable);
          
          parallelGroups.push({
            groupId: `wave-${wave}-${groupKey === "_sequential_" ? "sequential" : groupKey.replace(/\s+/g, "-").toLowerCase()}`,
            tasks: groupTasks,
            isBackground,
          });
          groupIndex++;
        }
      }
    }
    
    return parallelGroups;
  }

  /**
   * Build a complete execution plan from tasks
   */
  buildExecutionPlan(tasks: ParsedTask[]): ParallelTaskGroup[] {
    // If tasks have explicit parallel groups, use those
    const hasExplicitGroups = tasks.some((t) => t.parallelGroup);
    
    if (hasExplicitGroups) {
      return this.generateParallelGroups(tasks);
    }
    
    // Otherwise use dependency analysis
    return this.analyzeDependencies(tasks);
  }

  /**
   * Format tasks for dispatch as a prompt
   * Returns formatted string for task() prompt parameter
   */
  formatTasksForDispatch(tasks: ParsedTask[], groupContext?: string): string {
    const header = groupContext 
      ? `## ${groupContext}\n\nExecute the following tasks:\n\n`
      : "## Task Execution\n\n";
    
    const taskList = tasks
      .map(
        (task, index) =>
          `### Task ${task.id}: ${task.title}\n\n${task.description.slice(0, 500)}${task.description.length > 500 ? "..." : ""}\n\n**Category**: ${task.category}\n**Skills**: ${task.skills.join(", ") || "none"}\n\n**Acceptance Criteria**:\n${task.acceptanceCriteria.map((ac) => `- ${ac}`).join("\n")}`
      )
      .join("\n\n---\n\n");
    
    return header + taskList;
  }

  /**
   * Generate task dispatch calls for a group
   * Returns array of dispatch objects that can be used with task()
   */
  generateDispatchCalls(group: ParallelTaskGroup): Array<{
    category: TaskCategory;
    skills: string[];
    runInBackground: boolean;
    prompt: string;
    taskIds: string[];
  }> {
    // For exploration tasks, dispatch individually with background
    if (group.isBackground) {
      return group.tasks.map((task) => ({
        category: task.category,
        skills: task.skills,
        runInBackground: true,
        prompt: this.formatTasksForDispatch([task], `Task ${task.id}`),
        taskIds: [task.id],
      }));
    }
    
    // For execution tasks, dispatch all in one call (parallel)
    return [
      {
        category: group.tasks[0]?.category || SpecTaskDispatcher.DEFAULT_CATEGORY,
        skills: [...new Set(group.tasks.flatMap((t) => t.skills))],
        runInBackground: false,
        prompt: this.formatTasksForDispatch(group.tasks, group.groupId),
        taskIds: group.tasks.map((t) => t.id),
      },
    ];
  }

  /**
   * Get all tasks as an array
   */
  getTasks(): ParsedTask[] {
    return this.taskOrder.map((id) => this.tasks.get(id)!);
  }

  /**
   * Get a specific task by ID
   */
  getTask(id: string): ParsedTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get task execution order (topologically sorted)
   */
  getExecutionOrder(): string[] {
    const groups = this.analyzeDependencies(this.getTasks());
    return groups.flatMap((g) => g.tasks.map((t) => t.id));
  }

  /**
   * Clear all parsed tasks
   */
  clear(): void {
    this.tasks.clear();
    this.taskOrder = [];
  }
}

/**
 * Helper function to dispatch all tasks from TASKS.md
 * Returns the dispatch result with all groups and task IDs
 */
export async function dispatchAllTasks(
  tasksPath: string = ".spec/TASKS.md",
  options?: {
    category?: TaskCategory;
    skills?: string[];
    maxConcurrent?: number;
  }
): Promise<DispatchResult> {
  const dispatcher = new SpecTaskDispatcher();
  
  let tasks: ParsedTask[];
  try {
    tasks = await dispatcher.parseTasks(tasksPath);
  } catch (err) {
    return {
      total: 0,
      groups: [],
      taskIds: [],
      errors: [
        {
          taskId: "PARSE_ERROR",
          error: err instanceof Error ? err.message : String(err),
        },
      ],
    };
  }
  
  const groups = dispatcher.buildExecutionPlan(tasks);
  
  return {
    total: tasks.length,
    groups,
    taskIds: tasks.map((t) => t.id),
    errors: [],
  };
}

/**
 * Create a task dispatcher from TASKS.md content (without file system)
 */
export function createDispatcherFromContent(content: string): SpecTaskDispatcher {
  const dispatcher = new SpecTaskDispatcher();
  dispatcher.parseTasksContent(content);
  return dispatcher;
}
