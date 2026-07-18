import type { Evidence } from "@/domain/evidence";
import type { Synthesis } from "@/domain/reasoning";
import type { ActionOutcome } from "@/domain/action";
import { DocumentationBundleSchema } from "@/domain/documentation";

export type VerifiedRecord = {
  investigationId: string;
  incident: { id: string; title: string; impact: string; pipeline: string };
  evidence: Evidence[];
  synthesis: Synthesis;
  outcome: ActionOutcome;
};

export function sanitizePlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+/gi, "[LINK REMOVED]")
    .replace(/(?:sk-[A-Za-z0-9_-]{12,}|AKIA[A-Z0-9]{16}|\b\d{12}\b)/g, "[REDACTED]")
    .replace(/(?:api[-_ ]?key|token|password|secret)\s*[:=]\s*\S+/gi, "$1: [REDACTED]");
}

export function generateDocumentation(record: VerifiedRecord, now = new Date()) {
  if (record.outcome.status !== "resolved" || !record.outcome.s3AccessVerified || record.outcome.jobRetryStatus !== "SUCCESS") {
    throw new Error("Documentation requires a persisted, verified resolution.");
  }
  const allowedIds = new Set(record.evidence.map((item) => item.evidenceId));
  const citations = record.synthesis.conclusionEvidenceIds.filter((id) => allowedIds.has(id));
  if (citations.length < 2) throw new Error("The verified record does not contain sufficient cited evidence.");
  const facts = {
    title: sanitizePlainText(record.incident.title), impact: sanitizePlainText(record.incident.impact),
    pipeline: sanitizePlainText(record.incident.pipeline), conclusion: sanitizePlainText(record.synthesis.conclusion),
    outcome: sanitizePlainText(record.outcome.message)
  };
  const status = "draft" as const;
  return DocumentationBundleSchema.parse({
    investigationId: record.investigationId, generatedAt: now.toISOString(),
    serviceNow: { title: `Resolution work note — ${record.incident.id}`, status, citations, body: `Investigation ${record.investigationId} determined: ${facts.conclusion}\n\nControlled remediation completed. ${facts.outcome}\n\nVerification: S3 access verified; ${facts.pipeline} retry SUCCESS. Evidence: ${citations.join(", ")}.` },
    stakeholder: { title: `Resolved — ${facts.title}`, status, citations, body: `The service interruption affecting ${facts.pipeline} has been resolved. Access was restored through an approved change and recovery was verified by a successful pipeline run. No further action is required from stakeholders.` },
    jira: { title: `Prevent recurrence of ${facts.pipeline} access regression`, status, citations, body: `Preventive action: add a pre-deployment check for required S3 permissions.\n\nAcceptance criteria:\n- Policy changes are checked for required object-read access.\n- A blocked permission produces a failed deployment check.\n- The runbook links the check to evidence ${citations.join(" and ")}.` },
    incidentReport: { title: `Incident report — ${record.incident.id}`, status, citations, body: `Impact: ${facts.impact}\nRoot cause: ${facts.conclusion}\nResolution: approved IAM restoration.\nVerification: S3 access verified and pipeline retry succeeded.\nEvidence: ${citations.join(", ")}.` }
  });
}
