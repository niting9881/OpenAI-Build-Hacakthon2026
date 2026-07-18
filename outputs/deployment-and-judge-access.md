# Deployment and Judge-Access Guide

## Required availability window

The official rules require a free working project link, functioning demo, or test build to remain available through the judging period. The published schedule lists judging from July 22 through August 5, 2026; keep access available until judging is complete.

## Recommended deployment shape

Deploy the included Docker image to a service that supports persistent volumes and server-side environment variables.

Required configuration:

```text
OPSPILOT_REASONING_MODE=deterministic
OPSPILOT_DB_PATH=/app/work/opspilot-demo.db
```

Expose port 3000, mount persistent storage at `/app/work`, and enable HTTPS. Do not configure any real AWS, Databricks, ServiceNow, Jira, or GitHub credentials for the public demo.

## Pre-publication safety gate

The current application is designed as a sandbox prototype. Before public hosting, protect `/api/demo/reset` and approval endpoints behind at least a shared judge access layer or platform authentication. Use deterministic mode unless the live-model environment has appropriate server-side access control and spending limits.

## Judge verification

From an incognito browser:

1. Open `[OWNER REQUIRED: DEMO URL]`.
2. Complete the approve path through grounded document generation.
3. Reset and complete the reject path.
4. Confirm no login loop, mixed-content warning, console error, or mobile clipping.
5. Confirm the demo contains no credentials or real enterprise data.

## Repository access

Preferred: public repository with the included MIT license.

If private, share access with both addresses required by the official rules:

- `testing@devpost.com`
- `build-week-event@openai.com`

Repository URL: `[OWNER REQUIRED]`

## Shutdown

After judging: revoke temporary OpenAI keys, remove deployment secrets, export only non-sensitive logs needed for records, stop/delete the deployment, and delete any separately configured sandbox cloud resources.
