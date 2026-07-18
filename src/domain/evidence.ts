import { z } from "zod";

export const EvidenceSourceSchema = z.enum([
  "databricks",
  "aws",
  "github",
  "knowledge_base",
  "incident_history"
]);

export const EvidenceSchema = z.object({
  evidenceId: z.string().regex(/^E-\d{2}$/),
  sourceSystem: EvidenceSourceSchema,
  sourceType: z.string().min(2).max(80),
  observedAt: z.string().datetime(),
  title: z.string().min(3).max(160),
  summary: z.string().min(3).max(1200),
  rawReference: z.string().min(3).max(300),
  reliability: z.enum(["high", "medium", "low"]),
  sensitivity: z.enum(["public", "internal", "restricted"]),
  relatedTaskId: z.string().regex(/^TASK-\d{2}$/),
  simulated: z.boolean(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({})
});

export type Evidence = z.infer<typeof EvidenceSchema>;

export const InvestigationTaskSchema = z.object({
  taskId: z.string().regex(/^TASK-\d{2}$/),
  label: z.string().min(3).max(120),
  purpose: z.string().min(3).max(300),
  toolNames: z.array(z.string()).min(1).max(4),
  status: z.enum(["pending", "running", "completed", "failed"]),
  evidenceCount: z.number().int().min(0),
  error: z.string().max(300).optional()
});

export type InvestigationTask = z.infer<typeof InvestigationTaskSchema>;

export const DeterministicInvestigationResultSchema = z.object({
  tasks: z.array(InvestigationTaskSchema).min(1),
  evidence: z.array(EvidenceSchema).min(1),
  state: z.literal("SYNTHESIZING"),
  completedAt: z.string().datetime()
});

export type DeterministicInvestigationResult = z.infer<typeof DeterministicInvestigationResultSchema>;
