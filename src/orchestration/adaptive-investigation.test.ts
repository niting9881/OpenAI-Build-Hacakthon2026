import { describe, expect, it } from "vitest";
import { customer360Incident } from "@/domain/fixtures";
import { AgentPlanSchema, EvidenceAssessmentSchema, SynthesisSchema } from "@/domain/reasoning";
import { DeterministicReasoningProvider } from "@/reasoning/deterministic-provider";
import { runAdaptiveInvestigation } from "./adaptive-investigation";

describe("Stage 3 adaptive investigation", () => {
  it("plans, gathers initial evidence, adapts, and synthesizes valid citations", async () => {
    const result = await runAdaptiveInvestigation("INV-ADAPTIVE", customer360Incident, new DeterministicReasoningProvider());
    expect(result.providerMode).toBe("deterministic");
    expect(result.model).toContain("gpt-5.6");
    expect(result.revisions.map((revision) => revision.decision)).toEqual(["gather_more", "synthesize"]);
    expect(result.evidence).toHaveLength(8);
    expect(result.evidence.some((item) => item.evidenceId === "E-05")).toBe(true);
    expect(result.evidence.some((item) => item.evidenceId === "E-06")).toBe(true);
    expect(result.synthesis.conclusionEvidenceIds.every((id) => result.evidence.some((item) => item.evidenceId === id))).toBe(true);
    expect(result.state).toBe("PROPOSING_ACTION");
  });

  it("rejects a model-requested write or unknown tool", async () => {
    class UnsafeProvider extends DeterministicReasoningProvider {
      async createPlan() {
        return AgentPlanSchema.parse({
          objective: "Attempt an unsafe investigation operation that the application must deny.",
          successCriteria: ["Collect evidence", "Remain secure"], stoppingConditions: ["Stop immediately"],
          tasks: [
            { taskId: "TASK-01", label: "Unsafe action", purpose: "Security test", dependsOn: [], toolCalls: [{ taskId: "TASK-01", toolName: "restore_iam_permission", arguments: { roleName: "customer360-production-role" } }] },
            { taskId: "TASK-02", label: "Safe validation", purpose: "Meet the structured plan contract.", dependsOn: ["TASK-01"], toolCalls: [{ taskId: "TASK-02", toolName: "search_runbooks", arguments: { query: "security validation" } }] }
          ]
        });
      }
    }
    await expect(runAdaptiveInvestigation("INV-UNSAFE", customer360Incident, new UnsafeProvider())).rejects.toThrow("non-allowlisted tool");
  });

  it("rejects fabricated evidence citations", async () => {
    class FabricatingProvider extends DeterministicReasoningProvider {
      async synthesize() {
        return SynthesisSchema.parse({
          hypotheses: [{ rank: 1, hypothesis: "Fabricated conclusion without real evidence.", confidence: "high", confidenceRationale: "This deliberately cites an unavailable identifier.", supportingEvidenceIds: ["E-99"], contradictoryEvidenceIds: [], missingEvidence: [] }],
          conclusion: "This deliberately invalid conclusion cites evidence that the tools never returned.", conclusionEvidenceIds: ["E-99", "E-02"], readyForRemediation: true
        });
      }
    }
    await expect(runAdaptiveInvestigation("INV-CITATION", customer360Incident, new FabricatingProvider())).rejects.toThrow("Unsupported evidence citation");
  });

  it("rejects an empty follow-up and caps adaptive behavior", async () => {
    class EmptyFollowUpProvider extends DeterministicReasoningProvider {
      async assessEvidence() {
        return EvidenceAssessmentSchema.parse({ decision: "gather_more", rationale: "More evidence is required but this invalid provider supplies no bounded tool request.", missingEvidence: ["change history"], followUpCalls: [] });
      }
    }
    await expect(runAdaptiveInvestigation("INV-EMPTY", customer360Incident, new EmptyFollowUpProvider())).rejects.toThrow("without follow-up tool calls");
  });
});
