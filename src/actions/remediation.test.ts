import { describe, expect, it } from "vitest";
import type { Synthesis } from "@/domain/reasoning";
import { canonicalActionPayload, hashAction, proposeRemediation } from "./remediation";

const synthesis: Synthesis = {
  hypotheses: [{
    rank: 1,
    hypothesis: "An IAM policy regression removed required S3 access.",
    confidence: "high",
    confidenceRationale: "Policy history and denied access identify the same missing permission.",
    supportingEvidenceIds: ["E-05", "E-06"],
    contradictoryEvidenceIds: [],
    missingEvidence: []
  }],
  conclusion: "The pipeline failed because its role lost the required S3 object-read permission.",
  conclusionEvidenceIds: ["E-05", "E-06"],
  readyForRemediation: true
};

describe("remediation proposal", () => {
  it("creates a time-bounded, hash-bound allowlisted action", () => {
    const now = new Date("2026-07-15T14:00:00.000Z");
    const action = proposeRemediation(synthesis, now);

    expect(action.toolName).toBe("restore_sandbox_iam_permission");
    expect(action.targetResource).toBe("customer360-production-role");
    expect(action.expiresAt).toBe("2026-07-15T14:15:00.000Z");
    expect(action.actionHash).toBe(hashAction(action));
  });

  it("produces a stable canonical hash and detects any material change", () => {
    const action = proposeRemediation(synthesis, new Date("2026-07-15T14:00:00.000Z"));
    const payload = { ...action };
    delete (payload as Partial<typeof action>).actionHash;
    const changed = { ...payload, rollback: `${payload.rollback} Changed.` };

    expect(canonicalActionPayload(payload)).toBe(canonicalActionPayload(payload));
    expect(hashAction(payload)).not.toBe(hashAction(changed));
  });

  it("fails closed when the synthesis is not ready", () => {
    expect(() => proposeRemediation({ ...synthesis, readyForRemediation: false })).toThrow("not ready");
  });
});
