import { z } from "zod";

export const investigationStates = [
  "INTAKE",
  "PLANNING",
  "GATHERING",
  "SYNTHESIZING",
  "NEEDS_EVIDENCE",
  "PROPOSING_ACTION",
  "AWAITING_APPROVAL",
  "EXECUTING",
  "VERIFYING",
  "RESOLVED",
  "UNRESOLVED",
  "ESCALATED"
] as const;

export const InvestigationStateSchema = z.enum(investigationStates);
export type InvestigationState = z.infer<typeof InvestigationStateSchema>;

export const allowedTransitions: Record<InvestigationState, readonly InvestigationState[]> = {
  INTAKE: ["PLANNING"],
  PLANNING: ["GATHERING", "ESCALATED"],
  GATHERING: ["SYNTHESIZING", "ESCALATED"],
  SYNTHESIZING: ["NEEDS_EVIDENCE", "PROPOSING_ACTION", "UNRESOLVED", "ESCALATED"],
  NEEDS_EVIDENCE: ["GATHERING", "ESCALATED"],
  PROPOSING_ACTION: ["AWAITING_APPROVAL", "UNRESOLVED", "ESCALATED"],
  AWAITING_APPROVAL: ["EXECUTING", "UNRESOLVED", "ESCALATED"],
  EXECUTING: ["VERIFYING", "UNRESOLVED", "ESCALATED"],
  VERIFYING: ["RESOLVED", "NEEDS_EVIDENCE", "UNRESOLVED", "ESCALATED"],
  RESOLVED: [],
  UNRESOLVED: [],
  ESCALATED: []
};

export function canTransition(from: InvestigationState, to: InvestigationState) {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: InvestigationState, to: InvestigationState) {
  if (!canTransition(from, to)) {
    throw new Error(`Forbidden investigation transition: ${from} -> ${to}`);
  }
}

export const IncidentSchema = z.object({
  id: z.string().regex(/^INC-\d{4,}$/),
  title: z.string().min(3).max(160),
  pipeline: z.string().min(2).max(120),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  impact: z.string().min(3).max(240),
  failureTime: z.string().datetime(),
  assignmentGroup: z.string().min(2).max(120),
  initialError: z.string().min(3).max(500),
  status: z.enum(["New", "Investigating", "Awaiting approval", "Resolved"])
});

export type Incident = z.infer<typeof IncidentSchema>;

export const StartInvestigationSchema = z.object({
  incidentId: IncidentSchema.shape.id
}).strict();

export type AuditEvent = {
  id: string;
  investigationId: string;
  type: "investigation.created" | "state.changed" | "user.message";
  occurredAt: string;
  actor: "user" | "system";
  summary: string;
};
