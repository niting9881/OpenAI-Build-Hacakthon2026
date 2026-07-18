import { describe, expect, it } from "vitest";
import { generateDocumentation, sanitizePlainText, type VerifiedRecord } from "./generator";

const record: VerifiedRecord = {
  investigationId: "INV-TEST1234", incident: { id: "INC-1042", title: "Customer pipeline failed", impact: "Profiles delayed", pipeline: "Customer360" },
  evidence: ["E-05", "E-06"].map((evidenceId) => ({ evidenceId, sourceSystem: "aws", sourceType: "policy", observedAt: "2026-07-15T14:00:00.000Z", title: "Permission evidence", summary: "Required access was removed.", rawReference: "aws://sandbox", reliability: "high", sensitivity: "internal", relatedTaskId: "TASK-02", simulated: true, attributes: {} })),
  synthesis: { hypotheses: [{ rank: 1, hypothesis: "IAM regression", confidence: "high", confidenceRationale: "Two independent records agree on the permission regression.", supportingEvidenceIds: ["E-05"], contradictoryEvidenceIds: [], missingEvidence: [] }], conclusion: "The pipeline role lost required S3 object-read access.", conclusionEvidenceIds: ["E-05", "E-06"], readyForRemediation: true },
  outcome: { executionId: "EXE-TEST1234", status: "resolved", permissionRestored: true, s3AccessVerified: true, jobRetryStatus: "SUCCESS", executedAt: "2026-07-15T14:05:00.000Z", message: "Access restored and retry succeeded." }
};

describe("grounded documentation", () => {
  it("generates four drafts using only record evidence citations", () => {
    const bundle = generateDocumentation(record, new Date("2026-07-15T14:06:00.000Z"));
    expect(Object.values(bundle).filter((value) => typeof value === "object")).toHaveLength(4);
    expect(bundle.serviceNow.citations).toEqual(["E-05", "E-06"]);
    expect(bundle.stakeholder.body).not.toContain("IAM");
    expect(bundle.jira.body).toContain("Acceptance criteria");
  });
  it("fails closed without verified recovery", () => expect(() => generateDocumentation({ ...record, outcome: { ...record.outcome, jobRetryStatus: "FAILED" } })).toThrow("verified"));
  it("rejects conclusions whose citations are not present in persisted evidence", () => {
    const unsupported = { ...record, synthesis: { ...record.synthesis, conclusionEvidenceIds: ["E-90", "E-91"] } };
    expect(() => generateDocumentation(unsupported)).toThrow("sufficient cited evidence");
  });
  it("removes markup, unsafe links, keys, tokens, and account identifiers", () => {
    const clean = sanitizePlainText('<script>x</script> https://bad.test sk-abcdefghijklmnop AKIA1234567890ABCDEF 123456789012 token=unsafe');
    expect(clean).not.toMatch(/<|https|sk-|AKIA|123456789012|unsafe/);
  });
});
