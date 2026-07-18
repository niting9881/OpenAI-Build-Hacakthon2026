import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, IncidentSchema, StartInvestigationSchema } from "./investigation";

describe("investigation state machine", () => {
  it("allows the secure golden-path transitions", () => {
    expect(canTransition("INTAKE", "PLANNING")).toBe(true);
    expect(canTransition("AWAITING_APPROVAL", "EXECUTING")).toBe(true);
    expect(canTransition("VERIFYING", "RESOLVED")).toBe(true);
  });

  it("denies direct or backward privilege transitions", () => {
    expect(canTransition("INTAKE", "EXECUTING")).toBe(false);
    expect(canTransition("PLANNING", "RESOLVED")).toBe(false);
    expect(() => assertTransition("AWAITING_APPROVAL", "RESOLVED")).toThrow("Forbidden investigation transition");
  });

  it("keeps terminal states terminal", () => {
    expect(canTransition("RESOLVED", "GATHERING")).toBe(false);
    expect(canTransition("ESCALATED", "PLANNING")).toBe(false);
  });
});

describe("input schemas", () => {
  it("rejects invalid and over-posted investigation requests", () => {
    expect(StartInvestigationSchema.safeParse({ incidentId: "wrong" }).success).toBe(false);
    expect(StartInvestigationSchema.safeParse({ incidentId: "INC-1042", state: "EXECUTING" }).success).toBe(false);
  });

  it("limits untrusted incident fields", () => {
    expect(IncidentSchema.safeParse({ id: "INC-1042" }).success).toBe(false);
  });
});
