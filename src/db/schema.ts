import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  pipeline: text("pipeline").notNull(),
  priority: text("priority").notNull(),
  impact: text("impact").notNull(),
  failureTime: text("failure_time").notNull(),
  assignmentGroup: text("assignment_group").notNull(),
  initialError: text("initial_error").notNull(),
  status: text("status").notNull()
});

export const investigations = sqliteTable("investigations", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id").notNull().references(() => incidents.id),
  state: text("state").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  version: integer("version").notNull().default(1)
});

export const auditEvents = sqliteTable("audit_events", {
  id: text("id").primaryKey(),
  investigationId: text("investigation_id").notNull().references(() => investigations.id),
  eventType: text("event_type").notNull(),
  actor: text("actor").notNull(),
  summary: text("summary").notNull(),
  occurredAt: text("occurred_at").notNull(),
  sequence: integer("sequence").notNull()
});

export const evidence = sqliteTable("evidence", {
  id: text("id").notNull(),
  investigationId: text("investigation_id").notNull().references(() => investigations.id),
  sourceSystem: text("source_system").notNull(),
  sourceType: text("source_type").notNull(),
  observedAt: text("observed_at").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  rawReference: text("raw_reference").notNull(),
  reliability: text("reliability").notNull(),
  sensitivity: text("sensitivity").notNull(),
  taskId: text("task_id").notNull(),
  simulated: integer("simulated", { mode: "boolean" }).notNull(),
  attributesJson: text("attributes_json").notNull()
});

export const investigationTasks = sqliteTable("investigation_tasks", {
  id: text("id").notNull(),
  investigationId: text("investigation_id").notNull().references(() => investigations.id),
  label: text("label").notNull(),
  purpose: text("purpose").notNull(),
  toolNamesJson: text("tool_names_json").notNull(),
  status: text("status").notNull(),
  evidenceCount: integer("evidence_count").notNull(),
  error: text("error")
});

export const reasoningResults = sqliteTable("reasoning_results", {
  investigationId: text("investigation_id").primaryKey().references(() => investigations.id),
  providerMode: text("provider_mode").notNull(),
  model: text("model").notNull(),
  planJson: text("plan_json").notNull(),
  revisionsJson: text("revisions_json").notNull(),
  synthesisJson: text("synthesis_json").notNull(),
  completedAt: text("completed_at").notNull()
});

export const remediationActions = sqliteTable("remediation_actions", {
  investigationId: text("investigation_id").primaryKey().references(() => investigations.id),
  actionHash: text("action_hash").notNull(),
  actionJson: text("action_json").notNull(),
  status: text("status").notNull(),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  executedAt: text("executed_at")
});

export const actionOutcomes = sqliteTable("action_outcomes", {
  investigationId: text("investigation_id").primaryKey().references(() => investigations.id),
  executionId: text("execution_id").notNull(),
  outcomeJson: text("outcome_json").notNull(),
  createdAt: text("created_at").notNull()
});

export const documentationBundles = sqliteTable("documentation_bundles", {
  investigationId: text("investigation_id").primaryKey().references(() => investigations.id),
  bundleJson: text("bundle_json").notNull(), createdAt: text("created_at").notNull()
});

export const publicationDecisions = sqliteTable("publication_decisions", {
  investigationId: text("investigation_id").notNull().references(() => investigations.id),
  documentType: text("document_type").notNull(), decision: text("decision").notNull(),
  actor: text("actor").notNull(), decidedAt: text("decided_at").notNull()
});
