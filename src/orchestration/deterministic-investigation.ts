import {
  DeterministicInvestigationResultSchema,
  type Evidence,
  type InvestigationTask
} from "@/domain/evidence";
import { ToolRegistry } from "@/tools/tool-registry";
import { simulatedTools } from "@/tools/simulated-tools";
import { allowedResources } from "@/tools/simulated-fixtures";

type TaskDefinition = Omit<InvestigationTask, "status" | "evidenceCount" | "error"> & {
  calls: Array<{ name: string; input: unknown }>;
};

export const stageTwoTaskDefinitions: TaskDefinition[] = [
  {
    taskId: "TASK-01",
    label: "Inspect Databricks execution",
    purpose: "Compare the failed run with its prior successful run and inspect the bounded error log.",
    toolNames: ["get_databricks_run", "get_databricks_logs"],
    calls: [
      { name: "get_databricks_run", input: { jobId: allowedResources.jobId } },
      { name: "get_databricks_logs", input: { jobId: allowedResources.jobId } }
    ]
  },
  {
    taskId: "TASK-02",
    label: "Check AWS dependencies",
    purpose: "Verify S3 access, effective IAM permissions, and recent policy history.",
    toolNames: ["check_s3_access", "get_iam_policy", "get_iam_change_history"],
    calls: [
      { name: "check_s3_access", input: { path: allowedResources.s3Path, roleName: allowedResources.roleName } },
      { name: "get_iam_policy", input: { roleName: allowedResources.roleName } },
      { name: "get_iam_change_history", input: { roleName: allowedResources.roleName } }
    ]
  },
  {
    taskId: "TASK-03",
    label: "Review changes and guidance",
    purpose: "Find related repository changes, approved runbooks, and sanitized historical incidents.",
    toolNames: ["get_recent_github_changes", "search_runbooks", "search_similar_incidents"],
    calls: [
      { name: "get_recent_github_changes", input: { repository: allowedResources.repository } },
      { name: "search_runbooks", input: { query: "Databricks S3 AccessDenied after successful run" } },
      { name: "search_similar_incidents", input: { query: "Customer360 S3 AccessDenied IAM policy" } }
    ]
  },
  {
    taskId: "TASK-04",
    label: "Prepare evidence for synthesis",
    purpose: "Validate evidence completeness and hand normalized observations to the Stage 3 reasoning layer.",
    toolNames: ["evidence_validation"],
    calls: []
  }
];

export function createStageTwoRegistry() {
  const registry = new ToolRegistry();
  for (const tool of simulatedTools) registry.register(tool);
  return registry;
}

export async function runDeterministicInvestigation(
  investigationId: string,
  incidentId: string,
  registry = createStageTwoRegistry()
) {
  const tasks: InvestigationTask[] = [];
  const evidence: Evidence[] = [];

  for (const definition of stageTwoTaskDefinitions) {
    if (definition.calls.length === 0) {
      tasks.push({
        taskId: definition.taskId,
        label: definition.label,
        purpose: definition.purpose,
        toolNames: definition.toolNames,
        status: evidence.length >= 8 ? "completed" : "failed",
        evidenceCount: 0,
        ...(evidence.length >= 8 ? {} : { error: "Evidence completeness threshold was not met." })
      });
      continue;
    }

    try {
      const results = await Promise.all(definition.calls.map((call) => registry.execute(
        call.name,
        call.input,
        { investigationId, incidentId, taskId: definition.taskId }
      )));
      const taskEvidence = results.flat();
      evidence.push(...taskEvidence);
      tasks.push({
        taskId: definition.taskId,
        label: definition.label,
        purpose: definition.purpose,
        toolNames: definition.toolNames,
        status: "completed",
        evidenceCount: taskEvidence.length
      });
    } catch (error) {
      tasks.push({
        taskId: definition.taskId,
        label: definition.label,
        purpose: definition.purpose,
        toolNames: definition.toolNames,
        status: "failed",
        evidenceCount: 0,
        error: error instanceof Error ? error.message : "Unknown tool failure"
      });
    }
  }

  const result = {
    tasks,
    evidence,
    state: "SYNTHESIZING" as const,
    completedAt: new Date().toISOString()
  };
  return DeterministicInvestigationResultSchema.parse(result);
}
