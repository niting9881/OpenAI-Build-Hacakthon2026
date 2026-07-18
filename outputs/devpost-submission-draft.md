# Devpost Submission Draft — OpsPilot AI

Verified against the OpenAI Build Week requirements on July 16, 2026. Replace every `[OWNER REQUIRED]` value before submission.

## Project name

OpsPilot AI

## Category

Developer Tools

Secondary positioning: Work & Productivity.

## Tagline

An evidence-first digital engineer that investigates data incidents, governs remediation with cryptographic approval, verifies recovery, and drafts grounded follow-up work.

## Project description

Data-platform incidents force responders to correlate fragmented evidence across Databricks, AWS, GitHub, runbooks, and historical incidents. Existing copilots can summarize logs, but they often stop before action—or propose unsafe automation without a trustworthy control boundary.

OpsPilot AI demonstrates a safer closed-loop approach. GPT-5.6 creates an investigation plan, selects allowlisted diagnostic tools, assesses the evidence, adapts when it detects a gap, and produces ranked hypotheses with explicit evidence citations. Deterministic application code—not the model—constructs a narrowly scoped remediation, hashes the complete action payload, requires a human decision, executes it once in a sandbox, and closes the incident only after fresh recovery checks succeed.

After recovery, OpsPilot generates four grounded drafts: a ServiceNow work note, stakeholder update, preventive Jira item, and incident report. Each draft is built only from persisted verified facts and requires a separate publication decision.

## What makes it different

OpsPilot does not treat “agentic” as permission to act freely. Its core innovation is separation of responsibilities:

- GPT-5.6 owns planning, tool selection, adaptive investigation, and evidence synthesis.
- Typed tools constrain what evidence can be collected.
- Deterministic policy code owns transitions, authorization, action integrity, idempotency, verification, and closure.
- Humans approve the exact action rather than a vague natural-language intention.

## How GPT-5.6 is used

GPT-5.6 visibly performs structured runtime reasoning: it plans the investigation, selects tools from the registered allowlist, evaluates evidence sufficiency, requests targeted follow-up evidence, and synthesizes cited hypotheses. Model outputs are schema-validated and cannot directly approve actions, broaden tool permissions, execute writes, or mark incidents resolved.

## How Codex was used

Codex materially built the project throughout the hackathon. It translated the initial business concept into staged requirements and architecture, implemented the Next.js interface and typed domain contracts, created simulated multi-system adapters, separated GPT reasoning from deterministic governance, implemented approval hashing and idempotent execution, diagnosed SQLite concurrency during production builds, and created the unit, component, security, and desktop/mobile end-to-end suites.

Key owner decisions made during collaboration included choosing an evidence-first structured workspace instead of chat-only interaction, keeping write operations behind explicit approval, making the reproducible demo deterministic by default, and clearly labeling simulated integrations.

## Technologies

Next.js, React, TypeScript, OpenAI Responses API, GPT-5.6 provider boundary, Zod, SQLite, Drizzle schemas, Vitest, Testing Library, Playwright, Docker, simulated Databricks/AWS/GitHub/ServiceNow/Jira adapters.

## Testing instructions

1. Clone the repository.
2. Install Node.js 24 LTS.
3. Run `npm ci` and `npm run dev`.
4. Open `http://localhost:3000`.
5. Start the Customer360 investigation and follow the guided workflow.
6. Approve or reject the sandbox remediation.
7. On approval, generate the grounded resolution drafts and separately approve one external draft.
8. Use **Reset demo** before another run.

No credentials are required in deterministic demo mode. Docker users can run `docker compose up --build`.

## Links

- Repository: `[OWNER REQUIRED: PUBLIC REPOSITORY URL]`
- Working demo/test build: `[OWNER REQUIRED: JUDGE-ACCESSIBLE URL]`
- Public YouTube video under 3 minutes: `[OWNER REQUIRED: VIDEO URL]`
- Codex `/feedback` Session ID: `[OWNER REQUIRED: SESSION ID]`

## Disclosure and limitations

The reproducible build uses realistic simulated enterprise-system fixtures and does not mutate real AWS or Databricks resources. External ServiceNow/Jira connectors are not configured. The OpenAI live-provider path requires an owner-supplied server-side key. Authentication/RBAC, distributed persistence, real rollback execution, and production connector authorization are outside this hackathon MVP.
