import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolRegistry } from "./tool-registry";
import { getDatabricksRun } from "./simulated-tools";
import { allowedResources } from "./simulated-fixtures";

const context = { investigationId: "INV-TEST", incidentId: "INC-1042", taskId: "TASK-01" };

describe("ToolRegistry", () => {
  it("executes allowlisted read tools and validates evidence", async () => {
    const registry = new ToolRegistry();
    registry.register(getDatabricksRun);
    const evidence = await registry.execute("get_databricks_run", { jobId: allowedResources.jobId }, context);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ evidenceId: "E-01", sourceSystem: "databricks", simulated: true });
  });

  it("rejects unknown tools, over-posted input, and out-of-scope resources", async () => {
    const registry = new ToolRegistry();
    registry.register(getDatabricksRun);
    await expect(registry.execute("restart_databricks_job", {}, context)).rejects.toThrow("not allowlisted");
    await expect(registry.execute("get_databricks_run", { jobId: allowedResources.jobId, write: true }, context)).rejects.toThrow("Invalid arguments");
    await expect(registry.execute("get_databricks_run", { jobId: "production-admin-job" }, context)).rejects.toThrow("outside the demo allowlist");
  });

  it("rejects slow tools and oversized results", async () => {
    const registry = new ToolRegistry(100);
    registry.register({
      name: "slow", description: "slow test", mode: "read", inputSchema: z.object({}).strict(), timeoutMs: 5,
      async execute() { await new Promise((resolve) => setTimeout(resolve, 20)); return []; }
    });
    await expect(registry.execute("slow", {}, context)).rejects.toThrow("timed out");

    const largeRegistry = new ToolRegistry(200);
    largeRegistry.register(getDatabricksRun);
    await expect(largeRegistry.execute("get_databricks_run", { jobId: allowedResources.jobId }, context)).rejects.toThrow("size limit");
  });

  it("refuses write-mode registration", () => {
    const registry = new ToolRegistry();
    expect(() => registry.register({
      name: "write", description: "invalid", mode: "write" as "read", inputSchema: z.object({}), timeoutMs: 1,
      async execute() { return []; }
    })).toThrow("read-only tools only");
  });
});
