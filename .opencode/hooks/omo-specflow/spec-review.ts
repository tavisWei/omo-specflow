import * as fs from "fs/promises";
import * as path from "path";
import {
  getState,
  getIncompleteClauses,
  generateCoverageReport,
  type SpecCoverageReport,
} from "./spec-tracker.js";

const EVIDENCE_DIR = ".sisyphus/evidence";
const README_CANDIDATES = ["README.md", "README.zh-CN.md", "README.cn.md", "USAGE.md"] as const;

interface ParsedTaskBlock {
  taskNumber: string;
  title: string;
  block: string;
}

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

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseTaskBlocks(content: string): ParsedTaskBlock[] {
  const matches = [...content.matchAll(/^## Task\s+(\d+)\s*:\s*(.+)$/gm)];

  return matches.map((match, index) => {
    const blockStart = match.index ?? 0;
    const blockEnd = matches[index + 1]?.index ?? content.length;
    return {
      taskNumber: match[1],
      title: match[2].trim(),
      block: content.slice(blockStart, blockEnd).trim(),
    };
  });
}

function extractEvidencePaths(content: string): string[] {
  const matches = [...content.matchAll(/Evidence:\s*([^\s`]+)/g)];
  return [...new Set(matches.map((match) => match[1].trim()))];
}

function extractFilesList(taskBlock: string): string[] {
  const filesSectionMatch = /\*\*Files\*\*:\s*([\s\S]*?)(?:\n\*\*[A-Z][\w\s/()-]*\*\*:|$)/.exec(taskBlock);
  if (!filesSectionMatch) {
    return [];
  }

  return filesSectionMatch[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "));
}

async function findReadmeLikeFiles(): Promise<string[]> {
  const existing = await Promise.all(
    README_CANDIDATES.map(async (candidate) => ((await pathExists(candidate)) ? candidate : null))
  );
  return existing.filter((file): file is string => !!file);
}

async function readTrackerStateSafe(): Promise<Awaited<ReturnType<typeof getState>> | null> {
  try {
    return await getState();
  } catch {
    return null;
  }
}

/**
 * Extract user stories and acceptance criteria from SPEC.md
 * Format: US-XXX, AC-XXX.X patterns
 */
function extractSpecClauses(content: string): Array<{
  id: string;
  type: "US" | "AC" | "FR" | "NFR" | "REQ" | "section";
  content: string;
  section: string;
}> {
  const clauses: Array<{
    id: string;
    type: "US" | "AC" | "FR" | "NFR" | "REQ" | "section";
    content: string;
    section: string;
  }> = [];

  const lines = content.split("\n");
  let currentSection = "Unspecified";

  // Match section headers (# ## ###)
  const sectionPattern = /^#{1,3}\s+(.+)$/;
  // Match US-XXX, AC-XXX.X, FR-XXX, NFR-XXX, REQ-XXX patterns
  const clausePattern = /^(US-\d+|AC-\d+(?:\.\d+)?|FR-\d+|NFR-\d+|REQ-\d+)\s*[:\.]?\s*(.+)$/i;

  for (const line of lines) {
    const sectionMatch = sectionPattern.exec(line);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      continue;
    }

    const clauseMatch = clausePattern.exec(line);
    if (clauseMatch) {
      const id = clauseMatch[1].toUpperCase();
      const prefix = id.split("-")[0] as "US" | "AC" | "FR" | "NFR" | "REQ";
      clauses.push({
        id,
        type: prefix,
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
  specClauses: Array<{ id: string; type: "US" | "AC" | "FR" | "NFR" | "REQ" | "section"; content: string; section: string }>
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
  const evidencePaths = extractEvidencePaths(taskDescription).filter((evidencePath) => evidencePath.startsWith(EVIDENCE_DIR));

  if (deliverables.length === 0) {
    discrepancies.push({
      severity: "warning",
      category: "completeness",
      description: "Task completed but no deliverables were recorded",
      suggestion: "Record changed files, evidence artifacts, or review outputs before marking completion",
    });
  }

  if (evidencePaths.length === 0) {
    discrepancies.push({
      severity: "warning",
      category: "compliance",
      description: "Task completion has no evidence reference",
      suggestion: "Add an Evidence path under QA Scenarios so the completion claim is traceable",
    });
  }

  if (addressedClauses.length === 0) {
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

  const specDir = path.dirname(SPEC_PATH);
  const templateIssues = await checkTemplateCompleteness(specDir);
  issues.push(...templateIssues);

  const fileRefIssues = await checkFileReferences(tasksContent);
  issues.push(...fileRefIssues);

  const evidenceIssues = await checkEvidenceTraceability(tasksContent, specClauses);
  issues.push(...evidenceIssues);

  const deliveryIssues = await checkDeliveryReadiness();
  issues.push(...deliveryIssues);

  const changeManagementIssues = await checkChangeManagementReadiness();
  issues.push(...changeManagementIssues);

  const taskBlocks = parseTaskBlocks(tasksContent);
  for (let i = 0; i < taskBlocks.length; i++) {
    const taskIssues = validateTaskQuality(taskBlocks[i].block);
    for (const issue of taskIssues) {
      issue.description = `Task ${taskBlocks[i].taskNumber}: ${issue.description}`;
    }
    issues.push(...taskIssues);
  }

  // Determine verdict
  const blockingIssues = issues.filter((i) => i.severity === "blocking");
  const verdict: SpecReviewVerdict =
    blockingIssues.length > 0 ? "REJECT" : issues.length > 0 ? "WARNING" : "OKAY";

  const summary =
    verdict === "REJECT"
      ? `Spec review found ${blockingIssues.length} blocking issue(s). Please fix before proceeding.`
      : verdict === "WARNING"
        ? `Spec review found ${issues.length} non-blocking issue(s). Review evidence, delivery readiness, and traceability before proceeding.`
        : `Spec review passed. ${coverage.completedClauses}/${coverage.totalClauses} clauses complete (${coverage.coveragePercent}%), with delivery and evidence checks satisfied.`;

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

  let output = `${header}\n\n**Verdict**: ${result.verdict}\n**Summary**: ${result.summary}\n`;

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
        output += `_... and ${info.length - 5} more notes_\n`;
      }
    }
  }

  return output;
}

/**
 * Validate a single task block for quality requirements.
 * Checks for acceptance criteria, file paths, spec clause references, and QA scenarios.
 */
export function validateTaskQuality(taskBlock: string): SpecReviewIssue[] {
  const issues: SpecReviewIssue[] = [];

  if (!taskBlock.includes("Acceptance Criteria")) {
    issues.push({
      severity: "blocking",
      category: "completeness",
      description: "Task missing Acceptance Criteria section",
      suggestion: "Add **Acceptance Criteria**: with checkbox items",
    });
  }

  if (!taskBlock.includes("**Files**:") && !taskBlock.includes("Files:")) {
    issues.push({
      severity: "blocking",
      category: "completeness",
      description: "Task missing Files section — no concrete file paths specified",
      suggestion: "Add **Files**: listing specific files to create/modify",
    });
  } else if (extractFilesList(taskBlock).length === 0) {
    issues.push({
      severity: "blocking",
      category: "completeness",
      description: "Task Files section is present but empty",
      suggestion: "List 1-3 concrete files so implementation scope is traceable",
    });
  }

  const clauseRefPattern = /(US-\d+|AC-\d+(?:\.\d+)?|FR-\d+|NFR-\d+|REQ-\d+)/gi;
  if (!clauseRefPattern.test(taskBlock)) {
    issues.push({
      severity: "warning",
      category: "reference",
      description: "Task has no spec clause references (US-xxx, AC-xxx, etc.)",
      suggestion: "Add **Spec Refs**: linking to SPEC.md clauses",
    });
  }

  if (!taskBlock.includes("category:")) {
    issues.push({
      severity: "warning",
      category: "completeness",
      description: "Task missing category tag for dispatcher routing",
      suggestion: "Add - category: quick|deep|unspecified-high|writing|oracle",
    });
  }

  if (!taskBlock.includes("**QA Scenarios**:")) {
    issues.push({
      severity: "warning",
      category: "compliance",
      description: "Task missing QA Scenarios section",
      suggestion: "Add at least one executable QA scenario with Tool, Steps, Expected Result, and Evidence",
    });
  } else if (!taskBlock.includes("Evidence:")) {
    issues.push({
      severity: "warning",
      category: "compliance",
      description: "Task QA Scenarios do not declare any Evidence path",
      suggestion: `Add Evidence: ${EVIDENCE_DIR}/task-{id}-{scenario}.txt so verification is traceable`,
    });
  }

  if (!taskBlock.includes("**Parallelization**:")) {
    issues.push({
      severity: "warning",
      category: "compliance",
      description: "Task missing Parallelization section",
      suggestion: "Add Can Run In Parallel / Parallel Group / Blocked By / Blocks fields",
    });
  }

  return issues;
}

async function checkEvidenceTraceability(
  tasksContent: string,
  specClauses: Array<{ id: string; type: "US" | "AC" | "FR" | "NFR" | "REQ" | "section"; content: string; section: string }>
): Promise<SpecReviewIssue[]> {
  const issues: SpecReviewIssue[] = [];
  const trackerState = await readTrackerStateSafe();
  const taskBlocks = parseTaskBlocks(tasksContent);
  const taskBlocksByNumber = new Map(taskBlocks.map((task) => [task.taskNumber, task]));
  const clauseMap = new Map(specClauses.map((clause) => [clause.id, clause]));

  for (const task of taskBlocks) {
    const evidencePaths = extractEvidencePaths(task.block);
    if (evidencePaths.length === 0) {
      issues.push({
        severity: "warning",
        category: "compliance",
        description: `Task ${task.taskNumber} has no evidence path, so delivery claims will not be traceable`,
        suggestion: `Add Evidence: ${EVIDENCE_DIR}/task-${task.taskNumber}-{scenario}.txt under QA Scenarios`,
      });
    }
  }

  if (!trackerState) {
    return issues;
  }

  for (const taskRef of Object.values(trackerState.taskRefs)) {
    if (!taskRef.completedAt) {
      continue;
    }

    const taskNumberMatch = /(?:^|-)task-(\d+)(?:-|$)/i.exec(taskRef.taskId)
      ?? /(?:^|-)?(\d+)(?:-|$)/.exec(taskRef.taskId);
    const taskBlock = taskNumberMatch ? taskBlocksByNumber.get(taskNumberMatch[1]) : undefined;
    const evidencePaths = taskBlock ? extractEvidencePaths(taskBlock.block) : [];

    if (!taskBlock) {
      issues.push({
        severity: "warning",
        category: "reference",
        description: `Completed tracker task "${taskRef.taskId}" could not be mapped back to TASKS.md`,
        suggestion: "Keep task IDs and TASKS.md headings aligned so evidence can be audited",
      });
      continue;
    }

    if (evidencePaths.length === 0) {
      issues.push({
        severity: "blocking",
        category: "compliance",
        description: `Task ${taskBlock.taskNumber} is marked completed in tracker but has no evidence reference`,
        affectedClauses: taskRef.clauseIds,
        suggestion: "Add at least one evidence file reference before claiming the task is complete",
      });
      continue;
    }

    const existingEvidence = await Promise.all(
      evidencePaths.map(async (evidencePath) => ((await pathExists(evidencePath)) ? evidencePath : null))
    );
    const foundEvidence = existingEvidence.filter((value): value is string => !!value);

    if (foundEvidence.length === 0) {
      issues.push({
        severity: "blocking",
        category: "compliance",
        description: `Task ${taskBlock.taskNumber} is marked completed but none of its evidence files exist`,
        affectedClauses: taskRef.clauseIds,
        suggestion: "Run the QA scenario and write the evidence file before closing the task",
      });
    }

    const missingClauseRefs = taskRef.clauseIds.filter((clauseId) => !clauseMap.has(clauseId));
    if (missingClauseRefs.length > 0) {
      issues.push({
        severity: "warning",
        category: "reference",
        description: `Task ${taskBlock.taskNumber} references tracker clauses missing from SPEC.md: ${missingClauseRefs.join(", ")}`,
        affectedClauses: missingClauseRefs,
        suggestion: "Update SPEC.md or tracker state so traceability remains bidirectional",
      });
    }
  }

  return issues;
}

async function checkDeliveryReadiness(): Promise<SpecReviewIssue[]> {
  const issues: SpecReviewIssue[] = [];
  const readmeFiles = await findReadmeLikeFiles();

  if (readmeFiles.length === 0) {
    issues.push({
      severity: "warning",
      category: "compliance",
      description: "Delivery checklist expects README or usage documentation, but none was found",
      suggestion: "Add README.md or USAGE.md so recipients can operate the delivered workflow",
    });
  }

  if (!(await pathExists(EVIDENCE_DIR))) {
    issues.push({
      severity: "warning",
      category: "compliance",
      description: `Evidence directory ${EVIDENCE_DIR} not found`,
      suggestion: "Store task and final-review evidence under .sisyphus/evidence/",
    });
    return issues;
  }

  const evidenceFiles = await fs.readdir(EVIDENCE_DIR);
  const finalReviewEvidence = evidenceFiles.find((file) => /final-review|review-summary/i.test(file));
  if (!finalReviewEvidence) {
    issues.push({
      severity: "warning",
      category: "compliance",
      description: "Final review evidence file not found in .sisyphus/evidence/",
      suggestion: "Write a final-review-summary.txt (or equivalent) to capture review evidence",
    });
  }

  return issues;
}

async function checkChangeManagementReadiness(): Promise<SpecReviewIssue[]> {
  const trackerState = await readTrackerStateSafe();
  if (!trackerState || trackerState.versionHistory.length <= 1) {
    return [];
  }

  const specContent = await readFileSafe(SPEC_PATH);
  const tasksContent = await readFileSafe(TASKS_PATH);
  const combinedContent = `${specContent ?? ""}\n${tasksContent ?? ""}`;

  if (/Affected Docs\s*\|\s*Affected Tasks\s*\|\s*Reason/i.test(combinedContent) || /变更记录|Change Log/i.test(combinedContent)) {
    return [];
  }

  return [{
    severity: "warning",
    category: "compliance",
    description: "Spec tracker shows version history, but no change log was found in SPEC.md or TASKS.md",
    suggestion: "Add a change record table when requirements, acceptance criteria, or constraints change",
  }];
}

/**
 * Check template completeness — verifies generated spec docs have no empty sections or bare placeholders.
 */
async function checkTemplateCompleteness(specDir: string): Promise<SpecReviewIssue[]> {
  const issues: SpecReviewIssue[] = [];
  const barePlaceholderPattern = /\[(?!NEEDS CLARIFICATION)[A-Z][A-Za-z\s]+\]/g;

  try {
    const entries = await fs.readdir(specDir);
    const specFiles = entries.filter((e: string) => e.endsWith(".md") && e !== "TASKS.md");

    for (const file of specFiles) {
      const content = await readFileSafe(path.join(specDir, file));
      if (!content) continue;

      const placeholders = content.match(barePlaceholderPattern);
      if (placeholders && placeholders.length > 0) {
        issues.push({
          severity: "warning",
          category: "completeness",
          description: `${file} contains ${placeholders.length} bare placeholder(s): ${placeholders.slice(0, 3).join(", ")}`,
          suggestion: "Replace placeholders with concrete content or [NEEDS CLARIFICATION]",
        });
      }

      const lines = content.split("\n");
      let currentHeading = "";
      let emptySection = false;
      for (let i = 0; i < lines.length; i++) {
        if (/^#{1,3}\s+/.test(lines[i])) {
          if (emptySection && currentHeading) {
            issues.push({
              severity: "info",
              category: "completeness",
              description: `${file}: section "${currentHeading}" appears empty`,
              suggestion: "Fill in section content or mark as N/A",
            });
          }
          currentHeading = lines[i].replace(/^#+\s+/, "").trim();
          emptySection = true;
        } else if (lines[i].trim().length > 0) {
          emptySection = false;
        }
      }
    }
  } catch {
    // specDir might not exist yet
  }

  return issues;
}

/**
 * Check file reference validity — verifies that file paths mentioned in TASKS.md actually exist.
 */
async function checkFileReferences(tasksContent: string): Promise<SpecReviewIssue[]> {
  const issues: SpecReviewIssue[] = [];
  const filePathPattern = /`([a-zA-Z0-9_./-]+\.[a-zA-Z]{1,5})`/g;
  let match;

  while ((match = filePathPattern.exec(tasksContent)) !== null) {
    const filePath = match[1];
    if (filePath.startsWith(".spec/") || filePath.startsWith(".sisyphus/")) continue;
    if (filePath.includes("*") || filePath.includes("...")) continue;

    try {
      await fs.access(filePath);
    } catch {
      issues.push({
        severity: "info",
        category: "reference",
        description: `Referenced file "${filePath}" does not exist yet`,
        suggestion: "This file will be created during implementation — verify path is correct",
      });
    }
  }

  return issues;
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
