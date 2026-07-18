import type { Incident } from "@/domain/investigation";
import type { Evidence, InvestigationTask } from "@/domain/evidence";
import { StageThreeResultSchema, type PlannedToolCall } from "@/domain/reasoning";
import type { ReasoningProvider } from "@/reasoning/provider";
import { createStageTwoRegistry } from "./deterministic-investigation";
import type { ToolRegistry } from "@/tools/tool-registry";

const MAX_TOOL_CALLS = 12;
const MAX_ADAPTIVE_REVISIONS = 2;

function callKey(call: PlannedToolCall) {
  return call.toolName;
}

function validateCitations(evidence: Evidence[], ids: string[]) {
  const available = new Set(evidence.map((item) => item.evidenceId));
  const unsupported = ids.filter((id) => !available.has(id));
  if (unsupported.length) throw new Error(`Unsupported evidence citation: ${unsupported.join(", ")}`);
}

export async function runAdaptiveInvestigation(
  investigationId: string,
  incident: Incident,
  provider: ReasoningProvider,
  registry: ToolRegistry = createStageTwoRegistry()
) {
  const availableTools = registry.list();
  const allowlistedNames = new Set(availableTools.map((tool) => tool.name));
  const plan = await provider.createPlan(incident, availableTools);
  const evidence: Evidence[] = [];
  const usedCalls = new Set<string>();
  const taskMap = new Map<string, InvestigationTask>();

  for (const task of plan.tasks) {
    taskMap.set(task.taskId, {
      taskId: task.taskId, label: task.label, purpose: task.purpose,
      toolNames: task.toolCalls.map((call) => call.toolName), status: "pending", evidenceCount: 0
    });
  }

  async function executeCalls(calls: PlannedToolCall[]) {
    if (usedCalls.size + calls.length > MAX_TOOL_CALLS) throw new Error("Agent tool-call limit exceeded.");
    const unique = calls.filter((call) => !usedCalls.has(callKey(call)));
    const results = await Promise.all(unique.map(async (call) => {
      if (!allowlistedNames.has(call.toolName)) throw new Error(`Model requested a non-allowlisted tool: ${call.toolName}`);
      usedCalls.add(callKey(call));
      const items = await registry.execute(call.toolName, call.arguments, {
        investigationId, incidentId: incident.id, taskId: call.taskId
      });
      return { call, items };
    }));
    for (const { call, items } of results) {
      for (const item of items) {
        if (evidence.some((existing) => existing.evidenceId === item.evidenceId)) {
          throw new Error(`Duplicate evidence identifier: ${item.evidenceId}`);
        }
        evidence.push(item);
      }
      const task = taskMap.get(call.taskId) ?? {
        taskId: call.taskId, label: "Adaptive follow-up", purpose: "Resolve an evidence gap identified by the reasoning provider.",
        toolNames: [], status: "pending" as const, evidenceCount: 0
      };
      task.toolNames = [...new Set([...task.toolNames, call.toolName])];
      task.evidenceCount += items.length;
      task.status = "completed";
      taskMap.set(call.taskId, task);
    }
  }

  await executeCalls(plan.tasks.flatMap((task) => task.toolCalls));

  const revisions = [];
  for (let iteration = 0; iteration < MAX_ADAPTIVE_REVISIONS; iteration += 1) {
    const assessment = await provider.assessEvidence(incident, plan, evidence, [...usedCalls].map((entry) => entry.split(":", 1)[0]));
    revisions.push(assessment);
    if (assessment.decision === "escalate") throw new Error(`Investigation escalated: ${assessment.rationale}`);
    if (assessment.decision === "synthesize") break;
    if (assessment.followUpCalls.length === 0) throw new Error("Provider requested more evidence without follow-up tool calls.");
    await executeCalls(assessment.followUpCalls);
    if (iteration === MAX_ADAPTIVE_REVISIONS - 1) throw new Error("Adaptive investigation revision limit reached.");
  }

  const synthesis = await provider.synthesize(incident, plan, evidence);
  validateCitations(evidence, synthesis.conclusionEvidenceIds);
  for (const hypothesis of synthesis.hypotheses) {
    validateCitations(evidence, [...hypothesis.supportingEvidenceIds, ...hypothesis.contradictoryEvidenceIds]);
  }
  if (!synthesis.readyForRemediation) throw new Error("Evidence is not sufficient for remediation planning.");

  for (const task of taskMap.values()) {
    if (task.status === "pending" && task.toolNames.length === 0) task.status = "completed";
  }

  return StageThreeResultSchema.parse({
    providerMode: provider.mode,
    model: provider.model,
    plan,
    revisions,
    tasks: [...taskMap.values()],
    evidence,
    synthesis,
    state: "PROPOSING_ACTION",
    completedAt: new Date().toISOString()
  });
}
