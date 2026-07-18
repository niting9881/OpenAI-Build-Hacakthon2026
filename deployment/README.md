# OpsPilot AI Deployment Bundle

## Recommended target: Railway

Railway is the recommended hackathon host because this repository already contains
a root Dockerfile and the application stores its demo state in one SQLite file.
Railway can build the Dockerfile directly, issue a public HTTPS domain, run the
included health check, and attach a persistent volume without introducing AWS
networking, IAM, load-balancer, or container-registry setup.

AWS is not required. In particular, AWS App Runner uses ephemeral container
storage, so SQLite state is not guaranteed to survive restarts or scaling. Running
the current design on AWS with persistence would require a more involved ECS/Fargate
plus EFS design, or replacing SQLite with a managed database.

## Railway deployment

1. Merge the deployment files into the repository's `main` branch.
2. In Railway, create a project and choose **Deploy from GitHub repo**.
3. Select `niting9881/OpenAI-Build-Hacakthon2026`.
4. Railway detects the root `Dockerfile` and `railway.toml`.
5. Add a volume mounted at `/app/work`.
6. Add these service variables:

   ```text
   OPSPILOT_REASONING_MODE=deterministic
   OPSPILOT_DB_PATH=/app/work/opspilot-demo.db
   NODE_ENV=production
   ```

7. Do not add `OPENAI_API_KEY` to the public judge deployment. The deterministic
   mode demonstrates the complete workflow without cost or credential exposure.
8. Under **Networking**, generate a Railway public domain.
9. Confirm `https://<generated-domain>/api/health` returns:

   ```json
   {"status":"ok","service":"opspilot-ai","mode":"deterministic"}
   ```

10. Run the judge verification checklist below from an incognito browser.

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

- Use deterministic mode for the public demo.
- Never include `.env.local`, API keys, database files, build caches, or logs in
  the deployment bundle.
- Keep only one replica.
- Enable the platform's spending limit and deployment notifications.
- Do not configure real AWS, Databricks, GitHub, ServiceNow, or Jira credentials.
- Reset the demo before recording and immediately before final judge verification.
- Revoke the previously shared OpenAI key before any deployment.
- Remove the deployment and its volume after judging is complete.

The prototype intentionally exposes a demo reset and simulated approval workflow.
Do not reuse this deployment for production data or real infrastructure actions.

## Judge verification

1. Open the generated HTTPS URL in an incognito browser.
2. Confirm the incident workspace loads without credentials.
3. Start the Customer360 investigation.
4. Confirm the visible sequence reaches `gather_more` and then `synthesize`.
5. Review and approve the exact sandbox action.
6. Confirm S3 access verification and a successful Databricks retry.
7. Generate the four grounded documents.
8. Record a separate publication decision.
9. Use **Reset demo** and confirm a fresh run succeeds.
10. Repeat the main path using a mobile viewport.

## Bundle contents

The generated ZIP contains the application source, Dockerfile, Railway
configuration, Compose configuration, sample fixtures, tests, setup instructions,
license, and this deployment guide. It intentionally excludes secrets,
dependencies, build caches, databases, test output, screenshots, and submission
working files.

