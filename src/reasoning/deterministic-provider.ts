import type { Incident } from "@/domain/investigation";
import type { Evidence } from "@/domain/evidence";
import {
  AgentPlanSchema,
  EvidenceAssessmentSchema,
  SynthesisSchema,
  type AgentPlan
} from "@/domain/reasoning";
import type { AvailableTool, ReasoningProvider } from "./provider";
import { allowedResources } from "@/tools/simulated-fixtures";

export class DeterministicReasoningProvider implements ReasoningProvider {
  readonly mode = "deterministic" as const;
  readonly model = "gpt-5.6-compatible-test-provider";

  async createPlan(_incident: Incident, tools: AvailableTool[]) {
    const available = new Set(tools.map((tool) => tool.name));
    const requireTool = (name: string) => {
      if (!available.has(name)) throw new Error(`Required read tool is unavailable: ${name}`);
      return name;
    };
    return AgentPlanSchema.parse({
      objective: "Determine why the Customer360 Databricks pipeline lost access to its required S3 input and gather enough evidence for a safe remediation proposal.",
      successCriteria: [
        "Identify the failed task and compare it with the previous successful run.",
        "Verify the current S3 and IAM state and connect any relevant change to the failure.",
        "Support every material conclusion with valid evidence identifiers."
      ],
      stoppingConditions: ["Stop when the failure, effective permission state, and causal change are all supported by evidence.", "Escalate if required read tools fail or evidence remains contradictory."],
      tasks: [
        {
          taskId: "TASK-01", label: "Inspect Databricks execution", purpose: "Compare the failed run and bounded driver log.", dependsOn: [],
          toolCalls: [
            { taskId: "TASK-01", toolName: requireTool("get_databricks_run"), arguments: { jobId: allowedResources.jobId } },
            { taskId: "TASK-01", toolName: requireTool("get_databricks_logs"), arguments: { jobId: allowedResources.jobId } }
          ]
        },
        {
          taskId: "TASK-02", label: "Check current AWS access", purpose: "Verify current S3 and IAM permission state.", dependsOn: ["TASK-01"],
          toolCalls: [
            { taskId: "TASK-02", toolName: requireTool("check_s3_access"), arguments: { path: allowedResources.s3Path, roleName: allowedResources.roleName } },
            { taskId: "TASK-02", toolName: requireTool("get_iam_policy"), arguments: { roleName: allowedResources.roleName } }
          ]
        },
        {
          taskId: "TASK-03", label: "Search operational guidance", purpose: "Find approved guidance and relevant historical context.", dependsOn: [],
          toolCalls: [
            { taskId: "TASK-03", toolName: requireTool("search_runbooks"), arguments: { query: "Databricks S3 AccessDenied after successful run" } },
            { taskId: "TASK-03", toolName: requireTool("search_similar_incidents"), arguments: { query: "Customer360 S3 AccessDenied IAM policy" } }
          ]
        }
      ]
    });
  }

  async assessEvidence(_incident: Incident, _plan: AgentPlan, evidence: Evidence[], usedTools: string[]) {
    const ids = new Set(evidence.map((item) => item.evidenceId));
    if (!ids.has("E-05") || !ids.has("E-06")) {
      return EvidenceAssessmentSchema.parse({
        decision: "gather_more",
        rationale: "The current evidence proves an access failure and missing permission but does not yet prove which change introduced the regression.",
        missingEvidence: ["IAM policy change history", "Repository change associated with the active policy version"],
        followUpCalls: [
          ...(!usedTools.includes("get_iam_change_history") ? [{ taskId: "TASK-04", toolName: "get_iam_change_history", arguments: { roleName: allowedResources.roleName } }] : []),
          ...(!usedTools.includes("get_recent_github_changes") ? [{ taskId: "TASK-04", toolName: "get_recent_github_changes", arguments: { repository: allowedResources.repository } }] : [])
        ]
      });
    }
    return EvidenceAssessmentSchema.parse({
      decision: "synthesize",
      rationale: "The evidence now connects the failed Databricks read, effective IAM denial, policy version change, and corresponding repository deployment.",
      missingEvidence: [],
      followUpCalls: []
    });
  }

  async synthesize(_incident: Incident, _plan: AgentPlan, evidence: Evidence[]) {
    const ids = new Set(evidence.map((item) => item.evidenceId));
    for (const required of ["E-02", "E-03", "E-04", "E-05", "E-06"]) {
      if (!ids.has(required)) throw new Error(`Cannot synthesize without required evidence: ${required}`);
    }
    return SynthesisSchema.parse({
      hypotheses: [
        {
          rank: 1,
          hypothesis: "IAM policy version v18 removed s3:GetObject from the Customer360 execution role, causing the Databricks S3 read failure.",
          confidence: "high",
          confidenceRationale: "The failure, effective denial, policy history, and deployed repository change form a consistent causal chain.",
          supportingEvidenceIds: ["E-02", "E-03", "E-04", "E-05", "E-06"],
          contradictoryEvidenceIds: [], missingEvidence: []
        },
        {
          rank: 2,
          hypothesis: "The input object or S3 path changed independently of IAM policy.",
          confidence: "low",
          confidenceRationale: "The current and previous runs use the same input prefix, while a directly relevant IAM change occurred before failure.",
          supportingEvidenceIds: ["E-02"], contradictoryEvidenceIds: ["E-01", "E-05"], missingEvidence: []
        }
      ],
      conclusion: "The Customer360 pipeline failed because IAM policy v18 removed s3:GetObject from the execution role for the required S3 input objects.",
      conclusionEvidenceIds: ["E-02", "E-03", "E-04", "E-05", "E-06"],
      readyForRemediation: true
    });
  }
}
