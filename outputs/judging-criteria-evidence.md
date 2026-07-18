# Judging Criteria Evidence Map

## Technological Implementation

- Non-trivial typed implementation covering investigation, evidence, reasoning, approval, execution, verification, documentation, and audit persistence.
- GPT-5.6 provider boundary with structured plan, adaptive assessment, allowlisted tool selection, and cited synthesis.
- SHA-256 approval binding, expiry checks, server-side integrity recomputation, and idempotent outcomes.
- 31 unit/component tests, 10 desktop/mobile browser tests, clean TypeScript/lint, and successful production build.
- Codex contribution is documented in the README, implementation plan, session history, and submission narrative.

## Design

- Coherent incident-to-resolution workspace rather than a collection of API demonstrations.
- Evidence drill-down distinguishes sources, reliability, sensitivity, and untrusted tool output.
- Approval UI exposes target, resource, risk, rollback, and action hash.
- Final documentation separates technical, stakeholder, preventive, and incident-report audiences.
- Responsive desktop/mobile golden path and explicit empty, rejected, resolved, and draft states.

## Potential Impact

- Reduces manual correlation across five common operational evidence sources.
- Preserves human accountability for infrastructure changes.
- Verifies recovery before closure, reducing false-success incident resolution.
- Converts the verified record into operational follow-up artifacts without unsupported factual invention.

## Quality of the Idea

- Combines adaptive AI investigation with deterministic, cryptographically bound governance.
- Treats model/tool output as evidence rather than authority.
- Separates remediation approval from publication approval.
- Demonstrates a reusable pattern for trustworthy enterprise agents beyond the seeded incident.

## Evidence to show judges

1. Investigation plan and adaptive follow-up timeline.
2. E-05/E-06 source drill-down and cited diagnosis.
3. Exact remediation proposal and action hash.
4. Verified S3 access and successful job retry.
5. Four grounded drafts and separate external approval.
6. Security/evaluation report and automated test totals.
