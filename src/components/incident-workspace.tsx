"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Database,
  FileSearch,
  FileText,
  LockKeyhole,
  MessageSquareText,
  Network,
  Search,
  ShieldCheck
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { Incident } from "@/domain/investigation";
import type { Evidence, InvestigationTask } from "@/domain/evidence";
import type { StageThreeResult } from "@/domain/reasoning";
import type { RemediationAction, ActionOutcome } from "@/domain/action";
import type { DocumentationBundle, DocumentType } from "@/domain/documentation";

type Investigation = { id: string; state: "PLANNING" | "SYNTHESIZING" | "PROPOSING_ACTION"; createdAt: string };

const pendingPlan: InvestigationTask[] = [
  { taskId: "TASK-01", label: "Inspect Databricks execution", purpose: "Compare runs and logs.", toolNames: ["get_databricks_run"], status: "pending", evidenceCount: 0 },
  { taskId: "TASK-02", label: "Check AWS dependencies", purpose: "Check S3 and IAM.", toolNames: ["check_s3_access"], status: "pending", evidenceCount: 0 },
  { taskId: "TASK-03", label: "Review changes and guidance", purpose: "Search changes and runbooks.", toolNames: ["get_recent_github_changes"], status: "pending", evidenceCount: 0 },
  { taskId: "TASK-04", label: "Prepare evidence for synthesis", purpose: "Validate completeness.", toolNames: ["evidence_validation"], status: "pending", evidenceCount: 0 }
];

const sourceLabels: Record<Evidence["sourceSystem"], string> = {
  databricks: "Databricks", aws: "AWS", github: "GitHub", knowledge_base: "Knowledge", incident_history: "History"
};

export function IncidentWorkspace({ incident }: { incident: Incident }) {
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<StageThreeResult | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const [remediation, setRemediation] = useState<RemediationAction | null>(null);
  const [outcome, setOutcome] = useState<ActionOutcome | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [documents, setDocuments] = useState<DocumentationBundle | null>(null);
  const [generatingDocuments, setGeneratingDocuments] = useState(false);
  const [publication, setPublication] = useState<Partial<Record<DocumentType, "approved" | "rejected">>>({});

  const startedTime = useMemo(
    () => investigation ? new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(investigation.createdAt)) : "",
    [investigation]
  );

  async function startInvestigation() {
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/investigations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: incident.id })
      });
      if (!response.ok) throw new Error("Investigation could not be started.");
      const result = await response.json();
      setInvestigation(result.investigation);
      setResult(result.result);
      setRemediation(result.remediation);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unexpected error.");
    } finally {
      setStarting(false);
    }
  }

  async function decide(decision: "approved" | "rejected") {
    if (!investigation || !remediation) return;
    setDeciding(true); setError("");
    try {
      const response = await fetch("/api/actions/decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investigationId: investigation.id, actionHash: remediation.actionHash, decision }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Decision failed.");
      setOutcome(body.outcome);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Decision failed."); }
    finally { setDeciding(false); }
  }

  async function generateDocuments() {
    if (!investigation) return;
    setGeneratingDocuments(true); setError("");
    try {
      const response = await fetch("/api/documentation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investigationId: investigation.id }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Documentation failed.");
      setDocuments(body.bundle);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Documentation failed."); }
    finally { setGeneratingDocuments(false); }
  }

  async function decidePublication(documentType: DocumentType, decision: "approved" | "rejected") {
    if (!investigation) return;
    const response = await fetch("/api/documentation/decision", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ investigationId: investigation.id, documentType, decision }) });
    const body = await response.json();
    if (!response.ok) { setError(body.error ?? "Publication decision failed."); return; }
    setPublication((current) => ({ ...current, [documentType]: decision }));
  }

  async function resetDemo() {
    const response = await fetch("/api/demo/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmation: "RESET_SANDBOX_DEMO" }) });
    if (!response.ok) { setError("Demo reset failed."); return; }
    window.location.reload();
  }

  function submitQuestion(event: FormEvent) {
    event.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    setMessage(investigation
      ? "Questions will become available when evidence collection is implemented in Stage 2."
      : "Start the investigation before asking about its evidence.");
    setQuery("");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#main-content" aria-label="OpsPilot AI home">
          <span className="brand-mark"><Activity aria-hidden="true" size={18} /></span>
          <span>OpsPilot <strong>AI</strong></span>
        </a>
        <div className="environment"><ShieldCheck size={15} aria-hidden="true" /> Secure demo environment</div>
        <button className="reset-button" onClick={resetDemo}>Reset demo</button>
      </header>

      <div className="page" id="main-content">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">Incident operations</p>
            <h1 id="page-title">Investigation workspace</h1>
            <p className="lede">Trace evidence, govern decisions, and verify recovery in one auditable workflow.</p>
          </div>
          <div className="guardrail"><LockKeyhole size={17} aria-hidden="true" /><span><strong>Approval enforced</strong><small>No production action can run without review.</small></span></div>
        </section>

        <section className="incident-card" aria-labelledby="incident-title">
          <div className="incident-accent" />
          <div className="incident-main">
            <div className="incident-meta">
              <span className="priority"><AlertTriangle size={14} aria-hidden="true" />{incident.priority}</span>
              <span>{incident.id}</span><span className="dot">•</span><span>{incident.assignmentGroup}</span>
            </div>
            <h2 id="incident-title">{incident.title}</h2>
            <p>{incident.impact}</p>
            <div className="facts">
              <span><Database size={15} aria-hidden="true" />{incident.pipeline}</span>
              <span><Clock3 size={15} aria-hidden="true" />Failed 8:42 AM</span>
              <span><CircleDashed size={15} aria-hidden="true" />{investigation ? "Evidence collected" : incident.status}</span>
            </div>
          </div>
          <button className="primary-button" onClick={startInvestigation} disabled={starting || Boolean(investigation)}>
            {starting ? "Starting…" : investigation ? "Investigation started" : "Start investigation"}
            {!investigation && <ArrowRight size={16} aria-hidden="true" />}
          </button>
        </section>
        {error && <p role="alert" className="error-message">{error}</p>}

        <div className="workspace-grid">
          <section className="panel plan-panel" aria-labelledby="plan-title">
            <div className="panel-heading"><div><p className="eyebrow">Agent workflow</p><h2 id="plan-title">Investigation plan</h2></div><span className="count">{result ? result.tasks.filter((task) => task.status === "completed").length : 0} / 4</span></div>
            <ol className="plan-list">
              {(result?.tasks ?? pendingPlan).map((task, index) => {
                const Icon = [Database, Network, FileSearch, Bot][index];
                return (
                <li key={task.taskId} className={task.status === "completed" ? "active-step" : ""}>
                  <span className="step-icon">{task.status === "completed" ? <CheckCircle2 size={16} aria-hidden="true" /> : <Icon size={16} aria-hidden="true" />}</span>
                  <span><strong>{task.label}</strong><small>{task.status === "completed" ? `${task.evidenceCount} evidence item${task.evidenceCount === 1 ? "" : "s"}` : "Awaiting investigation"}</small></span>
                  <ChevronRight size={15} aria-hidden="true" />
                </li>
              )})}
            </ol>
            <div className="policy-note"><ShieldCheck size={17} aria-hidden="true" /><span><strong>Policy controlled</strong><small>Deterministic code validates each state transition.</small></span></div>
          </section>

          <section className="panel timeline-panel" aria-labelledby="timeline-title" aria-live="polite">
            <div className="panel-heading"><div><p className="eyebrow">Auditable activity</p><h2 id="timeline-title">Investigation timeline</h2></div>{investigation && <span className="live"><i />Live</span>}</div>
            {investigation ? (
              <div className="timeline-content">
                <div className="timeline-event"><span className="event-icon success"><CheckCircle2 size={16} aria-hidden="true" /></span><div><div className="event-row"><strong>Investigation created</strong><time>{startedTime}</time></div><p>{investigation.id} was created for {incident.id}.</p></div></div>
                <div className="timeline-event"><span className="event-icon success"><CheckCircle2 size={16} aria-hidden="true" /></span><div><div className="event-row"><strong>Evidence collection completed</strong><time>{startedTime}</time></div><p>{result?.evidence.length ?? 0} normalized observations collected through allowlisted read-only tools.</p></div></div>
                {result?.revisions.map((revision, index) => <div className="timeline-event" key={`${revision.decision}-${index}`}><span className="event-icon running"><Bot size={16} aria-hidden="true" /></span><div><div className="event-row"><strong>{revision.decision === "gather_more" ? "Adaptive follow-up requested" : "Evidence assessed as sufficient"}</strong><time>{startedTime}</time></div><p>{revision.rationale}</p></div></div>)}
                {outcome && <div className="timeline-event"><span className="event-icon success"><CheckCircle2 size={16} aria-hidden="true" /></span><div><div className="event-row"><strong>{outcome.status === "resolved" ? "Recovery verified" : "Remediation declined"}</strong><time>{startedTime}</time></div><p>{outcome.message}</p></div></div>}
                <div className="stage-marker"><span>{result ? `${result.model} · ${result.providerMode} mode` : "Reasoning provider pending"}</span></div>
              </div>
            ) : (
              <div className="empty-state"><span className="empty-icon"><Search size={23} aria-hidden="true" /></span><h3>No investigation running</h3><p>Start the incident investigation to create an auditable plan and begin collecting evidence.</p></div>
            )}
            <form className="command-bar" onSubmit={submitQuestion}>
              <MessageSquareText size={17} aria-hidden="true" />
              <label className="sr-only" htmlFor="ops-question">Ask OpsPilot about the investigation</label>
              <input id="ops-question" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ask about the plan or evidence…" maxLength={300} />
              <button aria-label="Send question" disabled={!query.trim()}><ArrowRight size={16} aria-hidden="true" /></button>
            </form>
            {message && <p className="command-feedback" role="status">{message}</p>}
          </section>
        </div>

        {result && (
          <section className="evidence-panel" aria-labelledby="evidence-title">
            <div className="panel-heading"><div><p className="eyebrow">Normalized observations</p><h2 id="evidence-title">Evidence collected</h2></div><span className="simulated-badge">Simulated demo data</span></div>
            <div className="evidence-layout">
              <ul className="evidence-list">
                {result.evidence.map((item) => (
                  <li key={item.evidenceId}><button type="button" className={`evidence-row ${selectedEvidence?.evidenceId === item.evidenceId ? "selected" : ""}`} onClick={() => setSelectedEvidence(item)}>
                    <span className={`source-icon source-${item.sourceSystem}`}><Database size={15} aria-hidden="true" /></span>
                    <span className="evidence-copy"><span><strong>{item.evidenceId}</strong><em>{sourceLabels[item.sourceSystem]}</em></span><b>{item.title}</b><small>{item.summary}</small></span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button></li>
                ))}
              </ul>
              <aside className="evidence-detail" aria-live="polite">
                {selectedEvidence ? (
                  <>
                    <div className="detail-kicker"><span>{selectedEvidence.evidenceId}</span><span>{sourceLabels[selectedEvidence.sourceSystem]}</span></div>
                    <h3>{selectedEvidence.title}</h3>
                    <p>{selectedEvidence.summary}</p>
                    <dl>
                      <div><dt>Source type</dt><dd>{selectedEvidence.sourceType.replaceAll("_", " ")}</dd></div>
                      <div><dt>Reliability</dt><dd>{selectedEvidence.reliability}</dd></div>
                      <div><dt>Sensitivity</dt><dd>{selectedEvidence.sensitivity}</dd></div>
                      <div><dt>Reference</dt><dd>{selectedEvidence.rawReference}</dd></div>
                    </dl>
                    <div className="untrusted-note"><ShieldCheck size={15} aria-hidden="true" />Tool output is treated as untrusted evidence and cannot authorize actions.</div>
                  </>
                ) : (
                  <div className="detail-empty"><FileSearch size={25} aria-hidden="true" /><h3>Inspect an observation</h3><p>Select evidence to review its source, reliability, sensitivity, and reference.</p></div>
                )}
              </aside>
            </div>
          </section>
        )}

        {result?.synthesis && (
          <section className="diagnosis-panel" aria-labelledby="diagnosis-title">
            <div className="panel-heading"><div><p className="eyebrow">Evidence-backed synthesis</p><h2 id="diagnosis-title">Root-cause analysis</h2></div><span className={`model-badge mode-${result.providerMode}`}>{result.providerMode === "live" ? "Live GPT‑5.6" : "Deterministic test mode"}</span></div>
            <div className="diagnosis-content">
              <div className="conclusion-block"><span className="confidence">High confidence</span><h3>{result.synthesis.conclusion}</h3><p>Supported by {result.synthesis.conclusionEvidenceIds.join(", ")}</p></div>
              <div className="hypothesis-list">
                {result.synthesis.hypotheses.map((hypothesis) => (
                  <article key={hypothesis.rank} className={hypothesis.rank === 1 ? "primary-hypothesis" : ""}>
                    <div className="hypothesis-rank"><span>#{hypothesis.rank}</span><em>{hypothesis.confidence} confidence</em></div>
                    <h3>{hypothesis.hypothesis}</h3>
                    <p>{hypothesis.confidenceRationale}</p>
                    <div className="citation-row">Evidence: {hypothesis.supportingEvidenceIds.map((id) => <button type="button" key={id} onClick={() => setSelectedEvidence(result.evidence.find((item) => item.evidenceId === id) ?? null)}>{id}</button>)}</div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {remediation && (
          <section className="action-panel" aria-labelledby="action-title">
            <div className="panel-heading"><div><p className="eyebrow">Human authorization required</p><h2 id="action-title">Remediation proposal</h2></div><span className="risk-badge">Medium risk</span></div>
            <div className="action-content">
              <div><h3>Restore <code>s3:GetObject</code></h3><p>{remediation.expectedResult}</p><dl><div><dt>Target</dt><dd>{remediation.targetResource}</dd></div><div><dt>Resource</dt><dd>{remediation.arguments.resource}</dd></div><div><dt>Rollback</dt><dd>{remediation.rollback}</dd></div><div><dt>Action hash</dt><dd><code>{remediation.actionHash.slice(0, 16)}…</code></dd></div></dl></div>
              {outcome ? <div className={`outcome outcome-${outcome.status}`}><CheckCircle2 size={23} aria-hidden="true" /><h3>{outcome.status === "resolved" ? "Recovery verified" : "Action rejected"}</h3><p>{outcome.message}</p><ul><li>S3 access: {outcome.s3AccessVerified ? "verified" : "not changed"}</li><li>Job retry: {outcome.jobRetryStatus}</li></ul></div> : <div className="approval-box"><LockKeyhole size={23} aria-hidden="true" /><h3>Review the exact action</h3><p>Approval is bound to this action hash. Any change invalidates it.</p><div><button disabled={deciding} onClick={() => decide("rejected")} className="reject-button">Reject</button><button disabled={deciding} onClick={() => decide("approved")} className="primary-button">Approve sandbox action</button></div></div>}
            </div>
          </section>
        )}

        {outcome?.status === "resolved" && (
          <section className="documentation-panel" aria-labelledby="documentation-title">
            <div className="panel-heading"><div><p className="eyebrow">Verified record only</p><h2 id="documentation-title">Resolution documentation</h2></div><span className="draft-badge">Drafts require separate approval</span></div>
            {!documents ? <div className="documentation-empty"><FileText size={28} aria-hidden="true" /><h3>Create grounded operational outputs</h3><p>Drafts are generated from persisted evidence, conclusions, and verified recovery—not from conversational context.</p><button className="primary-button" disabled={generatingDocuments} onClick={generateDocuments}>{generatingDocuments ? "Generating…" : "Generate resolution drafts"}</button></div> :
              <div className="document-grid">{([
                ["serviceNow", "ServiceNow work note"], ["stakeholder", "Stakeholder update"], ["jira", "Preventive Jira item"], ["incidentReport", "Incident report"]
              ] as [DocumentType, string][]).map(([type, label]) => { const document = documents[type]; const decision = publication[type]; return <article className="document-card" key={type}><div><span>Draft</span><h3>{label}</h3></div><h4>{document.title}</h4><pre>{document.body}</pre><p className="document-citations">Grounded in {document.citations.join(", ")}</p>{decision ? <p className={`publication-status status-${decision}`}>{decision === "approved" ? "Approved for external creation (connector not configured)" : "External creation rejected"}</p> : <div className="publication-actions"><button className="reject-button" onClick={() => decidePublication(type, "rejected")}>Reject posting</button><button className="primary-button" onClick={() => decidePublication(type, "approved")}>Approve external draft</button></div>}</article>; })}</div>}
          </section>
        )}

        <section className="stage-strip" aria-label="Workflow stages">
          {[
            ["01", "Intake", "active"], ["02", "Investigate", result ? "active" : ""], ["03", "Diagnose", result?.synthesis ? "active" : ""], ["04", "Approve", outcome ? "active" : "locked"], ["05", "Verify", outcome?.status === "resolved" ? "active" : "locked"]
          ].map(([number, label, state]) => <div key={number} className={`stage ${state}`}><span>{number}</span><strong>{label}</strong>{state === "locked" && <LockKeyhole size={13} aria-label="Locked until prior stages complete" />}</div>)}
        </section>
      </div>
    </main>
  );
}
