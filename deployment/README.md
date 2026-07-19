# OpsPilot AI Deployment Bundle

## Recommended target: Railway with live GPT-5.6

Railway is the recommended hackathon host because this repository already contains
a root Dockerfile and the application stores its demo state in one SQLite file.
Railway can build the Dockerfile directly, issue a public HTTPS domain, run the
included health check, and attach a persistent volume without introducing AWS
networking, IAM, load-balancer, or container-registry setup.

The primary judge deployment should use **live reasoning**. This makes the
substantive GPT-5.6 contribution visible at runtime: planning, bounded tool
selection, evidence-sufficiency assessment, `gather_more` adaptation, and cited
synthesis. Deterministic mode remains the reproducible fallback for automated
testing and API outages; it should not be the only judge-facing demonstration.

AWS is not required. In particular, AWS App Runner uses ephemeral container
storage, so SQLite state is not guaranteed to survive restarts or scaling. Running
the current design on AWS with persistence would require a more involved ECS/Fargate
plus EFS design, or replacing SQLite with a managed database.

## Recommended judge strategy

Use one of these two arrangements:

1. **Best:** deploy two Railway services from the same commit:
   - `opspilot-live` uses GPT-5.6 and is the primary Devpost demo URL;
   - `opspilot-fallback` uses deterministic reasoning and is listed in the README
     as the backup URL.
2. **Minimum:** deploy one live service and keep the deterministic Docker bundle
   ready. If API availability becomes a problem, change
   `OPSPILOT_REASONING_MODE` to `deterministic` and redeploy.

The two-service arrangement is stronger for judging because it proves real model
use while preserving a credential-free, reliable evaluation path.

## Railway deployment

1. Merge the deployment files into the repository's `main` branch.
2. In Railway, create a project and choose **Deploy from GitHub repo**.
3. Select `niting9881/OpenAI-Build-Hacakthon2026`.
4. Railway detects the root `Dockerfile` and `railway.toml`.
5. Add a volume mounted at `/app/work`.
6. For the primary live service, add:

   ```text
   OPSPILOT_REASONING_MODE=live
   OPENAI_MODEL=gpt-5.6
   OPENAI_API_KEY=<Railway secret>
   OPSPILOT_DB_PATH=/app/work/opspilot-demo.db
   NODE_ENV=production
   ```

7. Create a new OpenAI project specifically for the hackathon deployment and
   generate a new project key. Store it only as a Railway secret. Do not reuse the
   key previously shared in chat or place a populated key in source control.
8. In the OpenAI project settings, allow only the required model, set conservative
   model rate limits, and configure budget alerts. Treat the project budget as an
   alert rather than a hard spending cap.
9. Keep the live URL in the Devpost submission and demo video rather than
   advertising it broadly. Monitor usage during the judging window.
10. For the optional fallback service, deploy the same commit with:

   ```text
   OPSPILOT_REASONING_MODE=deterministic
   OPSPILOT_DB_PATH=/app/work/opspilot-demo.db
   NODE_ENV=production
   ```

   Do not set `OPENAI_API_KEY` on the fallback service.
11. Under **Networking**, generate a Railway public domain.
12. Confirm the live service health response reports `"mode":"live"`:

   ```json
   {"status":"ok","service":"opspilot-ai","mode":"live"}
   ```

13. Run the judge verification checklist below from an incognito browser.

The service must remain a single replica while using SQLite. Do not enable
horizontal scaling with a single attached volume.

## Render fallback

Render can also build the root Dockerfile and provide an HTTPS `onrender.com`
domain. Use a paid web service with a persistent disk mounted at `/app/work`, then
set the same environment variables. Render's free service filesystem is ephemeral,
and persistent disks are available only on paid services.

## AWS alternative

Use AWS only if you already have AWS deployment experience or credits. A durable
version of the current design would require:

- ECR for the container image;
- ECS/Fargate for the service;
- an Application Load Balancer and HTTPS certificate;
- EFS mounted at `/app/work` for SQLite persistence;
- CloudWatch logs; and
- restricted task IAM permissions.

For a hackathon demo this adds operational risk without improving the judged
product experience. If AWS deployment is strategically important, replace SQLite
with a managed relational database before allowing multiple application replicas.

## Security configuration

- Use a dedicated OpenAI project and a newly generated deployment key for live
  reasoning.
- Restrict model usage and model-level rate limits in the OpenAI project.
- Configure multiple budget-alert thresholds and actively monitor usage; project
  budgets are soft alerts and do not stop API requests.
- Keep the deterministic deployment available as the no-key fallback.
- Never include `.env.local`, API keys, database files, build caches, or logs in
  the deployment bundle.
- Keep only one replica.
- Enable the platform's spending limit and deployment notifications.
- Do not configure real AWS, Databricks, GitHub, ServiceNow, or Jira credentials.
- Reset the demo before recording and immediately before final judge verification.
- Revoke the previously shared OpenAI key before any deployment.
- Rotate the deployment key and remove it from Railway after judging.
- Remove the deployment and its volume after judging is complete.

The prototype intentionally exposes a demo reset and simulated approval workflow.
Do not reuse this deployment for production data or real infrastructure actions.

## Judge verification

1. Open the generated HTTPS URL in an incognito browser.
2. Confirm the incident workspace loads without credentials.
3. Start the Customer360 investigation.
4. Confirm the UI identifies the provider as `live` and the model as GPT-5.6.
5. Confirm the visible sequence reaches `gather_more` and then `synthesize`.
6. Review and approve the exact sandbox action.
7. Confirm S3 access verification and a successful Databricks retry.
8. Generate the four grounded documents.
9. Record a separate publication decision.
10. Use **Reset demo** and confirm a fresh run succeeds.
11. Repeat the main path using a mobile viewport.

## Bundle contents

The generated ZIP contains the application source, Dockerfile, Railway
configuration, Compose configuration, sample fixtures, tests, setup instructions,
license, and this deployment guide. It intentionally excludes secrets,
dependencies, build caches, databases, test output, screenshots, and submission
working files.
