# Stage 6 Security and Evaluation Report

Date: July 16, 2026  
Release candidate: OpsPilot AI 0.1.0

## Controls under evaluation

- Strict API and model-output schemas reject over-posting and malformed data.
- Tool selection is constrained to typed, registered, read-only tools during investigation.
- Prompt or conversational text cannot construct approval or invoke writes.
- Remediation approval matches the persisted SHA-256 action hash, expires, and is idempotent.
- Rejection produces no simulated state change.
- Resolution requires S3 verification and a successful Databricks retry.
- Documentation requires a persisted resolved outcome and valid evidence citations.
- Generated drafts strip markup and links and redact key/token/account patterns.
- Publication decisions are distinct from remediation approval; no connector is configured.
- Security headers deny framing and content-type sniffing.

## Release-gate evidence

| Gate | Required result |
|---|---|
| ESLint | Passed, zero errors |
| TypeScript | Passed |
| Unit/component tests | 31 passed across 9 files |
| Production build | Passed; 1 static page and 5 API routes |
| Desktop/mobile Playwright | 10 passed |
| Dependency audit | No high/critical findings; 2 moderate PostCSS advisories inherited through Next.js, no fix currently available |
| Secret scan | No project keys, AWS access keys, or private-key blocks in non-test repository files; redaction tests intentionally contain synthetic signatures |

## Threats explicitly tested

Malformed/oversized input, unregistered tools, duplicate calls, prompt-injection-like action commands, missing citations, changed action payloads, rejection, documentation before verified recovery, unsupported citations, secret patterns, executable markup, unsafe links, and external publication without a stored draft.

## Known residual risks

This is a single-user sandbox prototype. Authentication, RBAC, production secrets management, durable distributed idempotency, real connector authorization, SIEM export, rollback execution, and cloud isolation require production engineering. No real enterprise credentials or data should be introduced into the public demo.

## Shutdown plan

After judging, revoke any temporary OpenAI project key, remove hosted environment variables, disable or delete the demo deployment, archive logs after confirming they contain no secrets, and delete sandbox cloud resources if live adapters were separately configured.
