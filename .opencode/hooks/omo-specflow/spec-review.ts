import * as fs from "fs/promises";
import * as path from "path";
import {
  getState,
  getClause,
  getIncompleteClauses,
  generateCoverageReport,
  type SpecClause,
  type SpecCoverageReport,
} from "./spec-tracker.js";

/**
 * Path to the SPEC.md file
 */
const SPEC_PATH = ".spec/SPEC.md";

/**
 * Path to the TASKS.md file
 */
const TASKS_PATH = ".spec/TASKS.md";

/**
 * Verdict types for spec review
 */
export type SpecReviewVerdict = "OKAY" | "REJECT" | "WARNING";

/**
 * A single issue found during review
 */
export interface SpecReviewIssue {
  /** Severity level */
  severity: "blocking" | "warning" | "info";
  /** Category of the issue */
  category: "reference" | "completeness" | "compliance" | "variation";
  /** Description of the issue */
  description: string;
  /** Which spec clause(s) are affected */
  affectedClauses?: string[];
  /** Suggested fix (for non-blocking) */
  suggestion?: string;
}

/**
 * Result of a spec review
 */
export interface SpecReviewResult {
  /** The verdict of the review */
  verdict: SpecReviewVerdict;
  /** Summary of the review */
  summary: string;
  /** Issues found (empty if OKAY) */
  issues: SpecReviewIssue[];
  /** Timestamp of the review */
  reviewedAt: number;
  /** Task ID this review is for (if applicable) */
  taskId?: string;
}

/**
 * Pre-execution verification result
 */
export interface PreExecutionResult {
  /** Whether the task can proceed */
  canProceed: boolean;
  /** What spec clauses this task addresses */
  addressedClauses: string[];
  /** Any warnings or issues */
  warnings: string[];
  /** Verdict */
  verdict: SpecReviewVerdict;
}

/**
 * Post-completion verification result
 */
export interface PostCompletionResult {
  /** Whether deliverables match expectations */
  deliverablesMatch: boolean;
  /** Clauses confirmed completed */
  confirmedClauses: string[];
  /** Any discrepancies found */
  discrepancies: SpecReviewIssue[];
  /** Verdict */
  verdict: SpecReviewVerdict;
}

/**
 * Read a file safely, returning null if it doesn't exist
 */
async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

/**
 * Extract user stories and acceptance criteria from SPEC.md
 * Format: US-XXX, AC-XXX.X patterns
 */
function extractSpecClauses(content: string): Array<{
  id: string;
  type: "US" | "AC" | "section";
  content: string;
  section: string;
}> {
  const clauses: Array<{
    id: string;
    type: "US" | "AC" | "section";
    content: string;
    section: string;
  }> = [];

  const lines = content.split("\n");
  let currentSection = "Unspecified";

  // Match section headers (# ## ###)
  const sectionPattern = /^#{1,3}\s+(.+)$/;
  // Match US-XXX and AC-XXX.X patterns
  const clausePattern = /^(US-\d+|AC-\d+(?:\.\d+)?)\s*[:\.]?\s*(.+)$/i;

  for (const line of lines) {
    const sectionMatch = sectionPattern.exec(line);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const clauseMatch = clausePattern.exec(line);
    if (clauseMatch) {
      const id = clauseMatch[1].toUpperCase();
      const type = id.startsWith("US-") ? "US" : "AC";
      clauses.push({
        id,
        type,
        content: clauseMatch[2].trim(),
        section: currentSection,
      });
    }
  }

  return clauses;
}

/**
 * Extract task references from TASKS.md
 * Format: - [ ] Task description (US-001, AC-001.1)
 */
function extractTaskRefs(content: string): Array<{
  taskId: string;
  description: string;
  referencedClauses: string[];
}> {
  const tasks: Array<{
    taskId: string;
    description: string;
    referencedClauses: string[];
  }> = [];

  const lines = content.split("\n");
  const taskPattern = /^-\s*\[\s*[xX ]?\]\s*(.+)$/i;
  const clauseRefPattern = /(US-\d+|AC-\d+(?:\.\d+)?)/gi;

  for (const line of lines) {
    const match = taskPattern.exec(line);
    if (match) {
      const description = match[1].trim();
      const refs: string[] = [];
      let refMatch;
      while ((refMatch = clauseRefPattern.exec(description)) !== null) {
        refs.push(refMatch[1].toUpperCase());
      }
      // Generate a task ID from the description
      const taskId = description
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .substring(0, 50);

      tasks.push({
        taskId,
        description,
        referencedClauses: [...new Set(refs)],
      });
    }
  }

  return tasks;
}

/**
 * Check if a task description aligns with spec clauses
 * Allows reasonable implementation variations
 */
function verifyTaskSpecAlignment(
  taskDescription: string,
  clauseIds: string[],
  specClauses: Array<{ id: string; type: "US" | "AC"; content: string; section: string }>
): { aligned: boolean; issues: SpecReviewIssue[] } {
  const issues: SpecReviewIssue[] = [];

  if (clauseIds.length === 0) {
    issues.push({
      severity: "warning",
      category: "completeness",
      description: "Task does not reference any spec clauses",
      suggestion: "Consider adding US-XXX or AC-XXX references to link to SPEC.md",
    });
    return { aligned: true, issues }; // Still aligned, just a warning
  }

  const specClauseMap = new Map(specClauses.map((c) => [c.id, c]));

  for (const clauseId of clauseIds) {
    const clause = specClauseMap.get(clauseId.toUpperCase());
    if (!clause) {
      issues.push({
        severity: "warning",
        category: "reference",
        description: `Task references clause ${clauseId} which does not exist in SPEC.md`,
        suggestion: "Verify the clause ID is correct or add it to SPEC.md",
      });
    }
  }

  return { aligned: true, issues };
}

/**
 * Verify task content against SPEC.md before execution
 */
export async function preExecutionVerify(taskDescription: string): Promise<PreExecutionResult> {
  const warnings: string[] = [];
  const specContent = await readFileSafe(SPEC_PATH);

  if (!specContent) {
    warnings.push("No SPEC.md found - skipping spec compliance check");
    return {
      canProceed: true,
      addressedClauses: [],
      warnings,
      verdict: "WARNING",
    };
  }

  const specClauses = extractSpecClauses(specContent);

  // Extract clause references from task description
  const clauseRefPattern = /(US-\d+|AC-\d+(?:\.\d+)?)/gi;
  const refs: string[] = [];
  let match;
  while ((match = clauseRefPattern.exec(taskDescription)) !== null) {
    refs.push(match[1].toUpperCase());
  }

  const addressedClauses = [...new Set(refs)];

  // Verify alignment
  const alignment = verifyTaskSpecAlignment(taskDescription, addressedClauses, specClauses);
  warnings.push(...alignment.issues.map((i) => i.description));

  // Check if task addresses any spec requirements
  if (addressedClauses.length === 0 && specClauses.length > 0) {
    warnings.push(
      "Task does not explicitly reference spec clauses. Ensure implementation will address SPEC.md requirements."
    );
  }

  return {
    canProceed: true, // Always allow execution - warnings don't block
    addressedClauses,
    warnings,
    verdict: alignment.issues.some((i) => i.severity === "blocking") ? "REJECT" : "OKAY",
  };
}

/**
 * Verify deliverables against task description after completion
 * Allows reasonable implementation variations
 */
export async function postCompletionVerify(
  taskId: string,
  taskDescription: string,
  deliverables: string[]
): Promise<PostCompletionResult> {
  const discrepancies: SpecReviewIssue[] = [];

  const specContent = await readFileSafe(SPEC_PATH);
  if (!specContent) {
    return {
      deliverablesMatch: true, // Can't verify without spec
      confirmedClauses: [],
      discrepancies: [],
      verdict: "WARNING",
    };
  }

  const specClauses = extractSpecClauses(specContent);

  // Extract clause references from task description
  const clauseRefPattern = /(US-\d+|AC-\d+(?:\.\d+)?)/gi;
  const refs: string[] = [];
  let match;
  while ((match = clauseRefPattern.exec(taskDescription)) !== null) {
    refs.push(match[1].toUpperCase());
  }

  const addressedClauses = [...new Set(refs)];

  if (addressedClauses.length === 0) {
    // No specific clauses - just verify deliverables exist
    if (deliverables.length === 0) {
      discrepancies.push({
        severity: "warning",
        category: "completeness",
        description: "Task completed but no deliverables found",
        suggestion: "Ensure files were created or changes were made",
      });
    }
    return {
      deliverablesMatch: discrepancies.length === 0,
      confirmedClauses: [],
      discrepancies,
      verdict: discrepancies.length > 0 ? "WARNING" : "OKAY",
    };
  }

  // Verify each addressed clause has corresponding deliverables
  const specClauseMap = new Map(specClauses.map((c) => [c.id, c]));
  const confirmedClauses: string[] = [];

  for (const clauseId of addressedClauses) {
    const clause = specClauseMap.get(clauseId);
    if (!clause) {
      discrepancies.push({
        severity: "info",
        category: "reference",
        description: `Clause ${clauseId} referenced but not found in SPEC.md`,
      });
      continue;
    }

    // Check if any deliverable mentions or relates to this clause
    const deliverableMatches = deliverables.some((d) => {
      const dLower = d.toLowerCase();
      const clauseContentLower = clause.content.toLowerCase();
      // Check for keyword overlap
      const keyWords = clauseContentLower
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .slice(0, 5);
      return keyWords.some((word) => dLower.includes(word));
    });

    if (deliverableMatches) {
      confirmedClauses.push(clauseId);
    } else {
      // Not a blocker - allow implementation variations
      discrepancies.push({
        severity: "info",
        category: "variation",
        description: `Clause ${clauseId} may use alternative implementation approach`,
        suggestion: `Consider verifying "${clause.content.substring(0, 50)}..." is addressed`,
      });
    }
  }

  return {
    deliverablesMatch: true, // Variations are allowed
    confirmedClauses,
    discrepancies,
    verdict: "OKAY",
  };
}

/**
 * Perform a comprehensive spec review
 * Similar to Momus review style
 */
export async function performSpecReview(planPath?: string): Promise<SpecReviewResult> {
  const issues: SpecReviewIssue[] = [];
  const targetPlanPath = planPath || TASKS_PATH;

  // Read SPEC.md
  const specContent = await readFileSafe(SPEC_PATH);
  if (!specContent) {
    return {
      verdict: "WARNING",
      summary: "No SPEC.md found - spec review cannot be performed",
      issues: [
        {
          severity: "warning",
          category: "reference",
          description: "SPEC.md not found at .spec/SPEC.md",
          suggestion: "Create SPEC.md to enable spec compliance verification",
        },
      ],
      reviewedAt: Date.now(),
    };
  }

  // Read TASKS.md
  const tasksContent = await readFileSafe(targetPlanPath);
  if (!tasksContent) {
    issues.push({
      severity: "warning",
      category: "reference",
      description: "TASKS.md not found - cannot verify task-spec alignment",
      suggestion: "Create TASKS.md with spec-linked tasks",
    });
    return {
      verdict: "WARNING",
      summary: "TASKS.md not found",
      issues,
      reviewedAt: Date.now(),
    };
  }

  // Extract and verify clauses
  const specClauses = extractSpecClauses(specContent);
  const taskRefs = extractTaskRefs(tasksContent);

  // Check for orphaned clauses (defined but not referenced by any task)
  const clauseIds = new Set(specClauses.map((c) => c.id));
  const referencedClauseIds = new Set(taskRefs.flatMap((t) => t.referencedClauses));

  for (const clauseId of clauseIds) {
    if (!referencedClauseIds.has(clauseId)) {
      issues.push({
        severity: "info",
        category: "completeness",
        description: `Clause ${clauseId} defined in SPEC.md but not referenced by any task`,
        suggestion: "Add this clause reference to relevant tasks in TASKS.md",
      });
    }
  }

  // Verify each task's spec alignment
  for (const task of taskRefs) {
    if (task.referencedClauses.length === 0) {
      issues.push({
        severity: "info",
        category: "completeness",
        description: `Task "${task.taskId}" does not reference any spec clauses`,
        suggestion: "Link tasks to US-XXX or AC-XXX clauses in SPEC.md",
      });
    } else {
      const alignment = verifyTaskSpecAlignment(
        task.description,
        task.referencedClauses,
        specClauses
      );
      issues.push(...alignment.issues);
    }
  }

  // Get coverage report
  const coverage = await generateCoverageReport();

  if (coverage.totalClauses > 0 && coverage.coveragePercent < 50) {
    issues.push({
      severity: "warning",
      category: "completeness",
      description: `Spec coverage is only ${coverage.coveragePercent}% (${coverage.completedClauses}/${coverage.totalClauses} clauses completed)`,
      suggestion: "Ensure more spec clauses are addressed by implementation",
    });
  }

  // Determine verdict
  const blockingIssues = issues.filter((i) => i.severity === "blocking");
  const verdict: SpecReviewVerdict =
    blockingIssues.length > 0 ? "REJECT" : issues.length > 0 ? "WARNING" : "OKAY";

  const summary =
    verdict === "REJECT"
      ? `Spec review found ${blockingIssues.length} blocking issue(s). Please fix before proceeding.`
      : verdict === "WARNING"
        ? `Spec review found ${issues.length} non-blocking issue(s). Review recommended.`
        : `Spec review passed. ${coverage.completedClauses}/${coverage.totalClauses} clauses complete (${coverage.coveragePercent}%).`;

  return {
    verdict,
    summary,
    issues,
    reviewedAt: Date.now(),
  };
}

/**
 * Generate a formatted spec coverage report
 */
export async function generateSpecCoverageReport(): Promise<{
  report: SpecCoverageReport;
  formatted: string;
}> {
  const report = await generateCoverageReport();

  const formatted = `
## Spec Coverage Report

**Generated**: ${new Date(report.generatedAt).toISOString()}
**Spec Version**: ${report.specVersion}
**Overall Coverage**: ${report.coveragePercent}% (${report.completedClauses}/${report.totalClauses})

### Coverage by Section

${Object.entries(report.coverageBySection)
  .map(
    ([section, stats]) =>
      `- **${section}**: ${stats.percent}% (${stats.completed}/${stats.total})`
  )
  .join("\n") || "_No sections tracked_"}

### Incomplete Clauses

${report.incompleteClauses.length > 0 ? report.incompleteClauses.map((c) => 
  `- [ ] **${c.id}** (${c.section}): ${c.content.substring(0, 80)}${c.content.length > 80 ? "..." : ""}`
).join("\n") : "_All clauses complete_"}
`.trim();

  return { report, formatted };
}

/**
 * Format a review result as markdown (Momus-style)
 */
export function formatReviewResult(result: SpecReviewResult): string {
  const header = result.verdict === "OKAY" 
    ? "✅ [OKAY]" 
    : result.verdict === "REJECT" 
      ? "❌ [REJECT]" 
      : "⚠️ [WARNING]";

  let output = `${header}\n\n**Summary**: ${result.summary}\n`;

  if (result.issues.length > 0) {
    const blocking = result.issues.filter((i) => i.severity === "blocking");
    const warnings = result.issues.filter((i) => i.severity === "warning");
    const info = result.issues.filter((i) => i.severity === "info");

    if (blocking.length > 0) {
      output += `\n**Blocking Issues**:\n`;
      blocking.forEach((issue, idx) => {
        output += `${idx + 1}. ${issue.description}`;
        if (issue.suggestion) output += `\n   → ${issue.suggestion}`;
        output += "\n";
      });
    }

    if (warnings.length > 0) {
      output += `\n**Warnings**:\n`;
      warnings.forEach((issue, idx) => {
        output += `${idx + 1}. ${issue.description}`;
        if (issue.suggestion) output += `\n   → ${issue.suggestion}`;
        output += "\n";
      });
    }

    if (info.length > 0 && blocking.length === 0) {
      output += `\n**Notes**:\n`;
      info.slice(0, 5).forEach((issue, idx) => {
        output += `${idx + 1}. ${issue.description}`;
        if (issue.suggestion) output += `\n   → ${issue.suggestion}`;
        output += "\n";
      });
      if (info.length > 5) {
        output += `_... and ${info.length - 5} more notes`;\n`;
      }
    }
  }

  return output;
}

/**
 * Simple pre-flight check for spec workflow
 */
export async function preFlightCheck(): Promise<{
  ready: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}> {
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];

  // Check SPEC.md exists
  const specExists = await readFileSafe(SPEC_PATH);
  checks.push({
    name: "SPEC.md exists",
    passed: !!specExists,
    message: specExists
      ? `Found SPEC.md with ${extractSpecClauses(specExists).length} clauses`
      : "SPEC.md not found at .spec/SPEC.md",
  });

  // Check TASKS.md exists
  const tasksExists = await readFileSafe(TASKS_PATH);
  checks.push({
    name: "TASKS.md exists",
    passed: !!tasksExists,
    message: tasksExists
      ? `Found TASKS.md with ${extractTaskRefs(tasksExists).length} tasks`
      : "TASKS.md not found at .spec/TASKS.md",
  });

  // Check spec-tracker state
  const trackerState = await getState();
  checks.push({
    name: "Spec tracker initialized",
    passed: trackerState.clauses && Object.keys(trackerState.clauses).length > 0,
    message:
      trackerState.clauses && Object.keys(trackerState.clauses).length > 0
        ? `Tracking ${Object.keys(trackerState.clauses).length} clauses`
        : "No clauses registered in tracker (run register clauses first)",
  });

  // Check incomplete clauses
  const incomplete = await getIncompleteClauses();
  checks.push({
    name: "Spec has requirements",
    passed: incomplete.length > 0 || (trackerState.clauses && Object.keys(trackerState.clauses).length > 0),
    message:
      incomplete.length > 0
        ? `${incomplete.length} clauses still incomplete`
        : "All tracked clauses are complete",
  });

  return {
    ready: checks.every((c) => c.passed),
    checks,
  };
}
