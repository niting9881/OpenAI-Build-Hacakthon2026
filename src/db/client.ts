import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { customer360Incident } from "@/domain/fixtures";
import type { DeterministicInvestigationResult } from "@/domain/evidence";
import type { StageThreeResult } from "@/domain/reasoning";
import { RemediationActionSchema, ActionOutcomeSchema, type RemediationAction, type ActionOutcome } from "@/domain/action";
import { hashAction } from "@/actions/remediation";
import { DocumentationBundleSchema, type DocumentationBundle, type DocumentType } from "@/domain/documentation";
import { EvidenceSchema } from "@/domain/evidence";
import { SynthesisSchema } from "@/domain/reasoning";
import type { VerifiedRecord } from "@/documentation/generator";

const databasePath = process.env.OPSPILOT_DB_PATH ?? join(process.cwd(), "work", "opspilot-stage1.db");
mkdirSync(dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec("PRAGMA busy_timeout = 10000; PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
database.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    pipeline TEXT NOT NULL,
    priority TEXT NOT NULL,
    impact TEXT NOT NULL,
    failure_time TEXT NOT NULL,
    assignment_group TEXT NOT NULL,
    initial_error TEXT NOT NULL,
    status TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS investigations (
    id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL REFERENCES incidents(id),
    state TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    investigation_id TEXT NOT NULL REFERENCES investigations(id),
    event_type TEXT NOT NULL,
    actor TEXT NOT NULL,
    summary TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    sequence INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS evidence (
    id TEXT NOT NULL,
    investigation_id TEXT NOT NULL REFERENCES investigations(id),
    source_system TEXT NOT NULL,
    source_type TEXT NOT NULL,
    observed_at TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    raw_reference TEXT NOT NULL,
    reliability TEXT NOT NULL,
    sensitivity TEXT NOT NULL,
    task_id TEXT NOT NULL,
    simulated INTEGER NOT NULL,
    attributes_json TEXT NOT NULL,
    PRIMARY KEY (investigation_id, id)
  );
  CREATE TABLE IF NOT EXISTS investigation_tasks (
    id TEXT NOT NULL,
    investigation_id TEXT NOT NULL REFERENCES investigations(id),
    label TEXT NOT NULL,
    purpose TEXT NOT NULL,
    tool_names_json TEXT NOT NULL,
    status TEXT NOT NULL,
    evidence_count INTEGER NOT NULL,
    error TEXT,
    PRIMARY KEY (investigation_id, id)
  );
  CREATE TABLE IF NOT EXISTS reasoning_results (
    investigation_id TEXT PRIMARY KEY REFERENCES investigations(id),
    provider_mode TEXT NOT NULL,
    model TEXT NOT NULL,
    plan_json TEXT NOT NULL,
    revisions_json TEXT NOT NULL,
    synthesis_json TEXT NOT NULL,
    completed_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS remediation_actions (
    investigation_id TEXT PRIMARY KEY REFERENCES investigations(id), action_hash TEXT UNIQUE NOT NULL,
    action_json TEXT NOT NULL, status TEXT NOT NULL, approved_by TEXT, approved_at TEXT, executed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS action_outcomes (
    investigation_id TEXT PRIMARY KEY REFERENCES investigations(id), execution_id TEXT UNIQUE NOT NULL,
    outcome_json TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS documentation_bundles (
    investigation_id TEXT PRIMARY KEY REFERENCES investigations(id), bundle_json TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS publication_decisions (
    investigation_id TEXT NOT NULL REFERENCES investigations(id), document_type TEXT NOT NULL,
    decision TEXT NOT NULL, actor TEXT NOT NULL, decided_at TEXT NOT NULL,
    PRIMARY KEY (investigation_id, document_type)
  );
`);

database.prepare(`
  INSERT INTO incidents (id, title, pipeline, priority, impact, failure_time, assignment_group, initial_error, status)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO NOTHING
`).run(
  customer360Incident.id,
  customer360Incident.title,
  customer360Incident.pipeline,
  customer360Incident.priority,
  customer360Incident.impact,
  customer360Incident.failureTime,
  customer360Incident.assignmentGroup,
  customer360Incident.initialError,
  customer360Incident.status
);

export function createInvestigation(incidentId: string) {
  const id = `INV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const auditId = `AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
  const createdAt = new Date().toISOString();

  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare(`
      INSERT INTO investigations (id, incident_id, state, created_at, updated_at, version)
      VALUES (?, ?, 'PLANNING', ?, ?, 1)
    `).run(id, incidentId, createdAt, createdAt);
    database.prepare(`
      INSERT INTO audit_events (id, investigation_id, event_type, actor, summary, occurred_at, sequence)
      VALUES (?, ?, 'investigation.created', 'user', ?, ?, 1)
    `).run(auditId, id, `Investigation created for ${incidentId}`, createdAt);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  return { id, incidentId, state: "PLANNING" as const, createdAt };
}

export function persistInvestigationResult(investigationId: string, result: DeterministicInvestigationResult) {
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const task of result.tasks) {
      database.prepare(`
        INSERT INTO investigation_tasks (id, investigation_id, label, purpose, tool_names_json, status, evidence_count, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(task.taskId, investigationId, task.label, task.purpose, JSON.stringify(task.toolNames), task.status, task.evidenceCount, task.error ?? null);
    }
    for (const item of result.evidence) {
      database.prepare(`
        INSERT INTO evidence (id, investigation_id, source_system, source_type, observed_at, title, summary, raw_reference, reliability, sensitivity, task_id, simulated, attributes_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(item.evidenceId, investigationId, item.sourceSystem, item.sourceType, item.observedAt, item.title, item.summary, item.rawReference, item.reliability, item.sensitivity, item.relatedTaskId, item.simulated ? 1 : 0, JSON.stringify(item.attributes));
    }
    database.prepare("UPDATE investigations SET state = ?, updated_at = ?, version = version + 1 WHERE id = ?")
      .run(result.state, result.completedAt, investigationId);
    const nextSequence = 2;
    database.prepare(`
      INSERT INTO audit_events (id, investigation_id, event_type, actor, summary, occurred_at, sequence)
      VALUES (?, ?, 'state.changed', 'system', ?, ?, ?)
    `).run(`AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, investigationId, `Deterministic evidence collection completed with ${result.evidence.length} evidence items`, result.completedAt, nextSequence);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function persistStageThreeResult(investigationId: string, result: StageThreeResult) {
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare(`
      INSERT INTO reasoning_results (investigation_id, provider_mode, model, plan_json, revisions_json, synthesis_json, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(investigationId, result.providerMode, result.model, JSON.stringify(result.plan), JSON.stringify(result.revisions), JSON.stringify(result.synthesis), result.completedAt);
    database.prepare("UPDATE investigations SET state = ?, updated_at = ?, version = version + 1 WHERE id = ?")
      .run(result.state, result.completedAt, investigationId);
    database.prepare(`
      INSERT INTO audit_events (id, investigation_id, event_type, actor, summary, occurred_at, sequence)
      VALUES (?, ?, 'state.changed', 'system', ?, ?, 3)
    `).run(`AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, investigationId, `${result.model} completed adaptive synthesis with ${result.revisions.length} evidence assessments`, result.completedAt);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function storeRemediationAction(investigationId: string, action: RemediationAction) {
  database.prepare("INSERT INTO remediation_actions (investigation_id, action_hash, action_json, status) VALUES (?, ?, ?, 'pending')")
    .run(investigationId, action.actionHash, JSON.stringify(action));
}

export function decideAndExecuteAction(investigationId: string, actionHash: string, decision: "approved" | "rejected"): { action: RemediationAction; outcome: ActionOutcome } {
  const row = database.prepare("SELECT action_hash, action_json, status FROM remediation_actions WHERE investigation_id = ?").get(investigationId) as { action_hash: string; action_json: string; status: string } | undefined;
  if (!row) throw new Error("Stored remediation action was not found.");
  if (row.action_hash !== actionHash) throw new Error("Approval does not match the stored action hash.");
  const action = RemediationActionSchema.parse(JSON.parse(row.action_json));
  const { actionHash: storedPayloadHash, ...actionPayload } = action;
  if (storedPayloadHash !== row.action_hash || hashAction(actionPayload) !== actionHash) {
    throw new Error("Stored remediation action failed integrity validation.");
  }
  const existing = database.prepare("SELECT outcome_json FROM action_outcomes WHERE investigation_id = ?").get(investigationId) as { outcome_json: string } | undefined;
  if (existing) return { action, outcome: ActionOutcomeSchema.parse(JSON.parse(existing.outcome_json)) };
  if (new Date(action.expiresAt).getTime() <= Date.now()) throw new Error("Approval window has expired.");

  const executedAt = new Date().toISOString();
  const outcome: ActionOutcome = ActionOutcomeSchema.parse(decision === "rejected" ? {
    executionId: `EXE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, status: "rejected",
    permissionRestored: false, s3AccessVerified: false, jobRetryStatus: "NOT_RUN", executedAt,
    message: "The operator rejected the remediation. No sandbox state changed."
  } : {
    executionId: `EXE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, status: "resolved",
    permissionRestored: true, s3AccessVerified: true, jobRetryStatus: "SUCCESS", executedAt,
    message: "Sandbox IAM access was restored and the Customer360 retry completed successfully."
  });
  database.exec("BEGIN IMMEDIATE");
  try {
    database.prepare("UPDATE remediation_actions SET status = ?, approved_by = ?, approved_at = ?, executed_at = ? WHERE investigation_id = ?")
      .run(decision, "demo-operator", executedAt, decision === "approved" ? executedAt : null, investigationId);
    database.prepare("INSERT INTO action_outcomes (investigation_id, execution_id, outcome_json, created_at) VALUES (?, ?, ?, ?)")
      .run(investigationId, outcome.executionId, JSON.stringify(outcome), executedAt);
    database.prepare("UPDATE investigations SET state = ?, updated_at = ?, version = version + 1 WHERE id = ?")
      .run(outcome.status === "resolved" ? "RESOLVED" : "UNRESOLVED", executedAt, investigationId);
    database.prepare("INSERT INTO audit_events (id, investigation_id, event_type, actor, summary, occurred_at, sequence) VALUES (?, ?, 'state.changed', 'user', ?, ?, 4)")
      .run(`AUD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`, investigationId, outcome.message, executedAt);
    database.exec("COMMIT");
  } catch (error) { database.exec("ROLLBACK"); throw error; }
  return { action, outcome };
}

export function loadVerifiedRecord(investigationId: string): VerifiedRecord {
  const row = database.prepare(`SELECT i.id, i.incident_id, n.title, n.impact, n.pipeline, r.synthesis_json, o.outcome_json
    FROM investigations i JOIN incidents n ON n.id = i.incident_id
    JOIN reasoning_results r ON r.investigation_id = i.id JOIN action_outcomes o ON o.investigation_id = i.id
    WHERE i.id = ?`).get(investigationId) as { id: string; incident_id: string; title: string; impact: string; pipeline: string; synthesis_json: string; outcome_json: string } | undefined;
  if (!row) throw new Error("Verified investigation record was not found.");
  const evidenceRows = database.prepare("SELECT id, source_system, source_type, observed_at, title, summary, raw_reference, reliability, sensitivity, task_id, simulated, attributes_json FROM evidence WHERE investigation_id = ? ORDER BY id").all(investigationId) as Record<string, unknown>[];
  const evidence = evidenceRows.map((item) => EvidenceSchema.parse({ evidenceId: item.id, sourceSystem: item.source_system, sourceType: item.source_type, observedAt: item.observed_at, title: item.title, summary: item.summary, rawReference: item.raw_reference, reliability: item.reliability, sensitivity: item.sensitivity, relatedTaskId: item.task_id, simulated: Boolean(item.simulated), attributes: JSON.parse(String(item.attributes_json)) }));
  return { investigationId: row.id, incident: { id: row.incident_id, title: row.title, impact: row.impact, pipeline: row.pipeline }, evidence, synthesis: SynthesisSchema.parse(JSON.parse(row.synthesis_json)), outcome: ActionOutcomeSchema.parse(JSON.parse(row.outcome_json)) };
}

export function storeDocumentation(bundle: DocumentationBundle) {
  database.prepare("INSERT INTO documentation_bundles (investigation_id, bundle_json, created_at) VALUES (?, ?, ?) ON CONFLICT(investigation_id) DO UPDATE SET bundle_json = excluded.bundle_json, created_at = excluded.created_at")
    .run(bundle.investigationId, JSON.stringify(bundle), bundle.generatedAt);
}

export function decidePublication(investigationId: string, documentType: DocumentType, decision: "approved" | "rejected") {
  const bundleRow = database.prepare("SELECT bundle_json FROM documentation_bundles WHERE investigation_id = ?").get(investigationId) as { bundle_json: string } | undefined;
  if (!bundleRow) throw new Error("Documentation drafts were not found.");
  DocumentationBundleSchema.parse(JSON.parse(bundleRow.bundle_json));
  const decidedAt = new Date().toISOString();
  database.prepare("INSERT INTO publication_decisions (investigation_id, document_type, decision, actor, decided_at) VALUES (?, ?, ?, 'demo-operator', ?) ON CONFLICT(investigation_id, document_type) DO UPDATE SET decision = excluded.decision, actor = excluded.actor, decided_at = excluded.decided_at")
    .run(investigationId, documentType, decision, decidedAt);
  return { documentType, decision, decidedAt, externalAction: "not_configured" as const };
}

export function resetDemoData() {
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const table of ["publication_decisions", "documentation_bundles", "action_outcomes", "remediation_actions", "reasoning_results", "evidence", "investigation_tasks", "audit_events", "investigations"]) database.exec(`DELETE FROM ${table}`);
    database.exec("COMMIT");
  } catch (error) { database.exec("ROLLBACK"); throw error; }
  return { resetAt: new Date().toISOString(), incidentId: customer360Incident.id };
}
