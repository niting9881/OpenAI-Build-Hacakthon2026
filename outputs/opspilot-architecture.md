# OpsPilot AI Architecture

## 1. Architectural intent

OpsPilot AI is designed around one governing principle:

> **GPT-5.6 owns investigation reasoning; deterministic application controls own authority, execution, and closure.**

The system separates probabilistic reasoning from security-sensitive decisions. GPT-5.6 can plan, select bounded diagnostic tools, identify evidence gaps, and synthesize cited hypotheses. It cannot grant itself permission, construct arbitrary write actions, approve remediation, execute external changes, or declare an incident resolved.

## 2. Layered component architecture

```mermaid
flowchart TB
    User["Data Engineer / SRE / Incident Commander"]

    subgraph T1["Tier 1 — Experience and Interaction"]
        UI["Next.js Incident Workspace"]
        Timeline["Plan, Evidence, Timeline, Diagnosis"]
        ApprovalUI["Exact Action Review and Approval"]
        DocsUI["Grounded Resolution Drafts"]
    end

    subgraph T2["Tier 2 — Application and API Boundary"]
        InvestigationAPI["Investigation API"]
        DecisionAPI["Action Decision API"]
        DocumentationAPI["Documentation API"]
        PublicationAPI["Publication Decision API"]
        ResetAPI["Sandbox Reset API"]
        Validation["Zod Request Validation and Size Limits"]
    end

    subgraph T3["Tier 3 — Agentic Reasoning and Orchestration"]
        Orchestrator["Adaptive Investigation Orchestrator"]
        Provider["Reasoning Provider Interface"]
        GPT["Live GPT-5.6 Responses API Provider"]
        Deterministic["Deterministic Test Provider"]
        CitationGate["Citation and Sufficiency Validation"]
    end

    subgraph T4["Tier 4 — Tool and Evidence Plane"]
        Registry["Typed Read-Only Tool Registry"]
        DBX["Databricks Diagnostic Adapter"]
        AWS["AWS S3 / IAM Diagnostic Adapters"]
        GitHub["GitHub Change Adapter"]
        Knowledge["Runbook and Incident-History Adapters"]
        Evidence["Normalized Evidence Records"]
    end

    subgraph T5["Tier 5 — Governance, Action, and Verification"]
        Proposal["Deterministic Remediation Builder"]
        Hash["Canonical Payload and SHA-256 Hash"]
        Policy["Approval, Expiry, Integrity, and Idempotency Gate"]
        Executor["Allowlisted Sandbox Executor"]
        Verify["S3 and Databricks Recovery Verification"]
        Generator["Grounded Documentation Generator"]
        PublishGate["Separate Publication Approval"]
    end

    subgraph T6["Tier 6 — State, Audit, and Security"]
        SQLite["SQLite Operational Store"]
        Audit["Append-Only Audit Events"]
        Redaction["Redaction and Plain-Text Sanitization"]
        Headers["CSP and Security Headers"]
        Secrets["Server-Side Environment Secrets"]
    end

    subgraph External["External / Simulated System Boundary"]
        OpenAI["OpenAI Responses API"]
        DatabricksSystem["Databricks"]
        AWSSystem["AWS"]
        GitHubSystem["GitHub"]
        ServiceSystems["ServiceNow / Jira"]
    end

    User --> UI
    UI --> Timeline
    UI --> ApprovalUI
    UI --> DocsUI

    UI --> InvestigationAPI
    ApprovalUI --> DecisionAPI
    DocsUI --> DocumentationAPI
    DocsUI --> PublicationAPI
    UI --> ResetAPI

    InvestigationAPI --> Validation --> Orchestrator
    Orchestrator --> Provider
    Provider --> GPT --> OpenAI
    Provider --> Deterministic
    Orchestrator --> Registry
    Orchestrator --> CitationGate

    Registry --> DBX --> DatabricksSystem
    Registry --> AWS --> AWSSystem
    Registry --> GitHub --> GitHubSystem
    Registry --> Knowledge
    DBX --> Evidence
    AWS --> Evidence
    GitHub --> Evidence
    Knowledge --> Evidence
    Evidence --> Orchestrator

    CitationGate --> Proposal --> Hash --> SQLite
    DecisionAPI --> Policy --> Executor
    Hash --> Policy
    Executor --> Verify
    Verify --> SQLite
    Verify --> Generator
    DocumentationAPI --> Generator
    Generator --> Redaction --> SQLite
    PublicationAPI --> PublishGate --> ServiceSystems

    InvestigationAPI --> SQLite
    Orchestrator --> SQLite
    Policy --> Audit
    Verify --> Audit
    SQLite --> Audit
    Headers --> UI
    Secrets --> GPT
```

## 3. Tier responsibilities

### Tier 1 — Experience and interaction

The browser presents a structured incident workspace rather than a chat-only interface.

| Component | Responsibility |
|---|---|
| Incident workspace | Starts an investigation and shows the seeded incident context. |
| Plan and timeline | Makes GPT-5.6 planning and adaptive decisions visible to the operator. |
| Evidence explorer | Shows evidence source, reliability, sensitivity, summary, and reference. |
| Diagnosis view | Displays ranked hypotheses and clickable evidence citations. |
| Approval panel | Shows the exact target, resource, risk, rollback, expiry, and action hash. |
| Documentation workspace | Displays four grounded drafts and their publication decisions. |

Conversational input is supplementary. It cannot call tools, approve remediation, or bypass state transitions.

### Tier 2 — Application and API boundary

Next.js route handlers provide the trusted server boundary.

| API | Purpose | Security behavior |
|---|---|---|
| `POST /api/investigations` | Starts planning, evidence collection, adaptation, and synthesis. | Strict input schema, incident allowlist, sanitized error response. |
| `POST /api/actions/decision` | Approves or rejects the stored remediation. | Requires investigation ID, exact action hash, and explicit decision. |
| `POST /api/documentation` | Generates grounded drafts after verified recovery. | Loads persisted verified facts rather than browser/model context. |
| `POST /api/documentation/decision` | Records a separate outbound-document decision. | Publication approval is distinct from remediation approval. |
| `POST /api/demo/reset` | Resets sandbox state for a reproducible demo. | Requires an explicit confirmation literal; production hardening still requires authentication. |

Zod schemas reject malformed, unknown, over-posted, or structurally unsafe requests.

### Tier 3 — Agentic reasoning and orchestration

The orchestrator coordinates GPT-5.6 but does not delegate security policy to it.

GPT-5.6 performs three bounded reasoning operations:

1. **Plan:** create an initial investigation using only the supplied read tools and allowlisted sandbox identifiers.
2. **Assess:** determine whether evidence is sufficient, should be expanded, or must be escalated.
3. **Synthesize:** rank hypotheses and produce a conclusion citing only available evidence IDs.

The live validated sequence is:

```text
Initial plan
  → collect Databricks, S3, IAM, and runbook evidence
  → GPT-5.6 detects missing causal history
  → gather_more
  → select IAM history and GitHub change tools
  → synthesize
```

The deterministic provider implements the same interface for reproducible tests without API credentials or model variance.

### Tier 4 — Tool and evidence plane

The tool registry is the only path from reasoning to diagnostic systems.

Every registered tool has:

- a unique allowlisted name;
- a strict input schema;
- read-only classification;
- bounded timeout;
- bounded result size;
- deterministic resource restrictions; and
- normalized evidence output.

The model cannot dynamically create a tool or execute an unregistered name. Each simulated adapter represents one bounded source snapshot, so execution is idempotent by tool name inside an investigation.

Evidence is normalized into a common contract:

```text
evidence ID + source system + source type + observed time
+ title + summary + raw reference + reliability + sensitivity
+ related task + simulation label + structured attributes
```

Tool output remains untrusted evidence. Content inside a log, runbook, pull request, or historical incident cannot modify policy or authorize an action.

### Tier 5 — Governance, action, and verification

This tier creates the separation between reasoning and authority.

The remediation builder is deterministic. It creates an allowlisted sandbox action containing:

- exact tool and arguments;
- target resource;
- expected result;
- risk;
- preconditions;
- rollback instructions;
- verification steps;
- expiration; and
- SHA-256 hash of the canonical action payload.

The decision service reloads the stored action and recomputes integrity. Execution is permitted only when the submitted hash matches the stored column and canonical payload, the approval window is current, and no outcome already exists.

The executor returns an idempotent sandbox outcome. The incident becomes resolved only when both checks pass:

```text
S3 access verified = true
Databricks retry status = SUCCESS
```

Documentation is downstream of verified recovery. Drafts are generated only from persisted incident facts, cited synthesis, evidence, and action outcome. A remediation approval never implies permission to publish an external record.

### Tier 6 — State, audit, and security

SQLite stores incidents, investigations, tasks, evidence, reasoning results, remediation actions, outcomes, documentation bundles, publication decisions, and audit events.

Security controls span all tiers:

- server-side secrets loaded from `.env.local`;
- no credential returned to the browser;
- strict schemas and content-length limits;
- untrusted-evidence handling;
- evidence-citation validation;
- read/write tool separation;
- canonical action hashing;
- approval expiry and idempotency;
- sanitization and secret-pattern redaction;
- Content Security Policy and browser security headers; and
- transparent labeling of simulated external data.

## 4. End-to-end interaction sequence

```mermaid
sequenceDiagram
    autonumber
    actor Operator
    participant UI as Next.js Workspace
    participant API as Investigation API
    participant Orch as Adaptive Orchestrator
    participant GPT as GPT-5.6
    participant Tools as Read-Only Tool Registry
    participant Store as SQLite / Audit
    participant Gov as Approval Governance
    participant Exec as Sandbox Executor
    participant Docs as Documentation Generator

    Operator->>UI: Start investigation
    UI->>API: POST incident ID
    API->>Store: Create investigation and audit event
    API->>Orch: Run bounded investigation
    Orch->>GPT: Plan with initial tools and allowlisted resources
    GPT-->>Orch: Structured initial plan
    Orch->>Tools: Execute typed initial read calls
    Tools-->>Orch: Normalized evidence E-01...E-04/E-07
    Orch->>GPT: Assess evidence sufficiency
    GPT-->>Orch: gather_more + IAM/GitHub follow-up calls
    Orch->>Tools: Execute reserved adaptive tools
    Tools-->>Orch: Causal evidence E-05/E-06
    Orch->>GPT: Synthesize ranked cited hypotheses
    GPT-->>Orch: Conclusion + evidence IDs + remediation readiness
    Orch->>Orch: Validate every citation and tool boundary
    Orch->>Store: Persist plan, evidence, revisions, and synthesis
    API->>Gov: Build deterministic action and canonical hash
    Gov->>Store: Persist pending action
    API-->>UI: Diagnosis and exact proposal

    Operator->>UI: Approve exact sandbox action
    UI->>Gov: Investigation ID + action hash + decision
    Gov->>Store: Reload and recompute action integrity
    Gov->>Exec: Execute once if current and matching
    Exec->>Exec: Restore simulated permission
    Exec->>Exec: Verify S3 and retry Databricks job
    Exec->>Store: Persist resolved outcome and audit event
    Exec-->>UI: Recovery verified

    Operator->>UI: Generate resolution drafts
    UI->>Docs: Investigation ID
    Docs->>Store: Load persisted verified record
    Docs->>Docs: Validate citations, redact, and sanitize
    Docs->>Store: Persist four drafts
    Docs-->>UI: Work note, stakeholder, Jira, and report drafts
    Operator->>UI: Separately approve or reject publication
    UI->>Store: Persist publication decision
```

## 5. Trust boundaries and authority flow

```mermaid
flowchart LR
    subgraph Untrusted["Untrusted / Probabilistic Zone"]
        IncidentText["Incident text"]
        ToolOutput["Logs, policies, PRs, runbooks"]
        ModelOutput["GPT-5.6 plan and synthesis"]
        Chat["Conversational input"]
    end

    subgraph ValidationZone["Validation and Evidence Zone"]
        InputSchemas["Strict schemas"]
        ToolAllowlist["Tool and resource allowlists"]
        EvidenceContract["Normalized evidence"]
        CitationValidation["Citation validation"]
    end

    subgraph AuthorityZone["Deterministic Authority Zone"]
        StateMachine["State transitions"]
        ActionBuilder["Exact action builder"]
        Integrity["Hash, expiry, idempotency"]
        Human["Human approval"]
        Verification["Recovery verification"]
    end

    subgraph Effects["Controlled Effects"]
        Sandbox["Sandbox state change"]
        Resolution["Resolved outcome"]
        Drafts["Grounded drafts"]
    end

    IncidentText --> InputSchemas
    ToolOutput --> EvidenceContract
    ModelOutput --> InputSchemas
    Chat --> InputSchemas
    InputSchemas --> ToolAllowlist
    ToolAllowlist --> EvidenceContract
    EvidenceContract --> CitationValidation
    CitationValidation --> StateMachine
    StateMachine --> ActionBuilder
    ActionBuilder --> Integrity
    Human --> Integrity
    Integrity --> Sandbox
    Sandbox --> Verification
    Verification --> Resolution
    Resolution --> Drafts

    ModelOutput -. cannot approve .-> Human
    ToolOutput -. cannot authorize .-> Integrity
    Chat -. cannot execute .-> Sandbox
```

The solid path is the only valid authority path. Dashed relationships are explicitly denied.

## 6. Deployment topology

```mermaid
flowchart LR
    Browser["Judge / Operator Browser"]

    subgraph App["Next.js Application Container"]
        Web["React UI and Route Handlers"]
        Runtime["Orchestrator, Providers, Tools, Governance"]
        LocalDB["SQLite on Persistent Volume"]
    end

    Env["Server Environment\nOPENAI_API_KEY\nOPENAI_MODEL\nOPSPILOT_REASONING_MODE"]
    OpenAIAPI["OpenAI Responses API"]
    Fixtures["Bundled Sandbox Fixtures"]

    Browser <-->|HTTPS| Web
    Web --> Runtime
    Runtime <--> LocalDB
    Env --> Runtime
    Runtime -->|Live reasoning only| OpenAIAPI
    Runtime -->|Reproducible diagnostics/actions| Fixtures
```

The public hackathon deployment should use deterministic fixtures for enterprise systems and a server-side OpenAI key for the live reasoning demonstration. No real enterprise credential or production cloud write permission is required.

## 7. Source-code component map

| Path | Architectural role |
|---|---|
| `src/app` | UI composition and server API routes |
| `src/components` | Operator incident workspace |
| `src/domain` | Zod domain contracts and state machine |
| `src/reasoning` | GPT-5.6 and deterministic provider implementations |
| `src/orchestration` | Planning, tool execution, adaptation, citation enforcement |
| `src/tools` | Registry, adapters, allowlisted fixtures |
| `src/actions` | Canonical remediation and cryptographic hashing |
| `src/documentation` | Verified-record document generation and sanitization |
| `src/security` | Recursive sensitive-field redaction |
| `src/db` | SQLite initialization, persistence, outcomes, and audit records |
| `tests/e2e` | Desktop/mobile full-product validation |

## 8. What is live versus simulated

| Capability | Implementation |
|---|---|
| GPT-5.6 planning, assessment, adaptation, synthesis | Live OpenAI Responses API; separately validated end to end |
| Deterministic reasoning | Credential-free reproducible test provider |
| Databricks diagnostics | Realistic simulated fixture adapter |
| AWS S3/IAM diagnostics | Realistic simulated fixture adapters |
| GitHub change evidence | Realistic simulated fixture adapter |
| IAM remediation and job retry | Deterministic sandbox execution |
| ServiceNow/Jira creation | Draft and approval flow only; connector not configured |

This separation is intentional: the hackathon demonstrates substantive live GPT-5.6 reasoning and safe enterprise-agent architecture without requiring judges to grant real infrastructure access.
