import { createHash } from "node:crypto";
import type { Synthesis } from "@/domain/reasoning";
import { RemediationActionSchema, type RemediationAction } from "@/domain/action";

export function canonicalActionPayload(action: Omit<RemediationAction, "actionHash">) {
  return JSON.stringify({
    actionId: action.actionId, toolName: action.toolName, targetResource: action.targetResource,
    arguments: { action: action.arguments.action, resource: action.arguments.resource },
    expectedResult: action.expectedResult, risk: action.risk, preconditions: action.preconditions,
    rollback: action.rollback, verificationSteps: action.verificationSteps, expiresAt: action.expiresAt
  });
}

export function hashAction(action: Omit<RemediationAction, "actionHash">) {
  return createHash("sha256").update(canonicalActionPayload(action)).digest("hex");
}

export function proposeRemediation(synthesis: Synthesis, now = new Date()) {
  if (!synthesis.readyForRemediation) throw new Error("Synthesis is not ready for remediation.");
  const withoutHash = {
    actionId: `ACT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
    toolName: "restore_sandbox_iam_permission" as const,
    targetResource: "customer360-production-role" as const,
    arguments: { action: "s3:GetObject" as const, resource: "s3://customer360-input/landing/*" as const },
    expectedResult: "Restore object-read access required by the Customer360 pipeline.",
    risk: "medium" as const,
    preconditions: ["Evidence E-05 and E-06 establish the policy regression.", "Target is the allowlisted sandbox role."],
    rollback: "Restore sandbox IAM policy version v18 and mark the incident unresolved.",
    verificationSteps: ["Re-run the sandbox S3 access simulation.", "Retry the Customer360 Databricks job and require SUCCESS."],
    expiresAt: new Date(now.getTime() + 15 * 60_000).toISOString()
  };
  return RemediationActionSchema.parse({ ...withoutHash, actionHash: hashAction(withoutHash) });
}
