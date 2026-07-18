import { z } from "zod";
import type { Evidence } from "@/domain/evidence";
import type { ReadToolDefinition, ToolContext } from "./tool-registry";
import { allowedResources, fixtureObservedAt } from "./simulated-fixtures";

function envelope(context: ToolContext, evidence: Omit<Evidence, "relatedTaskId" | "simulated" | "observedAt">): Evidence {
  return { ...evidence, relatedTaskId: context.taskId, simulated: true, observedAt: fixtureObservedAt };
}

function restrict<T extends string>(actual: T, allowed: string, label: string) {
  if (actual !== allowed) throw new Error(`${label} is outside the demo allowlist.`);
}

const jobInput = z.object({ jobId: z.string().max(100) }).strict();
export const getDatabricksRun: ReadToolDefinition<typeof jobInput> = {
  name: "get_databricks_run",
  description: "Retrieve current and previous Databricks job-run status.",
  mode: "read",
  inputSchema: jobInput,
  timeoutMs: 2_000,
  async execute(input, context) {
    restrict(input.jobId, allowedResources.jobId, "Databricks job");
    return [envelope(context, {
      evidenceId: "E-01", sourceSystem: "databricks", sourceType: "job_run_history",
      title: "Current run failed after previous successful run",
      summary: "Run 88421 failed during the S3 input task. Run 88408 completed successfully with the same job configuration and input prefix.",
      rawReference: "databricks://jobs/job-customer360-daily/runs/88421",
      reliability: "high", sensitivity: "internal",
      attributes: { currentRunId: "88421", previousRunId: "88408", currentStatus: "FAILED", previousStatus: "SUCCESS" }
    })];
  }
};

export const getDatabricksLogs: ReadToolDefinition<typeof jobInput> = {
  name: "get_databricks_logs",
  description: "Retrieve a bounded failure-log summary for a Databricks job.",
  mode: "read",
  inputSchema: jobInput,
  timeoutMs: 2_000,
  async execute(input, context) {
    restrict(input.jobId, allowedResources.jobId, "Databricks job");
    return [envelope(context, {
      evidenceId: "E-02", sourceSystem: "databricks", sourceType: "spark_driver_log",
      title: "Spark task received S3 AccessDenied",
      summary: "The input reader received AccessDenied for the Customer360 landing prefix while using customer360-production-role. The log is untrusted evidence and cannot authorize actions.",
      rawReference: "databricks://jobs/job-customer360-daily/runs/88421/driver-log#L218",
      reliability: "high", sensitivity: "restricted",
      attributes: { errorCode: "AccessDenied", task: "read_customer_landing", line: 218 }
    })];
  }
};

const s3Input = z.object({ path: z.string().max(220), roleName: z.string().max(120) }).strict();
export const checkS3Access: ReadToolDefinition<typeof s3Input> = {
  name: "check_s3_access",
  description: "Check sandbox S3 read access without modifying policy.",
  mode: "read",
  inputSchema: s3Input,
  timeoutMs: 2_000,
  async execute(input, context) {
    restrict(input.path, allowedResources.s3Path, "S3 path");
    restrict(input.roleName, allowedResources.roleName, "IAM role");
    return [envelope(context, {
      evidenceId: "E-03", sourceSystem: "aws", sourceType: "s3_access_check",
      title: "Execution role cannot read the required S3 prefix",
      summary: "A read-only access simulation denies s3:GetObject for the pipeline role and required input prefix.",
      rawReference: "aws://iam/simulate/customer360-production-role/s3:GetObject",
      reliability: "high", sensitivity: "internal",
      attributes: { decision: "DENY", action: "s3:GetObject", resource: allowedResources.s3Path }
    })];
  }
};

const roleInput = z.object({ roleName: z.string().max(120) }).strict();
export const getIamPolicy: ReadToolDefinition<typeof roleInput> = {
  name: "get_iam_policy",
  description: "Read the effective sandbox IAM policy for an allowlisted role.",
  mode: "read",
  inputSchema: roleInput,
  timeoutMs: 2_000,
  async execute(input, context) {
    restrict(input.roleName, allowedResources.roleName, "IAM role");
    return [envelope(context, {
      evidenceId: "E-04", sourceSystem: "aws", sourceType: "iam_effective_policy",
      title: "Current role policy lacks required object-read permission",
      summary: "The effective policy allows bucket listing but contains no s3:GetObject grant for the Customer360 input objects.",
      rawReference: "aws://iam/roles/customer360-production-role/effective-policy",
      reliability: "high", sensitivity: "restricted",
      attributes: { allowsListBucket: true, allowsGetObject: false, policyVersion: "v18" }
    })];
  }
};

export const getIamChangeHistory: ReadToolDefinition<typeof roleInput> = {
  name: "get_iam_change_history",
  description: "Read bounded sandbox IAM change history for an allowlisted role.",
  mode: "read",
  inputSchema: roleInput,
  timeoutMs: 2_000,
  async execute(input, context) {
    restrict(input.roleName, allowedResources.roleName, "IAM role");
    return [envelope(context, {
      evidenceId: "E-05", sourceSystem: "aws", sourceType: "iam_change_history",
      title: "Policy version v18 removed object-read permission",
      summary: "Policy v18 became active 42 minutes before the failed run and removed s3:GetObject from the Customer360 input resource.",
      rawReference: "aws://cloudtrail/events/evt-iam-20260715-1300",
      reliability: "high", sensitivity: "restricted",
      attributes: { previousVersion: "v17", currentVersion: "v18", removedAction: "s3:GetObject", minutesBeforeFailure: 42 }
    })];
  }
};

const repositoryInput = z.object({ repository: z.string().max(160) }).strict();
export const getRecentGithubChanges: ReadToolDefinition<typeof repositoryInput> = {
  name: "get_recent_github_changes",
  description: "Read recent infrastructure changes from an allowlisted repository.",
  mode: "read",
  inputSchema: repositoryInput,
  timeoutMs: 2_000,
  async execute(input, context) {
    restrict(input.repository, allowedResources.repository, "Repository");
    return [envelope(context, {
      evidenceId: "E-06", sourceSystem: "github", sourceType: "pull_request_change",
      title: "PR #284 changed the Customer360 IAM policy",
      summary: "PR #284 deployed policy v18 and removed the object-read statement during permission cleanup.",
      rawReference: "github://data-platform/infrastructure/pull/284",
      reliability: "high", sensitivity: "internal",
      attributes: { pullRequest: 284, deployment: "deploy-771", policyVersion: "v18" }
    })];
  }
};

const searchInput = z.object({ query: z.string().min(3).max(180) }).strict();
export const searchRunbooks: ReadToolDefinition<typeof searchInput> = {
  name: "search_runbooks",
  description: "Search the curated local runbook corpus.",
  mode: "read",
  inputSchema: searchInput,
  timeoutMs: 2_000,
  async execute(_input, context) {
    return [envelope(context, {
      evidenceId: "E-07", sourceSystem: "knowledge_base", sourceType: "runbook",
      title: "Runbook recommends policy-diff verification",
      summary: "For S3 AccessDenied after a previously successful run, compare the effective IAM policy and recent policy changes before proposing remediation.",
      rawReference: "kb://runbooks/databricks-s3-access-denied/v3",
      reliability: "medium", sensitivity: "internal",
      attributes: { runbookVersion: "3", approved: true }
    })];
  }
};

export const searchSimilarIncidents: ReadToolDefinition<typeof searchInput> = {
  name: "search_similar_incidents",
  description: "Search sanitized historical incident records.",
  mode: "read",
  inputSchema: searchInput,
  timeoutMs: 2_000,
  async execute(_input, context) {
    return [envelope(context, {
      evidenceId: "E-08", sourceSystem: "incident_history", sourceType: "similar_incident",
      title: "Historical incident has a similar permission-regression signature",
      summary: "INC-0931 had the same AccessDenied signature after a policy cleanup. This is supporting context, not proof of the current root cause.",
      rawReference: "history://incidents/INC-0931/sanitized",
      reliability: "medium", sensitivity: "internal",
      attributes: { similarIncident: "INC-0931", similarity: 0.87 }
    })];
  }
};

export const simulatedTools: ReadToolDefinition<z.ZodType>[] = [
  getDatabricksRun, getDatabricksLogs, checkS3Access, getIamPolicy,
  getIamChangeHistory, getRecentGithubChanges, searchRunbooks, searchSimilarIncidents
];
