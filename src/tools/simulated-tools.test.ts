import { describe, expect, it } from "vitest";
import { createStageTwoRegistry } from "@/orchestration/deterministic-investigation";
import { allowedResources } from "./simulated-fixtures";

const context = { investigationId: "INV-TOOLS", incidentId: "INC-1042", taskId: "TASK-02" };

describe("simulated Stage 2 tool contracts", () => {
  it("registers eight read-only tools", () => {
    const tools = createStageTwoRegistry().list();
    expect(tools).toHaveLength(8);
    expect(tools.every((tool) => tool.mode === "read")).toBe(true);
  });

  it("returns normalized AWS evidence", async () => {
    const registry = createStageTwoRegistry();
    const evidence = await registry.execute("check_s3_access", { path: allowedResources.s3Path, roleName: allowedResources.roleName }, context);
    expect(evidence[0]).toMatchObject({ evidenceId: "E-03", sourceSystem: "aws", reliability: "high", sensitivity: "internal" });
  });

  it("treats historical similarity as medium-reliability context", async () => {
    const registry = createStageTwoRegistry();
    const evidence = await registry.execute("search_similar_incidents", { query: "AccessDenied policy regression" }, { ...context, taskId: "TASK-03" });
    expect(evidence[0].reliability).toBe("medium");
    expect(evidence[0].summary).toContain("not proof");
  });
});
