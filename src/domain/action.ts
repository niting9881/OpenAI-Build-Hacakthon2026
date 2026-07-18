import { z } from "zod";

export const RemediationActionSchema = z.object({
  actionId: z.string().regex(/^ACT-[A-Z0-9]{8}$/),
  toolName: z.literal("restore_sandbox_iam_permission"),
  targetResource: z.literal("customer360-production-role"),
  arguments: z.object({ action: z.literal("s3:GetObject"), resource: z.literal("s3://customer360-input/landing/*") }).strict(),
  expectedResult: z.string().min(10),
  risk: z.literal("medium"),
  preconditions: z.array(z.string()).min(1),
  rollback: z.string().min(10),
  verificationSteps: z.array(z.string()).min(2),
  expiresAt: z.string().datetime(),
  actionHash: z.string().regex(/^[a-f0-9]{64}$/)
}).strict();

export const ApprovalRequestSchema = z.object({
  investigationId: z.string().regex(/^INV-[A-Z0-9]{8}$/),
  actionHash: z.string().regex(/^[a-f0-9]{64}$/),
  decision: z.enum(["approved", "rejected"])
}).strict();

export const ActionOutcomeSchema = z.object({
  executionId: z.string().regex(/^EXE-[A-Z0-9]{8}$/),
  status: z.enum(["resolved", "rejected", "unresolved"]),
  permissionRestored: z.boolean(),
  s3AccessVerified: z.boolean(),
  jobRetryStatus: z.enum(["SUCCESS", "FAILED", "NOT_RUN"]),
  executedAt: z.string().datetime(),
  message: z.string()
}).strict();

export type RemediationAction = z.infer<typeof RemediationActionSchema>;
export type ActionOutcome = z.infer<typeof ActionOutcomeSchema>;
