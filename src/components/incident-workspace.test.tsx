import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { customer360Incident } from "@/domain/fixtures";
import { IncidentWorkspace } from "./incident-workspace";

afterEach(() => vi.restoreAllMocks());

describe("IncidentWorkspace", () => {
  it("renders the incident and secure empty state", () => {
    render(<IncidentWorkspace incident={customer360Incident} />);
    expect(screen.getByRole("heading", { name: customer360Incident.title })).toBeInTheDocument();
    expect(screen.getByText("No investigation running")).toBeInTheDocument();
    expect(screen.getByText("Approval enforced")).toBeInTheDocument();
  });

  it("starts an investigation and reports the auditable state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ investigation: { id: "INV-TEST1234", state: "PLANNING", createdAt: "2026-07-15T14:00:00.000Z" } })
    }));
    render(<IncidentWorkspace incident={customer360Incident} />);
    fireEvent.click(screen.getByRole("button", { name: "Start investigation" }));
    await waitFor(() => expect(screen.getByText("INV-TEST1234 was created for INC-1042.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Investigation started" })).toBeDisabled();
    expect(screen.getByText("Evidence collection completed")).toBeInTheDocument();
  });

  it("does not treat the command box as an execution path", () => {
    render(<IncidentWorkspace incident={customer360Incident} />);
    const input = screen.getByLabelText("Ask OpsPilot about the investigation");
    fireEvent.change(input, { target: { value: "Execute the remediation now" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    expect(screen.getByRole("status")).toHaveTextContent("Start the investigation before asking about its evidence");
  });

  it("renders normalized evidence and exposes source details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        investigation: { id: "INV-EVIDENCE", state: "SYNTHESIZING", createdAt: "2026-07-15T14:00:00.000Z" },
        result: {
          providerMode: "deterministic",
          model: "gpt-5.6-compatible-test-provider",
          state: "SYNTHESIZING",
          completedAt: "2026-07-15T14:00:01.000Z",
          plan: { objective: "Investigate the Customer360 failure safely.", successCriteria: ["Collect evidence", "Cite conclusions"], stoppingConditions: ["Stop when sufficient"], tasks: [] },
          revisions: [],
          tasks: [
            { taskId: "TASK-01", label: "Inspect Databricks execution", purpose: "Inspect runs", toolNames: ["get_databricks_run"], status: "completed", evidenceCount: 1 },
            { taskId: "TASK-02", label: "Check AWS dependencies", purpose: "Inspect IAM", toolNames: ["get_iam_policy"], status: "completed", evidenceCount: 0 },
            { taskId: "TASK-03", label: "Review changes and guidance", purpose: "Inspect changes", toolNames: ["search_runbooks"], status: "completed", evidenceCount: 0 },
            { taskId: "TASK-04", label: "Prepare evidence for synthesis", purpose: "Validate", toolNames: ["evidence_validation"], status: "completed", evidenceCount: 0 }
          ],
          evidence: [{
            evidenceId: "E-01", sourceSystem: "databricks", sourceType: "job_run_history",
            observedAt: "2026-07-15T13:50:00.000Z", title: "Current run failed after previous successful run",
            summary: "Run 88421 failed after run 88408 succeeded.", rawReference: "databricks://jobs/test",
            reliability: "high", sensitivity: "internal", relatedTaskId: "TASK-01", simulated: true, attributes: {}
          }],
          synthesis: undefined
        }
      })
    }));
    render(<IncidentWorkspace incident={customer360Incident} />);
    fireEvent.click(screen.getByRole("button", { name: "Start investigation" }));
    await screen.findByRole("heading", { name: "Evidence collected" });
    fireEvent.click(screen.getByRole("button", { name: /Current run failed/ }));
    expect(screen.getByText("Tool output is treated as untrusted evidence and cannot authorize actions.")).toBeInTheDocument();
    expect(screen.getByText("job run history")).toBeInTheDocument();
  });

  it("renders adaptive reasoning and cited hypotheses", async () => {
    const evidence = ["E-02", "E-03"].map((id, index) => ({
      evidenceId: id, sourceSystem: index ? "aws" : "databricks", sourceType: "observation",
      observedAt: "2026-07-15T13:50:00.000Z", title: `Evidence ${id}`, summary: `Verified observation ${id}`,
      rawReference: `source://${id}`, reliability: "high", sensitivity: "internal", relatedTaskId: "TASK-01", simulated: true, attributes: {}
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      investigation: { id: "INV-REASON", state: "PROPOSING_ACTION", createdAt: "2026-07-15T14:00:00.000Z" },
      result: {
        providerMode: "deterministic", model: "gpt-5.6-compatible-test-provider", state: "PROPOSING_ACTION", completedAt: "2026-07-15T14:00:01.000Z",
        plan: { objective: "Investigate the Customer360 failure safely.", successCriteria: ["Collect evidence", "Cite conclusions"], stoppingConditions: ["Stop when sufficient"], tasks: [] },
        revisions: [{ decision: "gather_more", rationale: "Current evidence does not establish which change introduced the permission regression.", missingEvidence: ["IAM history"], followUpCalls: [] }],
        tasks: [], evidence,
        synthesis: { hypotheses: [{ rank: 1, hypothesis: "IAM permission regression caused the S3 read failure.", confidence: "high", confidenceRationale: "The access failure and permission state agree.", supportingEvidenceIds: ["E-02", "E-03"], contradictoryEvidenceIds: [], missingEvidence: [] }], conclusion: "The Customer360 pipeline failed because the execution role lost required S3 object-read access.", conclusionEvidenceIds: ["E-02", "E-03"], readyForRemediation: true }
      }
    }) }));
    render(<IncidentWorkspace incident={customer360Incident} />);
    fireEvent.click(screen.getByRole("button", { name: "Start investigation" }));
    expect(await screen.findByRole("heading", { name: "Root-cause analysis" })).toBeInTheDocument();
    expect(screen.getByText("Adaptive follow-up requested")).toBeInTheDocument();
    expect(screen.getByText("The Customer360 pipeline failed because the execution role lost required S3 object-read access.")).toBeInTheDocument();
    expect(screen.getByText("Deterministic test mode")).toBeInTheDocument();
  });
});
