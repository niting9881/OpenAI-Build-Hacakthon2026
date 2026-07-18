# Live GPT-5.6 Validation Evidence

Validation date: July 18, 2026  
Environment: Local production build with server-side `.env.local`  
Credential handling: Key presence was checked without printing the value; the key is excluded by `.gitignore`.

## API access

- OpenAI Responses API smoke test: passed
- Configured model: `gpt-5.6`
- Model returned by the smoke-test response: `gpt-5.6-sol`
- Response status: completed

## Integration corrections discovered during live validation

1. Replaced an open-ended record in the structured tool-call schema with a finite union accepted by strict Responses API JSON Schema.
2. Increased the bounded live request timeout from 30 to 90 seconds for high-effort structured reasoning.
3. Added exact non-secret sandbox resources to the model context so selected tool arguments stay inside the deterministic allowlist.
4. Reserved IAM and GitHub change-history tools for the adaptive evidence-assessment step.
5. Required each executable plan task to contain a tool call.
6. Enforced adaptive-tool scope and per-tool idempotency to prevent duplicate fixed evidence.
7. Added a sanitized API failure response instead of an opaque 500.

## Successful live agentic run

- Investigation: `INV-9862BC45`
- Provider mode: `live`
- Configured provider model: `gpt-5.6`
- Initial evidence: Databricks run/log, S3 access, effective IAM policy, and runbook
- Adaptive decision sequence: `gather_more → synthesize`
- Adaptively selected tools:
  - `get_iam_change_history`
  - `get_recent_github_changes`
- Final cited evidence: `E-01, E-02, E-03, E-04, E-05, E-06`
- Remediation readiness: true
- Hash-bound remediation proposal: generated

## Closed-loop outcome

- Approval: approved for the exact stored sandbox action
- Execution status: resolved
- Permission restored: true
- S3 access verified: true
- Databricks job retry: SUCCESS
- Grounded drafts generated:
  - ServiceNow work note
  - Stakeholder update
  - Preventive Jira item
  - Incident report
- Draft citations: `E-01, E-02, E-03, E-04, E-05, E-06`
- External posting: not configured; drafts remain subject to separate approval

## Claim supported for submission

The working system now visibly demonstrates that GPT-5.6 plans an investigation, selects bounded tools, assesses evidence, adapts its investigation with targeted follow-up calls, synthesizes cited evidence, and hands a remediation proposal to deterministic approval and closed-loop verification controls.

## Regression verification

- ESLint: passed
- TypeScript: passed
- Unit/component tests after live-integration changes: 31 passed across 9 files
- Production build with `.env.local`: passed
