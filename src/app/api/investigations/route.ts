import { NextResponse } from "next/server";
import { customer360Incident } from "@/domain/fixtures";
import { StartInvestigationSchema } from "@/domain/investigation";
import { createInvestigation, persistInvestigationResult, persistStageThreeResult, storeRemediationAction } from "@/db/client";
import { createReasoningProvider } from "@/reasoning/provider-factory";
import { runAdaptiveInvestigation } from "@/orchestration/adaptive-investigation";
import { proposeRemediation } from "@/actions/remediation";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 2048) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request must contain valid JSON." }, { status: 400 });
  }

  const parsed = StartInvestigationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid investigation request." }, { status: 400 });
  }
  if (parsed.data.incidentId !== customer360Incident.id) {
    return NextResponse.json({ error: "Incident is outside the demo allowlist." }, { status: 404 });
  }

  try {
    const investigation = createInvestigation(parsed.data.incidentId);
    const provider = await createReasoningProvider();
    const result = await runAdaptiveInvestigation(investigation.id, customer360Incident, provider);
    persistInvestigationResult(investigation.id, {
      tasks: result.tasks,
      evidence: result.evidence,
      state: "SYNTHESIZING",
      completedAt: result.completedAt
    });
    persistStageThreeResult(investigation.id, result);
    const remediation = proposeRemediation(result.synthesis);
    storeRemediationAction(investigation.id, remediation);
    return NextResponse.json(
      {
        investigation: { ...investigation, state: result.state },
        result,
        remediation,
        auditEvent: {
          type: "investigation.created",
          occurredAt: investigation.createdAt,
          actor: "user"
        }
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Live investigation failed.";
    return NextResponse.json({ error: message.replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]") }, { status: 502 });
  }
}
