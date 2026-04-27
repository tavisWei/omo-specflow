import * as fs from "fs/promises";
import * as path from "path";
import type { SpecReviewIssue } from "./spec-review.js";

/**
 * Upstream artifact definitions with dependency chain
 */
export const UPSTREAM_ARTIFACTS = {
  PRD: {
    filename: "PRD.md",
    displayName: "PRD (Product Requirements Document)",
    dependsOn: [],
    requiredFor: ["web", "api", "cli"] as const,
    priority: 1,
  },
  COMPETITOR_RESEARCH: {
    filename: "COMPETITOR-RESEARCH.md",
    displayName: "Competitor Research",
    dependsOn: ["PRD"],
    requiredFor: ["web", "api"] as const,
    priority: 2,
  },
  ARCHITECTURE: {
    filename: "ARCHITECTURE.md",
    displayName: "Technical Architecture",
    dependsOn: ["PRD"],
    requiredFor: ["web", "api", "cli"] as const,
    priority: 2,
  },
  UIUX: {
    filename: "UIUX.md",
    displayName: "UI/UX Design",
    dependsOn: ["ARCHITECTURE"],
    requiredFor: ["web"] as const,
    priority: 3,
  },
  PRODUCT_DESIGN: {
    filename: "PRODUCT-DESIGN.md",
    displayName: "Product Design Details",
    dependsOn: ["UIUX", "ARCHITECTURE"],
    requiredFor: ["web"] as const,
    priority: 4,
  },
  PAGE_COVERAGE: {
    filename: ".page-coverage.json",
    displayName: "Page Coverage Map",
    dependsOn: ["PRODUCT_DESIGN"],
    requiredFor: ["web"] as const,
    priority: 5,
  },
} as const;

export type ArtifactKey = keyof typeof UPSTREAM_ARTIFACTS;
export type ProjectType = "web" | "api" | "cli";

export interface ArtifactStatus {
  key: ArtifactKey;
  exists: boolean;
  path: string;
  completeness: "missing" | "empty" | "incomplete" | "complete";
  issues: string[];
  dependencies: ArtifactKey[];
  dependents: ArtifactKey[];
}

export interface PageCoverageEntry {
  pageId: string;
  pageName: string;
  route?: string;
  specRefs: string[];
  taskIds: string[];
  status: "pending" | "in-progress" | "done";
}

export interface PageCoverageData {
  pages: PageCoverageEntry[];
  generatedAt: number;
  version: string;
  uncoveredFeatures?: string[];
}

export interface ArtifactCoverageReport {
  artifacts: ArtifactStatus[];
  missingArtifacts: ArtifactKey[];
  incompleteArtifacts: ArtifactKey[];
  dependencyIssues: Array<{ artifact: ArtifactKey; missingDeps: ArtifactKey[] }>;
  coverageGaps: Array<{ type: string; description: string; severity: "blocking" | "warning" | "info" }>;
  pageCoverage?: {
    totalPages: number;
    coveredPages: number;
    uncoveredPages: string[];
    functionGaps: string[];
    uncoveredFeatures: string[];
    coveragePercent?: number;
    meetsThreshold?: boolean;
  };
  competitorResearch?: {
    exists: boolean;
    completeness: "missing" | "empty" | "shallow" | "adequate" | "comprehensive";
    competitorCount: number;
    featureComparisonCount: number;
    hasEvidence: boolean;
    issues: string[];
  };
  ready: boolean;
  summary: string;
}

/**
 * Configuration for coverage thresholds
 */
export interface CoverageThresholdConfig {
  /** Minimum page coverage percentage required (0-100). Default: 80 */
  pageCoveragePercent: number;
  /** Minimum competitors analyzed. Default: 2 */
  minCompetitors: number;
  /** Minimum feature comparisons per competitor. Default: 3 */
  minFeatureComparisons: number;
  /** Minimum content density (chars per section). Default: 200 */
  minContentDensity: number;
  /** Treat coverage gaps as blocking. Default: false */
  coverageGapsBlocking: boolean;
}

export interface TemplateGapContext {
  projectType?: ProjectType;
  clauseText: string;
  existingFiles: Set<string>;
}

export function inferProjectType(interviewTrack?: unknown): ProjectType {
  if (typeof interviewTrack !== "string") {
    return "web";
  }

  const normalizedTrack = interviewTrack.toLowerCase();
  return normalizedTrack === "api" || normalizedTrack === "cli" ? normalizedTrack : "web";
}

export function detectTemplateGaps(context: TemplateGapContext): string[] {
  const normalizedTrack = inferProjectType(context.projectType);
  const clauseText = context.clauseText.toLowerCase();
  const existingFiles = context.existingFiles;
  const gaps: string[] = [];

  const needsUiDocs = /页面|page|route|ui|交互|modal|screen|dashboard/.test(clauseText);
  if (normalizedTrack !== "cli" && needsUiDocs) {
    if (!existingFiles.has("UIUX.md") && !existingFiles.has("04-设计规范.md")) {
      gaps.push("UIUX/04-设计规范");
    }
    if (!existingFiles.has("PRODUCT-DESIGN.md") && !existingFiles.has("06-页面功能细节.md")) {
      gaps.push("PRODUCT-DESIGN/06-页面功能细节");
    }
  }

  const needsApiDocs = /api|接口|endpoint|request|response/.test(clauseText);
  if (normalizedTrack !== "cli" && needsApiDocs && !existingFiles.has("03-接口文档.md")) {
    gaps.push("03-接口文档");
  }

  const needsDbDocs = /database|数据库|table|schema|migration|index|query/.test(clauseText);
  if (normalizedTrack !== "cli" && needsDbDocs && !existingFiles.has("07-数据库设计.md")) {
    gaps.push("07-数据库设计");
  }

  const needsIntegrationDocs = /stripe|s3|r2|resend|sendgrid|posthog|mixpanel|oauth|第三方|integration/.test(clauseText);
  if (needsIntegrationDocs && !existingFiles.has("08-第三方服务集成.md")) {
    gaps.push("08-第三方服务集成");
  }

  const needsPerfDocs = /performance|性能|latency|p95|throughput|benchmark|lcp|cls/.test(clauseText);
  if (needsPerfDocs && !existingFiles.has("12-性能要求.md")) {
    gaps.push("12-性能要求");
  }

  return [...new Set(gaps)];
}

export const DEFAULT_THRESHOLD_CONFIG: CoverageThresholdConfig = {
  pageCoveragePercent: 80,
  minCompetitors: 2,
  minFeatureComparisons: 3,
  minContentDensity: 200,
  coverageGapsBlocking: false,
};

type RelevantArtifactDefinition = (typeof UPSTREAM_ARTIFACTS)[ArtifactKey];

const SPEC_DIR = ".spec";

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
 * Check if a file exists
 */
async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract section headers from markdown content
 */
function extractSections(content: string): string[] {
  const sectionPattern = /^#{1,3}\s+(.+)$/gm;
  const sections: string[] = [];
  const matches = content.matchAll(sectionPattern);
  for (const match of matches) {
    sections.push(match[1].trim());
  }
  return sections;
}

/**
 * Check for bare placeholders in content
 */
function checkPlaceholders(content: string): { count: number; examples: string[] } {
  const barePlaceholderPattern = /\[(?!NEEDS CLARIFICATION)[A-Z][A-Za-z\s]+\]/g;
  const matches = content.match(barePlaceholderPattern) || [];
  return {
    count: matches.length,
    examples: [...new Set(matches)].slice(0, 5),
  };
}

function calculateContentDensity(content: string): number {
  const sections = extractSections(content);
  if (sections.length === 0) return 0;
  
  const lines = content.split("\n");
  const sectionContents: string[] = [];
  let currentContent = "";
  
  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      if (currentContent.trim().length > 0) {
        sectionContents.push(currentContent.trim());
      }
      currentContent = "";
    } else {
      currentContent += line + "\n";
    }
  }
  if (currentContent.trim().length > 0) {
    sectionContents.push(currentContent.trim());
  }
  
  if (sectionContents.length === 0) return 0;
  
  const totalChars = sectionContents.reduce((sum, s) => sum + s.length, 0);
  return totalChars / sectionContents.length;
}

function hasSubstantiveContent(content: string): boolean {
  const substantivePatterns = [
    /\*\*[^*]+\*\:/g,
    /\|[^|]+\|[^|]+\|/g,
    /```[a-z]*\n[\s\S]{50,}?```/g,
    /[-*]\s+.{20,}/g,
    /\d+\.\s+.{20,}/g,
    /(?:https?:\/\/|www\.)[^\s\)]+/g,
  ];
  
  let substantiveCount = 0;
  for (const pattern of substantivePatterns) {
    const matches = content.match(pattern) || [];
    substantiveCount += matches.length;
  }
  
  return substantiveCount >= 5;
}

function checkCompetitorResearchEvidence(content: string | null): {
  competitorCount: number;
  featureComparisonCount: number;
  hasEvidence: boolean;
  issues: string[];
} {
  const result = {
    competitorCount: 0,
    featureComparisonCount: 0,
    hasEvidence: false,
    issues: [] as string[],
  };
  
  if (!content) return result;
  
  const competitorPatterns = [
    /(?:competitor|竞品|对手)\s*[:：#]?\s*([^\n]+)/gi,
    /(?:vs\.?|versus|对比)\s+([A-Z][A-Za-z]+)/g,
    /^#+\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s*$/gm,
  ];
  
  const competitors = new Set<string>();
  for (const pattern of competitorPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const name = match[1]?.trim();
      if (name && name.length > 2 && name.length < 50 && !/^(Feature|功能|Analysis|分析|Summary|总结)/i.test(name)) {
        competitors.add(name);
      }
    }
  }
  result.competitorCount = competitors.size;
  
  const comparisonPatterns = [
    /\|[^|]+\|[^|]+\|[^|]+\|/g,
    /(?:feature|功能|特性)\s*(?:comparison|对比|比较)/gi,
    /\*\*[^*]+\*\*\s*[：:]\s*[^\n]{10,}/g,
  ];
  
  for (const pattern of comparisonPatterns) {
    const matches = content.match(pattern) || [];
    result.featureComparisonCount += matches.length;
  }
  
  const evidencePatterns = [
    /(?:https?:\/\/|www\.)[^\s\)]+/g,
    /(?:source|来源|reference|参考|citation|引用)\s*[:：]?\s*[^\n]{5,}/gi,
    /(?:pricing|价格|cost|费用)\s*[:：]?\s*\$?\d+/gi,
    /(?:market share|市场份额|users|用户数)\s*[:：]?\s*[\d,]+/gi,
  ];
  
  let evidenceSignals = 0;
  for (const pattern of evidencePatterns) {
    const matches = content.match(pattern) || [];
    evidenceSignals += matches.length;
  }
  result.hasEvidence = evidenceSignals >= 3;
  
  if (result.competitorCount < 2) {
    result.issues.push(`Only ${result.competitorCount} competitor(s) identified; recommend at least 2`);
  }
  if (result.featureComparisonCount < 3) {
    result.issues.push(`Only ${result.featureComparisonCount} feature comparison(s); recommend at least 3`);
  }
  if (!result.hasEvidence) {
    result.issues.push("Limited evidence signals (URLs, sources, pricing data); add more concrete references");
  }
  
  return result;
}

/**
 * Check artifact completeness
 */
async function checkArtifactCompleteness(
  _artifactKey: ArtifactKey,
  content: string | null,
  config: CoverageThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): Promise<"missing" | "empty" | "incomplete" | "complete"> {
  if (!content) {
    return "missing";
  }

  const trimmed = content.trim();
  if (trimmed.length < 100) {
    return "empty";
  }

  const sections = extractSections(content);
  if (sections.length < 2) {
    return "incomplete";
  }

  const placeholders = checkPlaceholders(content);
  if (placeholders.count > 5) {
    return "incomplete";
  }

  const lines = content.split("\n");
  let emptySectionCount = 0;
  let currentHeading = "";
  let sectionContent = "";

  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      if (currentHeading && sectionContent.trim().length < 20) {
        emptySectionCount++;
      }
      currentHeading = line.replace(/^#+\s+/, "").trim();
      sectionContent = "";
    } else {
      sectionContent += line;
    }
  }

  if (emptySectionCount > 2) {
    return "incomplete";
  }

  const contentDensity = calculateContentDensity(content);
  if (contentDensity < config.minContentDensity * 0.5) {
    return "incomplete";
  }

  if (!hasSubstantiveContent(content)) {
    return "incomplete";
  }

  return "complete";
}

/**
 * Extract page references from markdown content
 */
function extractPageRefs(content: string): Set<string> {
  const pagePatterns = [
    /(?:page|页面|screen|屏幕)\s*[：:]\s*([^\n]+)/gi,
    /(?:route|路由|path|路径)\s*[：:]\s*[`'"]?([^\n`'"]+)[`'"]?/gi,
    /\[\[([^\]]+(?:page|页面)[^\]]*)\]\]/gi,
    /##\s+(?:Page|页面)\s*[:：]?\s*([^\n]+)/gi,
  ];

  const pages = new Set<string>();

  for (const pattern of pagePatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const pageRef = match[1].trim();
      if (pageRef.length > 0 && pageRef.length < 100) {
        pages.add(pageRef);
      }
    }
  }

  return pages;
}

/**
 * Extract function/feature references from markdown content
 */
function extractFunctionRefs(content: string): Set<string> {
  const functionPatterns = [
    /(?:function|功能|feature|特性)\s*[：:]\s*([^\n]+)/gi,
    /(?:US-\d+|AC-\d+(?:\.\d+)?)/gi,
  ];

  const functions = new Set<string>();

  for (const pattern of functionPatterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const funcRef = match[0].trim();
      if (funcRef.length > 0 && funcRef.length < 100) {
        functions.add(funcRef);
      }
    }
  }

  return functions;
}

/**
 * Read and parse page coverage JSON
 */
async function readPageCoverage(): Promise<PageCoverageData | null> {
  const coveragePath = path.join(SPEC_DIR, UPSTREAM_ARTIFACTS.PAGE_COVERAGE.filename);
  const content = await readFileSafe(coveragePath);
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content) as PageCoverageData;
  } catch {
    return null;
  }
}

/**
 * Check artifact existence and completeness
 */
export async function checkArtifactStatus(
  artifactKey: ArtifactKey,
  specDir: string = SPEC_DIR,
  config: CoverageThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): Promise<ArtifactStatus> {
  const artifact = UPSTREAM_ARTIFACTS[artifactKey];
  const artifactPath = path.join(specDir, artifact.filename);
  const content = await readFileSafe(artifactPath);
  const exists = content !== null;
  const completeness = await checkArtifactCompleteness(artifactKey, content, config);

  const issues: string[] = [];

  if (!exists) {
    issues.push(`${artifact.displayName} not found at ${artifactPath}`);
  } else if (completeness === "empty") {
    issues.push(`${artifact.displayName} exists but is empty or too short`);
  } else if (completeness === "incomplete") {
    issues.push(`${artifact.displayName} has incomplete sections or too many placeholders`);
    
    const density = calculateContentDensity(content);
    if (density < config.minContentDensity * 0.5) {
      issues.push(`Low content density (${Math.round(density)} chars/section vs recommended ${config.minContentDensity})`);
    }
    if (!hasSubstantiveContent(content)) {
      issues.push("Missing substantive content (tables, code blocks, detailed lists, or URLs)");
    }
  }

  return {
    key: artifactKey,
    exists,
    path: artifactPath,
    completeness,
    issues,
    dependencies: [...artifact.dependsOn] as ArtifactKey[],
    dependents: Object.entries(UPSTREAM_ARTIFACTS)
      .filter(([_, def]) => (def.dependsOn as readonly ArtifactKey[]).includes(artifactKey))
      .map(([key]) => key as ArtifactKey),
  };
}

/**
 * Validate the artifact dependency chain
 */
export async function validateArtifactChain(
  projectType: ProjectType,
  specDir: string = SPEC_DIR
): Promise<Array<{ artifact: ArtifactKey; missingDeps: ArtifactKey[] }>> {
  const issues: Array<{ artifact: ArtifactKey; missingDeps: ArtifactKey[] }> = [];

  // Get artifacts relevant to this project type
  const relevantArtifacts = Object.entries(UPSTREAM_ARTIFACTS)
    .filter(([_, def]) => def.requiredFor.includes(projectType))
    .map(([key]) => key as ArtifactKey);

  for (const artifactKey of relevantArtifacts) {
    const artifact = UPSTREAM_ARTIFACTS[artifactKey];
    const missingDeps: ArtifactKey[] = [];

    for (const depKey of artifact.dependsOn as readonly ArtifactKey[]) {
      const depPath = path.join(specDir, UPSTREAM_ARTIFACTS[depKey].filename);
      const exists = await pathExists(depPath);
      if (!exists) {
        missingDeps.push(depKey);
      }
    }

    if (missingDeps.length > 0) {
      issues.push({ artifact: artifactKey, missingDeps });
    }
  }

  return issues;
}

/**
 * Cross-validate page coverage between PRODUCT-DESIGN and PRD/SPEC
 */
export async function validatePageCoverage(
  specDir: string = SPEC_DIR,
  config: CoverageThresholdConfig = DEFAULT_THRESHOLD_CONFIG
): Promise<{
  totalPages: number;
  coveredPages: number;
  uncoveredPages: string[];
  functionGaps: string[];
  uncoveredFeatures: string[];
  coveragePercent: number;
  meetsThreshold: boolean;
}> {
  const productDesignPath = path.join(specDir, UPSTREAM_ARTIFACTS.PRODUCT_DESIGN.filename);
  const prdPath = path.join(specDir, UPSTREAM_ARTIFACTS.PRD.filename);
  const specPath = path.join(specDir, "SPEC.md");

  const [productDesignContent, prdContent, specContent] = await Promise.all([
    readFileSafe(productDesignPath),
    readFileSafe(prdPath),
    readFileSafe(specPath),
  ]);

  const productDesignPages = productDesignContent ? extractPageRefs(productDesignContent) : new Set<string>();
  const prdPages = prdContent ? extractPageRefs(prdContent) : new Set<string>();
  const specPages = specContent ? extractPageRefs(specContent) : new Set<string>();

  const uncoveredPages: string[] = [];
  for (const page of productDesignPages) {
    const isCovered = [...prdPages].some((p) => p.includes(page) || page.includes(p)) ||
      [...specPages].some((p) => p.includes(page) || page.includes(p));
    if (!isCovered) {
      uncoveredPages.push(page);
    }
  }

  const productDesignFunctions = productDesignContent
    ? extractFunctionRefs(productDesignContent)
    : new Set<string>();
  const specFunctions = specContent ? extractFunctionRefs(specContent) : new Set<string>();

  const functionGaps: string[] = [];
  for (const func of productDesignFunctions) {
    if (func.startsWith("US-") || func.startsWith("AC-")) {
      if (!specFunctions.has(func)) {
        functionGaps.push(func);
      }
    }
  }

  const pageCoverageData = await readPageCoverage();
  const uncoveredFeatures = pageCoverageData?.uncoveredFeatures ?? [];

  const totalPages = productDesignPages.size;
  const coveredPages = totalPages - uncoveredPages.length;
  const coveragePercent = totalPages > 0 ? Math.round((coveredPages / totalPages) * 100) : 0;
  const meetsThreshold = coveragePercent >= config.pageCoveragePercent;

  return {
    totalPages,
    coveredPages,
    uncoveredPages,
    functionGaps,
    uncoveredFeatures,
    coveragePercent,
    meetsThreshold,
  };
}

/**
 * Generate a comprehensive artifact coverage report
 */
export async function generateArtifactCoverageReport(
  projectType: ProjectType = "web",
  specDir: string = SPEC_DIR
): Promise<ArtifactCoverageReport> {
  const artifacts: ArtifactStatus[] = [];
  const missingArtifacts: ArtifactKey[] = [];
  const incompleteArtifacts: ArtifactKey[] = [];

  // Check all relevant artifacts
  for (const [key, def] of Object.entries(UPSTREAM_ARTIFACTS)) {
    const isRelevant = def.requiredFor.includes(projectType);
    if (!isRelevant && projectType !== "web") {
      continue;
    }

    const status = await checkArtifactStatus(key as ArtifactKey, specDir);
    artifacts.push(status);

    if (status.completeness === "missing") {
      missingArtifacts.push(key as ArtifactKey);
    } else if (status.completeness === "empty" || status.completeness === "incomplete") {
      incompleteArtifacts.push(key as ArtifactKey);
    }
  }

  // Validate dependency chain
  const dependencyIssues = await validateArtifactChain(projectType, specDir);

  // Coverage gaps
  const coverageGaps: Array<{ type: string; description: string; severity: "blocking" | "warning" | "info" }> = [];

  // Check page coverage for web projects
  let pageCoverage: ArtifactCoverageReport["pageCoverage"];
  let competitorResearch: ArtifactCoverageReport["competitorResearch"];
  if (projectType === "web") {
    const pageValidation = await validatePageCoverage(specDir);
    pageCoverage = pageValidation;

    if (!pageValidation.meetsThreshold) {
      coverageGaps.push({
        type: "page-coverage-threshold",
        description: `Page coverage is ${pageValidation.coveragePercent}% (minimum ${DEFAULT_THRESHOLD_CONFIG.pageCoveragePercent}% required)`,
        severity: "blocking",
      });
    }

    if (pageValidation.uncoveredPages.length > 0) {
      coverageGaps.push({
        type: "page-coverage",
        description: `Pages in PRODUCT-DESIGN not referenced in PRD/SPEC: ${pageValidation.uncoveredPages.slice(0, 5).join(", ")}`,
        severity: "warning",
      });
    }

    if (pageValidation.functionGaps.length > 0) {
      coverageGaps.push({
        type: "function-coverage",
        description: `Functions in PRODUCT-DESIGN missing from SPEC: ${pageValidation.functionGaps.slice(0, 5).join(", ")}`,
        severity: "warning",
      });
    }

    if (pageValidation.uncoveredFeatures.length > 0) {
      coverageGaps.push({
        type: "feature-coverage",
        description: `Features declared as uncovered in .page-coverage.json: ${pageValidation.uncoveredFeatures.slice(0, 5).join(", ")}`,
        severity: "blocking",
      });
    }
  }

  if (projectType === "web" || projectType === "api") {
    const competitorPath = path.join(specDir, UPSTREAM_ARTIFACTS.COMPETITOR_RESEARCH.filename);
    const competitorContent = await readFileSafe(competitorPath);
    const competitorEvidence = checkCompetitorResearchEvidence(competitorContent);
    competitorResearch = {
      exists: competitorContent !== null,
      completeness: !competitorContent
        ? "missing"
        : competitorEvidence.competitorCount >= DEFAULT_THRESHOLD_CONFIG.minCompetitors
          && competitorEvidence.featureComparisonCount >= DEFAULT_THRESHOLD_CONFIG.minFeatureComparisons
          && competitorEvidence.hasEvidence
          ? "comprehensive"
          : competitorEvidence.competitorCount > 0
            ? "shallow"
            : "empty",
      competitorCount: competitorEvidence.competitorCount,
      featureComparisonCount: competitorEvidence.featureComparisonCount,
      hasEvidence: competitorEvidence.hasEvidence,
      issues: competitorEvidence.issues,
    };

    if (competitorResearch.exists && competitorResearch.completeness !== "comprehensive") {
      coverageGaps.push({
        type: "competitor-research",
        description: competitorEvidence.issues.join("; "),
        severity: "warning",
      });
    }
  }

  // Check page-coverage.json if it exists
  const pageCoverageData = await readPageCoverage();
  if (pageCoverageData) {
    const pendingPages = pageCoverageData.pages.filter((p) => p.status === "pending");
    if (pendingPages.length > 0) {
      coverageGaps.push({
        type: "page-status",
        description: `${pendingPages.length} pages still pending in .page-coverage.json`,
        severity: "info",
      });
    }
  }

  // Determine readiness
  const hasBlockingIssues = missingArtifacts.length > 0 ||
    dependencyIssues.length > 0 ||
    coverageGaps.some((g) => g.severity === "blocking");

  // Generate summary
  const summary = hasBlockingIssues
    ? `Artifact chain incomplete: ${missingArtifacts.length} missing, ${dependencyIssues.length} dependency issues`
    : incompleteArtifacts.length > 0
      ? `Artifact chain ready but ${incompleteArtifacts.length} artifact(s) need completion`
      : `All ${artifacts.length} artifacts present and complete`;

  return {
    artifacts,
    missingArtifacts,
    incompleteArtifacts,
    dependencyIssues,
    coverageGaps,
    pageCoverage,
    competitorResearch,
    ready: !hasBlockingIssues,
    summary,
  };
}

/**
 * Convert artifact coverage issues to SpecReviewIssue format
 */
export function artifactIssuesToReviewIssues(
  report: ArtifactCoverageReport
): SpecReviewIssue[] {
  const issues: SpecReviewIssue[] = [];

  // Missing artifacts
  for (const key of report.missingArtifacts) {
    const artifact = UPSTREAM_ARTIFACTS[key];
    const isRequired = artifact.requiredFor.includes("web");

    issues.push({
      severity: isRequired ? "blocking" : "warning",
      category: "completeness",
      description: `Missing upstream artifact: ${artifact.displayName} (${artifact.filename})`,
      suggestion: `Create ${artifact.filename} in .spec/ directory before proceeding to implementation`,
    });
  }

  // Incomplete artifacts
  for (const key of report.incompleteArtifacts) {
    const artifact = UPSTREAM_ARTIFACTS[key];
    issues.push({
      severity: "warning",
      category: "completeness",
      description: `Incomplete artifact: ${artifact.displayName} has empty sections or placeholders`,
      suggestion: `Review and complete all sections in ${artifact.filename}`,
    });
  }

  // Dependency issues
  for (const issue of report.dependencyIssues) {
    const artifact = UPSTREAM_ARTIFACTS[issue.artifact];
    const missingNames = issue.missingDeps.map((k) => UPSTREAM_ARTIFACTS[k].displayName).join(", ");

    issues.push({
      severity: "blocking",
      category: "reference",
      description: `${artifact.displayName} depends on missing artifacts: ${missingNames}`,
      suggestion: `Generate dependency artifacts first before creating ${artifact.filename}`,
    });
  }

  // Coverage gaps
  for (const gap of report.coverageGaps) {
    issues.push({
      severity: gap.severity,
      category: "completeness",
      description: gap.description,
      suggestion: gap.type === "page-coverage"
        ? "Add page references to PRD or SPEC to ensure traceability"
        : gap.type === "function-coverage"
          ? "Add missing US/AC clauses to SPEC.md"
          : "Review and update page coverage status",
    });
  }

  return issues;
}

/**
 * Pre-flight check for artifact chain readiness
 */
export async function artifactPreflightCheck(
  projectType: ProjectType = "web",
  specDir: string = SPEC_DIR
): Promise<{
  ready: boolean;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}> {
  const checks: Array<{ name: string; passed: boolean; message: string }> = [];

  // Check PRD exists
  const prdStatus = await checkArtifactStatus("PRD", specDir);
  checks.push({
    name: "PRD exists",
    passed: prdStatus.exists,
    message: prdStatus.exists
      ? `PRD.md found with ${prdStatus.completeness} status`
      : "PRD.md not found - required for all project types",
  });

  // Check Architecture exists
  const archStatus = await checkArtifactStatus("ARCHITECTURE", specDir);
  checks.push({
    name: "Architecture exists",
    passed: archStatus.exists,
    message: archStatus.exists
      ? `ARCHITECTURE.md found with ${archStatus.completeness} status`
      : "ARCHITECTURE.md not found - required for technical planning",
  });

  // Check web-specific artifacts
  if (projectType === "web") {
    const uiuxStatus = await checkArtifactStatus("UIUX", specDir);
    checks.push({
      name: "UI/UX Design exists",
      passed: uiuxStatus.exists,
      message: uiuxStatus.exists
        ? `UIUX.md found with ${uiuxStatus.completeness} status`
        : "UIUX.md not found - required for web projects",
    });

    const productDesignStatus = await checkArtifactStatus("PRODUCT_DESIGN", specDir);
    checks.push({
      name: "Product Design exists",
      passed: productDesignStatus.exists,
      message: productDesignStatus.exists
        ? `PRODUCT-DESIGN.md found with ${productDesignStatus.completeness} status`
        : "PRODUCT-DESIGN.md not found - required for detailed implementation",
    });
  }

  // Check dependency chain
  const dependencyIssues = await validateArtifactChain(projectType, specDir);
  checks.push({
    name: "Dependency chain valid",
    passed: dependencyIssues.length === 0,
    message: dependencyIssues.length === 0
      ? "All artifact dependencies satisfied"
      : `${dependencyIssues.length} artifact(s) have missing dependencies`,
  });

  // Check page coverage for web
  if (projectType === "web") {
    const pageValidation = await validatePageCoverage(specDir);
    checks.push({
      name: "Page coverage validated",
      passed: pageValidation.uncoveredPages.length === 0 && pageValidation.meetsThreshold,
      message: pageValidation.uncoveredPages.length === 0 && pageValidation.meetsThreshold
        ? `All ${pageValidation.totalPages} pages are referenced in PRD/SPEC with ${pageValidation.coveragePercent}% coverage`
        : `${pageValidation.uncoveredPages.length} pages not referenced in PRD/SPEC or coverage below threshold (${pageValidation.coveragePercent}%)`,
    });

    checks.push({
      name: "Feature coverage gaps resolved",
      passed: pageValidation.uncoveredFeatures.length === 0,
      message: pageValidation.uncoveredFeatures.length === 0
        ? "All product-design features are mapped to pages"
        : `${pageValidation.uncoveredFeatures.length} uncovered feature(s) remain in .page-coverage.json`,
    });
  }

  if (projectType === "web" || projectType === "api") {
    const competitorContent = await readFileSafe(path.join(specDir, UPSTREAM_ARTIFACTS.COMPETITOR_RESEARCH.filename));
    const competitorEvidence = checkCompetitorResearchEvidence(competitorContent);
    checks.push({
      name: "Competitor research evidence",
      passed: competitorEvidence.competitorCount >= DEFAULT_THRESHOLD_CONFIG.minCompetitors && competitorEvidence.hasEvidence,
      message: competitorEvidence.competitorCount >= DEFAULT_THRESHOLD_CONFIG.minCompetitors && competitorEvidence.hasEvidence
        ? `Competitor research includes ${competitorEvidence.competitorCount} competitors with evidence`
        : `Competitor research is shallow: ${competitorEvidence.issues.join("; ") || "missing evidence"}`,
    });
  }

  return {
    ready: checks.every((c) => c.passed),
    checks,
  };
}
