import { describe, expect, it } from "vitest";
import { runDeterministicInvestigation } from "./deterministic-investigation";

describe("deterministic Stage 2 investigation", () => {
  it("collects eight unique observations across five sources", async () => {
    const result = await runDeterministicInvestigation("INV-STAGE2", "INC-1042");
    expect(result.state).toBe("SYNTHESIZING");
    expect(result.evidence).toHaveLength(8);
    expect(new Set(result.evidence.map((item) => item.evidenceId)).size).toBe(8);
    expect(new Set(result.evidence.map((item) => item.sourceSystem)).size).toBe(5);
    expect(result.tasks.every((task) => task.status === "completed")).toBe(true);
  });

  it("preserves source references and task relationships", async () => {
    const result = await runDeterministicInvestigation("INV-STAGE2", "INC-1042");
    expect(result.evidence.every((item) => item.rawReference.length > 0)).toBe(true);
    expect(result.evidence.every((item) => item.relatedTaskId.startsWith("TASK-"))).toBe(true);
    expect(result.evidence.find((item) => item.evidenceId === "E-05")?.attributes.removedAction).toBe("s3:GetObject");
  });
});
