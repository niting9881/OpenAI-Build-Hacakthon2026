import type { Incident } from "@/domain/investigation";
import type { Evidence } from "@/domain/evidence";
import type { AgentPlan, EvidenceAssessment, Synthesis } from "@/domain/reasoning";

export type AvailableTool = { name: string; description: string; mode: "read" };

export interface ReasoningProvider {
  readonly mode: "deterministic" | "live";
  readonly model: string;
  createPlan(incident: Incident, tools: AvailableTool[]): Promise<AgentPlan>;
  assessEvidence(incident: Incident, plan: AgentPlan, evidence: Evidence[], usedTools: string[]): Promise<EvidenceAssessment>;
  synthesize(incident: Incident, plan: AgentPlan, evidence: Evidence[]): Promise<Synthesis>;
}
