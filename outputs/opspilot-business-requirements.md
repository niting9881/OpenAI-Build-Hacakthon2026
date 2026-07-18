# OpsPilot AI

## Business Requirements Document

**Document status:** Draft for review  
**Proposed track:** Work & Productivity  
**MVP scenario:** Customer360 Databricks pipeline failure caused by an AWS IAM policy change  
**Primary user:** Data-platform operations engineer  
**Hackathon model:** GPT-5.6  
**Development agent:** Codex

---

## 1. Executive Summary

OpsPilot AI is an approval-gated digital engineer for enterprise data-platform incidents. It investigates a failed Databricks pipeline across operational systems, builds an evidence-backed diagnosis, recommends a safe remediation, waits for human approval, executes the approved action in a sandbox, verifies recovery, and documents the complete outcome.

The hackathon MVP will demonstrate one narrow but complete incident-resolution journey. It will not attempt to build a general-purpose enterprise operations platform or connect to every production system. Realistic simulated connectors will be used where live access would introduce security, setup, or reliability risk.

The product uses GPT-5.6 at runtime for planning, adaptive tool selection, evidence synthesis, remediation planning, and governed closed-loop execution. Codex will materially build the application, tool layer, agent state machine, tests, evaluations, user experience, and documentation.

## 2. Business Problem

Enterprise data-platform engineers often spend 30–90 minutes investigating a production pipeline failure before they can provide an actionable answer. Incident context and diagnostic evidence are fragmented across ticketing systems, Databricks runs and Spark logs, AWS resources, source-control history, internal runbooks, and historical incidents.

Engineers must manually:

- determine what failed and assess its impact;
- collect and correlate evidence from multiple systems;
- distinguish the visible symptom from the underlying cause;
- compare the failed run with the last successful state;
- identify recent code, configuration, or infrastructure changes;
- select a safe remediation and consider rollback;
- coordinate approvals and execute the action;
- verify that the action resolved the failure; and
- document the incident and preventive work.

This process creates slow response, inconsistent diagnoses, repeated investigation effort, incomplete audit records, and delayed stakeholder communication.

Generic chat assistants and single-log summarizers do not solve the full problem. They typically do not plan an investigation, adapt tool selection as evidence changes, distinguish evidence from assumptions, govern sensitive actions, verify remediation, or maintain a traceable incident record.

## 3. Product Vision

> OpsPilot AI turns a fragmented production incident into a traceable, approval-gated, closed-loop engineering workflow.

OpsPilot should behave like a careful digital engineer rather than a chatbot. It must:

1. plan before acting;
2. gather evidence from the systems relevant to the incident;
3. adapt the investigation when evidence is missing or contradictory;
4. cite evidence for every material conclusion;
5. keep human operators in control of sensitive actions;
6. verify outcomes rather than assuming success; and
7. preserve an auditable record of the complete workflow.

## 4. Goals and Non-Goals

### 4.1 MVP Goals

- Demonstrate a complete incident journey in under three minutes.
- Use GPT-5.6 substantively for planning, tool selection, adaptation, synthesis, and governance.
- Investigate at least four distinct evidence sources.
- Make the agent’s plan, evidence, uncertainty, and action status visible.
- Require explicit approval before any state-changing action.
- Execute one safe sandbox remediation and verify recovery.
- Produce useful incident and follow-up documentation.
- Preserve a substantial Codex session showing core implementation work.

### 4.2 Non-Goals

- Production changes to real AWS or Databricks environments.
- Fully independent multi-agent services for every integration.
- Live integrations with ServiceNow, Jira, Slack, Teams, AWS, Databricks, and GitHub simultaneously.
- Unsupervised write actions or automatic approval.
- A general-purpose SRE platform supporting every incident type.
- Model training or autonomous learning from sensitive production data.

## 5. Users and Stakeholders

### 5.1 Primary User

**Data-platform operations engineer** responsible for investigating failed Databricks production pipelines using AWS data and infrastructure services.

### 5.2 Secondary Stakeholders

- Data engineering owner
- Site reliability or platform engineering team
- Incident manager
- Application owner
- Security and audit reviewer
- Business stakeholder receiving the status update

## 6. Primary Demo Scenario

The Customer360 Databricks pipeline fails while reading its S3 input location. The visible error is `AccessDenied`, which could be caused by an incorrect path, expired credentials, role-assumption failure, bucket policy, or IAM policy change.

OpsPilot must:

1. load the incident;
2. create an investigation plan;
3. inspect Databricks run history and logs;
4. examine AWS S3/IAM state;
5. compare recent GitHub infrastructure changes;
6. search a runbook and similar historical incident;
7. recognize that the first evidence is insufficient;
8. request an additional IAM change-history check;
9. conclude that a recent IAM policy change removed required S3 access;
10. propose a scoped permission restoration with risk and rollback;
11. wait for explicit approval;
12. execute the sandbox change;
13. recheck S3 access and retry the pipeline;
14. confirm successful recovery; and
15. generate work notes, a stakeholder update, and a preventive Jira item.

## 7. Business Requirements

### BR-01 — Structured Incident Intake

The system shall load a ServiceNow-style incident with an incident ID, pipeline, failure time, impact, priority, initial error, assignment group, and status. Starting an investigation shall create a unique audit record.

**Acceptance criteria**

- The incident identifies the affected pipeline without revealing the root cause.
- The user can start an investigation from the incident screen.
- A unique investigation ID and start time are recorded.

**Judging alignment:** Design through a coherent entry point; Potential Impact through a realistic operational workflow; Technological Implementation through structured ingestion.

### BR-02 — GPT-5.6 Investigation Planning

GPT-5.6 shall convert the incident into a typed investigation plan containing questions, tasks, dependencies, expected evidence, parallelizable work, stopping conditions, and required tools.

**Acceptance criteria**

- The plan is valid against a defined schema.
- Each task contains a purpose and expected output.
- The plan is visible and understandable to the user.
- The investigation proceeds without manual tool-by-tool direction.

**Judging alignment:** Technological Implementation through model-driven structured planning; Design through visible progress; Quality of the Idea through digital-engineer behavior.

### BR-03 — Multi-System Evidence Collection

The system shall expose read-only tools for Databricks, AWS, GitHub, the knowledge base, and incident history. Each tool shall return structured, source-labeled, timestamped evidence.

**Acceptance criteria**

- At least four distinct sources are queried during the demo.
- Tool inputs and outputs are recorded in the timeline.
- Simulated connectors are clearly labeled.
- Tool errors, timeouts, and empty results do not crash the investigation.

**Judging alignment:** Technological Implementation through tool integration and resilient orchestration; Potential Impact through reduced system switching; Quality of the Idea through cross-system correlation.

### BR-04 — Adaptive Tool Selection

GPT-5.6 shall evaluate collected evidence and decide whether to gather more evidence, revise the plan, or stop the investigation.

**Acceptance criteria**

- At least one follow-up tool call is selected because earlier evidence is ambiguous or contradictory.
- The system displays a concise reason for the follow-up step.
- The root cause is not embedded in the prompt or hard-coded workflow.
- Maximum steps and timeout limits prevent unbounded execution.

**Judging alignment:** Technological Implementation through genuine agentic adaptation; Quality of the Idea through behavior beyond fixed automation; Potential Impact through fewer premature diagnoses.

### BR-05 — Evidence-Backed Diagnosis

GPT-5.6 shall produce ranked root-cause hypotheses with supporting evidence, contradictory or missing evidence, confidence rationale, and recommended verification.

**Acceptance criteria**

- Observations, assumptions, and conclusions are visually separated.
- Every material conclusion cites one or more evidence IDs.
- Confidence includes a written rationale and is not only a numeric score.
- The final diagnosis connects the IAM change to the Databricks failure.

**Judging alignment:** Technological Implementation through multi-source synthesis; Design through trustworthy explanations; Potential Impact through consistent diagnosis; Quality of the Idea through evidence-first reasoning.

### BR-06 — Safe Remediation Plan

The system shall recommend a scoped remediation containing the proposed action, target resource, expected result, risk, preconditions, rollback, verification, and approval requirement.

**Acceptance criteria**

- The proposed action directly addresses the established root cause.
- Read operations and state-changing actions use separate permissions.
- Risk, scope, and rollback are visible before approval.
- The action payload is immutable once presented for approval.

**Judging alignment:** Design through a credible enterprise experience; Technological Implementation through governed execution; Potential Impact through safe acceleration.

### BR-07 — Human Approval Gate

No state-changing action shall execute without explicit approval. Approval shall be bound to a specific immutable action payload and shall record the approver, timestamp, decision, and presented risk.

**Acceptance criteria**

- Rejection results in no state change.
- Approval permits only the displayed action.
- Changing the action invalidates prior approval.
- The audit timeline records the approval decision.

**Judging alignment:** Technological Implementation through authorization and state control; Design through operator trust; Potential Impact through enterprise readiness; Quality of the Idea through responsible autonomy.

### BR-08 — Controlled Action Execution

After approval, the system shall execute the sandbox remediation using a restricted action tool and record its inputs, outputs, and resulting state.

**Acceptance criteria**

- Only the approved IAM resource and permission can change.
- Execution failures and partial failures are reported honestly.
- An API success response is not treated as proof of incident resolution.
- Duplicate execution is prevented through idempotency controls.

**Judging alignment:** Technological Implementation through real agent action; Design through journey completion; Potential Impact through reduced manual remediation.

### BR-09 — Outcome Verification

The system shall verify remediation by rechecking S3 access, retrying the pipeline, and comparing the result with the original failure.

**Acceptance criteria**

- Verification uses new tool observations after execution.
- Success is based on observable results, not model assertion.
- Failed verification returns the workflow to investigation or escalation.
- The final state is explicitly marked resolved, unresolved, or escalated.

**Judging alignment:** Technological Implementation through a closed-loop agent; Design through a complete outcome; Quality of the Idea through act-and-verify behavior; Potential Impact through avoidance of false closure.

### BR-10 — Operational Documentation

GPT-5.6 shall generate ServiceNow work notes, a nontechnical stakeholder update, a preventive Jira item, and a concise incident report from the verified investigation record.

**Acceptance criteria**

- Generated documents contain only facts supported by the record.
- Technical and business communications match their audiences.
- External posting requires separate approval.
- The Jira item contains context, preventive action, and acceptance criteria.

**Judging alignment:** Design through a complete product workflow; Potential Impact through reduced coordination effort; Technological Implementation through grounded structured generation.

### BR-11 — Auditability and Governance

The system shall preserve a timeline of the user request, plan, tool calls, evidence, plan revisions, hypotheses, proposed action, approval, execution, verification, and documentation.

**Acceptance criteria**

- Tool evidence and model-generated interpretations are distinguishable.
- Timestamps and source identifiers are retained.
- Secrets and sensitive fields are redacted.
- Every write action is linked to an approval record.

**Judging alignment:** Technological Implementation through production-minded observability; Design through transparency; Potential Impact through governance readiness.

### BR-12 — Historical Incident Learning (Should Have)

After verification, the system should save a sanitized incident signature, root cause, resolution, verification result, and preventive action for later similarity retrieval.

**Acceptance criteria**

- A later sample incident can retrieve the record.
- Historical similarity is supporting evidence, not proof.
- Sensitive operational data is excluded.

**Judging alignment:** Potential Impact through compounding operational knowledge; Quality of the Idea through a learning loop; Technological Implementation through retrieval and persistence.

## 8. GPT-5.6 Agentic AI Requirements

### 8.1 Model Responsibilities

GPT-5.6 is the runtime planner and reasoning model. It shall:

- create and revise the investigation plan;
- select tools using typed schemas;
- analyze tool results without inventing unobserved facts;
- request follow-up evidence when confidence is insufficient;
- synthesize ranked hypotheses with evidence citations;
- formulate a constrained remediation proposal;
- classify the proposed action as read-only or approval-required;
- verify whether the action achieved its stated goal; and
- generate grounded operational documentation.

### 8.2 Deterministic Application Responsibilities

The application—not the model—shall enforce:

- tool allowlists and argument validation;
- read/write permission separation;
- investigation step and time limits;
- approval state transitions;
- immutable action hashes;
- idempotency and retry policies;
- secret redaction;
- audit event persistence; and
- the rule that no write action runs without valid approval.

### 8.3 Agent State Machine

The permitted states are:

`INTAKE → PLANNING → GATHERING → SYNTHESIZING → NEEDS_EVIDENCE | PROPOSING_ACTION → AWAITING_APPROVAL → EXECUTING → VERIFYING → RESOLVED | UNRESOLVED | ESCALATED`

The model may recommend the next state, but deterministic application logic validates every transition.

### 8.4 Evidence Contract

Every tool result shall be normalized to an evidence envelope containing:

- `evidence_id`
- `source_system`
- `source_type`
- `observed_at`
- `summary`
- `raw_reference`
- `reliability`
- `sensitivity`
- `related_task_id`

Model conclusions must cite `evidence_id` values. Unsupported citations fail validation and trigger regeneration or escalation.

### 8.5 Closed-Loop Action Contract

Every proposed action shall contain:

- typed tool and arguments;
- target resource;
- expected state change;
- risk classification;
- preconditions;
- rollback action;
- verification steps;
- approval requirement; and
- immutable action hash.

Execution is permitted only when the current approval record matches the action hash.

## 9. Agentic Architecture

### 9.1 Logical Components

1. **Web Experience** — incident view, live investigation timeline, evidence drawer, diagnosis, approval dialog, verification, and report.
2. **Agent Orchestrator** — deterministic state machine controlling planning, tool calls, synthesis, approval, execution, and verification.
3. **GPT-5.6 Reasoning Layer** — structured planning, tool choice, hypothesis formation, remediation proposal, and grounded documentation.
4. **Tool Registry** — typed read tools and separately permissioned action tools.
5. **Evidence Store** — normalized observations, citations, timestamps, and sensitivity metadata.
6. **Policy and Approval Engine** — risk classification, action hashing, authorization, and state-transition validation.
7. **Audit Store** — append-only workflow events and model/tool trace references.
8. **Evaluation Harness** — scenario fixtures, expected evidence, safety assertions, and end-to-end scoring.

### 9.2 MVP Tools

**Read-only tools**

- `get_incident`
- `get_databricks_run`
- `get_databricks_logs`
- `check_s3_access`
- `get_iam_policy`
- `get_iam_change_history`
- `get_recent_github_changes`
- `search_runbooks`
- `search_similar_incidents`

**Approval-required tools**

- `restore_sandbox_iam_permission`
- `retry_sandbox_databricks_job`
- `draft_or_post_work_note`
- `create_sandbox_jira_issue`

## 10. Recommended Technology Stack

| Layer | Recommended technology | Rationale |
|---|---|---|
| Web application | Next.js with React and TypeScript | One deployable codebase, strong demo UX, server routes, and shared types |
| Styling | Tailwind CSS with accessible component primitives | Rapid, consistent UI implementation |
| Agent runtime | TypeScript service with an explicit finite-state machine | Keeps safety and workflow rules deterministic and easy to audit |
| Model API | OpenAI Responses API using GPT-5.6 | Native structured outputs and tool-calling workflow |
| OpenAI client | Official OpenAI JavaScript/TypeScript SDK | Supported API integration and streaming |
| Validation | Zod plus JSON Schema | Validates plans, evidence, hypotheses, and action payloads |
| Persistence | SQLite for local demo; Drizzle ORM | Portable setup, typed schema, no external database dependency |
| Tool layer | Typed in-process adapters with MCP-compatible boundaries | Reliable demo now; clear path to real MCP servers later |
| Retrieval | SQLite full-text search or local embeddings only if needed | Avoids unnecessary infrastructure for a small curated corpus |
| Streaming | Server-Sent Events | Live progress updates with low complexity |
| Testing | Vitest and Playwright | Unit, orchestration, safety, and end-to-end UI verification |
| Evaluation | Scenario fixtures plus deterministic assertions and model-graded quality checks | Measures diagnosis, citations, safety, and completion |
| Observability | Structured JSON logs and append-only audit events | Makes the full investigation trace inspectable |
| Deployment | Vercel or a single Node container | Fast judge setup and reproducible execution |
| Source control | GitHub | Required repository access and visible development history |

### 10.1 Why Not a Large Multi-Agent Framework?

The MVP should use one GPT-5.6 reasoning loop with specialized typed tools rather than many independently deployed agents. This reduces orchestration risk while still demonstrating planning, parallel evidence gathering, adaptive tool selection, synthesis, governance, and closed-loop action. Worker services can be introduced later when independent scaling or credentials justify them.

## 11. Codex Material Contribution Requirement

Codex shall materially build the working system and not be limited to brainstorming or documentation.

### 11.1 Required Codex Contributions

- Refine architecture and acceptance criteria.
- Scaffold the Next.js application and persistence layer.
- Implement GPT-5.6 structured outputs and tool calling.
- Build the deterministic investigation state machine.
- Implement simulated Databricks, AWS, GitHub, ServiceNow, and Jira adapters.
- Implement evidence normalization and citation validation.
- Build immutable approval and execution controls.
- Create scenario fixtures and automated evaluations.
- Implement and test the end-to-end UI.
- Diagnose and correct meaningful implementation defects.
- Produce setup, testing, security, and demo documentation.

### 11.2 Submission Evidence

- The `/feedback` Codex Session ID where most core functionality was built.
- Repository commits corresponding to the Codex-assisted implementation.
- A README section identifying important Codex-assisted decisions.
- Test and evaluation output demonstrating quality and safety.
- At least one concrete example of Codex finding or fixing a nontrivial issue.

### 11.3 Judging Alignment

- **Technological Implementation:** proves thorough and skillful Codex usage on a nontrivial working system.
- **Design:** shows iterative product refinement rather than isolated code generation.
- **Potential Impact:** documents how Codex accelerated delivery of an otherwise complex workflow.
- **Quality of the Idea:** preserves the team’s product insight while using Codex to realize it effectively.

## 12. Evaluation and Success Metrics

| Dimension | MVP target |
|---|---:|
| Distinct systems investigated | At least 4 |
| Evidence items collected | At least 8 |
| Dynamically selected follow-up checks | At least 1 |
| Material conclusions with valid evidence citations | 100% |
| State-changing actions executed without approval | 0 |
| Approved actions linked to audit records | 100% |
| Successful action followed by verification | 100% |
| Demo duration | Under 3 minutes |
| Core scenario outcome | Correct diagnosis and verified recovery |

### 12.1 Required Automated Evaluations

- Correctly identifies the IAM policy change as the root cause.
- Does not conclude that `AccessDenied` alone proves an IAM change.
- Requests additional evidence when the initial evidence is ambiguous.
- Rejects unsupported evidence citations.
- Prevents execution before approval.
- Prevents execution when the approved action hash does not match.
- Handles a rejected action without changing state.
- Detects failed verification and avoids false resolution.
- Redacts configured sensitive fields from the audit timeline.

## 13. Hackathon Judging Traceability

| Judging criterion | What OpsPilot will demonstrate |
|---|---|
| Technological Implementation | GPT-5.6 creates typed plans, selects tools, adapts to evidence, synthesizes cited hypotheses, proposes governed actions, and verifies results. Codex materially builds and tests the system. |
| Design | A polished, coherent journey from incident intake through investigation, approval, recovery, and documentation, with visible progress and clear trust boundaries. |
| Potential Impact | A credible reduction in investigation, coordination, and documentation effort for a specific real-world operations audience. |
| Quality of the Idea | An evidence-first digital engineer differentiated by adaptive investigation, approval-bound actions, outcome verification, and auditability. |

## 14. Delivery Priorities

### Must Have

- BR-01 through BR-11
- One reliable golden-path incident
- GPT-5.6 structured planning and adaptive tool use
- Approval-bound sandbox remediation
- Post-action verification
- Audit timeline
- Automated safety evaluations
- Substantial Codex implementation evidence

### Should Have

- BR-12 historical incident retrieval
- Failure and retry states
- Jira preventive-action creation
- Investigation replay

### Could Have

- One live read-only integration
- Codex-generated configuration patch as a stretch workflow
- Additional incident scenarios
- Slack or Teams notification

## 15. Review Decisions Required Before Implementation

1. Approve the Customer360 IAM/S3 incident as the single golden-path scenario.
2. Approve realistic simulated connectors for all MVP systems, or select one read-only live integration.
3. Confirm Next.js/TypeScript as the implementation stack.
4. Confirm local SQLite persistence for the judging demo.
5. Confirm that IAM restoration and job retry remain sandbox actions.
6. Decide whether historical learning is included before or after the core workflow is complete.
7. Confirm the final product name and visual identity.

---

## Approval

| Role | Name | Decision | Date |
|---|---|---|---|
| Product owner |  | Pending |  |
| Technical owner |  | Pending |  |

