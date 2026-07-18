import { z } from "zod";
import { EvidenceSchema, InvestigationTaskSchema } from "./evidence";

export const PlannedToolArgumentsSchema = z.union([
  z.object({ jobId: z.string().max(100) }).strict(),
  z.object({ path: z.string().max(220), roleName: z.string().max(120) }).strict(),
  z.object({ roleName: z.string().max(120) }).strict(),
  z.object({ repository: z.string().max(160) }).strict(),
  z.object({ query: z.string().min(3).max(180) }).strict()
]);

export const PlannedToolCallSchema = z.object({
  taskId: z.string().regex(/^TASK-\d{2}$/),
  toolName: z.string().min(3).max(100),
  arguments: PlannedToolArgumentsSchema
}).strict();

export const AgentPlanSchema = z.object({
  objective: z.string().min(10).max(500),
  successCriteria: z.array(z.string().min(3).max(240)).min(2).max(8),
  stoppingConditions: z.array(z.string().min(3).max(240)).min(1).max(6),
  tasks: z.array(z.object({
    taskId: z.string().regex(/^TASK-\d{2}$/),
    label: z.string().min(3).max(120),
    purpose: z.string().min(3).max(300),
    dependsOn: z.array(z.string().regex(/^TASK-\d{2}$/)).max(5),
    toolCalls: z.array(PlannedToolCallSchema).min(1).max(5)
  }).strict()).min(2).max(8)
}).strict();

export const EvidenceAssessmentSchema = z.object({
  decision: z.enum(["gather_more", "synthesize", "escalate"]),
  rationale: z.string().min(10).max(700),
  missingEvidence: z.array(z.string().min(3).max(240)).max(8),
  followUpCalls: z.array(PlannedToolCallSchema).max(4)
}).strict();

export const HypothesisSchema = z.object({
  rank: z.number().int().min(1).max(5),
  hypothesis: z.string().min(5).max(400),
  confidence: z.enum(["high", "medium", "low"]),
  confidenceRationale: z.string().min(10).max(500),
  supportingEvidenceIds: z.array(z.string().regex(/^E-\d{2}$/)).min(1).max(8),
  contradictoryEvidenceIds: z.array(z.string().regex(/^E-\d{2}$/)).max(8),
  missingEvidence: z.array(z.string().min(3).max(240)).max(6)
}).strict();

export const SynthesisSchema = z.object({
  hypotheses: z.array(HypothesisSchema).min(1).max(5),
  conclusion: z.string().min(20).max(800),
  conclusionEvidenceIds: z.array(z.string().regex(/^E-\d{2}$/)).min(2).max(8),
  readyForRemediation: z.boolean()
}).strict();

export const StageThreeResultSchema = z.object({
  providerMode: z.enum(["deterministic", "live"]),
  model: z.string().min(3),
  plan: AgentPlanSchema,
  revisions: z.array(EvidenceAssessmentSchema).min(1).max(3),
  tasks: z.array(InvestigationTaskSchema),
  evidence: z.array(EvidenceSchema),
  synthesis: SynthesisSchema,
  state: z.literal("PROPOSING_ACTION"),
  completedAt: z.string().datetime()
});

export type AgentPlan = z.infer<typeof AgentPlanSchema>;
export type EvidenceAssessment = z.infer<typeof EvidenceAssessmentSchema>;
export type Synthesis = z.infer<typeof SynthesisSchema>;
export type StageThreeResult = z.infer<typeof StageThreeResultSchema>;
export type PlannedToolCall = z.infer<typeof PlannedToolCallSchema>;
