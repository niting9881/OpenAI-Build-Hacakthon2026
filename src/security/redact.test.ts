import { describe, expect, it } from "vitest";
import { redactSensitive } from "./redact";

describe("redactSensitive", () => {
  it("redacts nested secrets without changing safe fields", () => {
    expect(redactSensitive({
      incidentId: "INC-1042",
      authorization: "Bearer private",
      nested: { api_key: "private", status: "ok" },
      values: [{ password: "private", source: "databricks" }]
    })).toEqual({
      incidentId: "INC-1042",
      authorization: "[REDACTED]",
      nested: { api_key: "[REDACTED]", status: "ok" },
      values: [{ password: "[REDACTED]", source: "databricks" }]
    });
  });
});
