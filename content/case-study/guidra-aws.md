---
title: "Guidra — Deploying and Operating a Production Application on AWS"
description: "Users → Cloudflare → AWS ALB → Multi-AZ Private EC2 → Docker/Nginx → MongoDB Atlas. A hands-on case study of AWS VPC networking, containerisation, immutable GitHub Actions CI/CD, SSM deployments, rollback and CloudWatch monitoring."
date: "2026-11-11"
tags:
  - AWS
  - VPC
  - ALB
  - EC2
  - Docker
  - Nginx
  - CI/CD
  - GitHub Actions
  - SSM
  - CloudWatch
  - Cloudflare
  - MongoDB
draft: false
---

_A hands-on case study of AWS infrastructure, networking, containerisation, CI/CD and production operations._

> **Project:** Guidra  
> **Environment:** AWS Mumbai (`ap-south-1`)  
> **Compute:** 2 × Amazon EC2 (`t3.small`, Amazon Linux 2023)  
> **Architecture:** Multi-AZ application instances in private subnets behind an internet-facing ALB  
> **Stack:** AWS, Cloudflare, Docker, Nginx, React, Node.js, MongoDB Atlas, GitHub Actions

---

## 1. Introduction

I had already worked with Linux, Docker, networking and AWS, but I wanted to understand what it actually takes to operate an application in a production environment.

Guidra became an opportunity to bring those concepts together.

Instead of deploying the application on a single publicly accessible EC2 instance, I designed an AWS environment with a dedicated VPC, public and private subnets, an Application Load Balancer and two EC2 instances across Availability Zones.

I containerised the frontend and backend separately, configured Nginx to handle application routing, connected the backend to MongoDB Atlas and automated deployments using GitHub Actions and AWS Systems Manager.

The interesting part wasn't just getting the application online. It was understanding how all these components communicate, what each component is responsible for, and what can go wrong when something doesn't work as expected.

This case study documents the architecture, implementation, decisions, challenges and things I learned along the way.

## 2. Project Goals

The main objectives were:

- Design a VPC with public and private subnets across two Availability Zones.
- Keep application EC2 instances private, without public IP addresses.
- Use an internet-facing Application Load Balancer as the application entry point.
- Run React/Nginx and Node.js as separate Docker containers.
- Use MongoDB Atlas as the external database service.
- Configure Cloudflare DNS and HTTPS.
- Automate image builds and deployments.
- Use immutable Docker image tags for traceable deployments.
- Implement a rollback mechanism for failed or problematic deployments.
- Use IAM roles and AWS Systems Manager for controlled infrastructure access.
- Monitor EC2 and ALB health through CloudWatch.

I wanted the deployment to be understandable, repeatable and maintainable, rather than simply functional.

## 3. Architecture Overview

![Guidra Production Architecture Overview](/images/case-study/guidra-aws/production-overview.png)

### Main components

|Layer|Component|Responsibility|
|---|---|---|
|DNS and proxy|Cloudflare|Domain management, proxying and edge caching|
|TLS|Cloudflare SSL/TLS and AWS ACM|Full (strict) HTTPS termination|
|Load balancing|AWS Application Load Balancer (`guidra-ALB`)|Distributes requests across AZs to EC2 targets|
|Networking|AWS VPC (`guidra-production-vpc`)|Isolated `10.0.0.0/16` network environment|
|Compute|2 × Amazon EC2 (`t3.small`)|Hosts the containerised application in private subnets|
|Operating system|Amazon Linux 2023|Runs Docker Engine, Docker Compose and SSM Agent|
|Containers|Docker Compose|Manages frontend and backend containers on a bridge network|
|Reverse proxy|Nginx (`nginx:alpine`)|Serves React static assets and proxies API traffic|
|Frontend|React 19 + Vite|User interface|
|Backend|Node.js 22 + Express 5|Application API (port 5000)|
|Database|MongoDB Atlas|Managed external database over TLS|
|Container registry|Amazon ECR (primary) & GHCR (mirror)|Stores immutable Git-SHA-tagged application images|
|CI/CD|GitHub Actions (`Guidra CI` & `Guidra Rollback`)|Linting, testing, image builds, deployment and rollback|
|Instance management|AWS Systems Manager (SSM) + EICE|Keyless deployment execution and private administrative access|
|Monitoring|Amazon CloudWatch + SNS|EC2 status checks, ALB target health alarms and log group|

### High-level request flow

1. A user accesses `guidra.tech`, `www.guidra.tech` or `api.guidra.tech`.
2. Cloudflare handles DNS resolution and proxies the HTTPS request.
3. The request reaches the internet-facing AWS Application Load Balancer (`guidra-ALB`).
4. The ALB forwards traffic to a healthy EC2 target in `guidra-app` on port `80`.
5. Nginx handles the request based on the hostname and URL path.
6. React static assets are served directly by Nginx, while `/api/` requests and `api.guidra.tech` traffic are reverse-proxied to `http://backend:5000`.
7. The Node.js backend communicates outbound with MongoDB Atlas over TLS when database access is required.

The ALB does not directly communicate with the Node.js container on port `5000`. Nginx handles that internal routing inside each host.

## 4. AWS VPC and Network Design

I created a dedicated VPC named `guidra-production-vpc` (`vpc-0105a4a47dcb3312f`) in the AWS Mumbai region (`ap-south-1`) with both DNS resolution and DNS hostnames enabled.

**VPC configuration**

|Property|Value|
|---|---|
|Region|`ap-south-1` (Mumbai)|
|VPC name|`guidra-production-vpc`|
|VPC CIDR|`10.0.0.0/16`|
|Availability Zones|`ap-south-1a`, `ap-south-1b`|
|Public subnets|2|
|Private subnets|2|
|Internet Gateway|`guidra-production-internet-gateway` (Attached)|
|NAT Gateway|`guidra-production-NAT`|

### Subnet layout

|Subnet|Name|CIDR|Availability Zone|Route Table|
|---|---|---|---|---|
|Public Subnet A|`guidra-production-public-subnet-A`|`10.0.2.0/24`|`ap-south-1a`|`mrtuxcoder-guidra-production-public-rt`|
|Public Subnet B|`guidra-production-public-subnet-B`|`10.0.1.0/24`|`ap-south-1b`|`mrtuxcoder-guidra-production-public-rt`|
|Private Subnet A|`guidra-production-private-subnet-A`|`10.0.11.0/24`|`ap-south-1a`|`mrtuxcoder-guidra-production-private-rt`|
|Private Subnet B|`guidra-production-private-subnet-B`|`10.0.12.0/24`|`ap-south-1b`|`mrtuxcoder-guidra-production-private-rt`|

### Why separate public and private subnets?

I didn't want application servers to be directly accessible from the internet.

The ALB is internet-facing and uses the public subnets (`Public Subnet A` and `Public Subnet B`). The EC2 instances run in private subnets (`Private Subnet A` and `Private Subnet B`) with `MapPublicIpOnLaunch` disabled and no public IP addresses assigned.

This separates the public entry point from the application infrastructure.

### Network components

**Internet Gateway & Public Routing**

`guidra-production-internet-gateway` is attached to the VPC. The public route table (`mrtuxcoder-guidra-production-public-rt`) is associated with both `Public Subnet A` and `Public Subnet B` and routes `0.0.0.0/0` to the Internet Gateway.

**NAT Gateway & Private Routing**

`guidra-production-NAT` provides outbound internet connectivity for private subnet resources (such as pulling ECR images, communicating with SSM/CloudWatch, calling AI provider APIs and connecting to MongoDB Atlas) without assigning public IP addresses to the EC2 instances.

Both `Private Subnet A` (`10.0.11.0/24`, `ap-south-1a`) and `Private Subnet B` (`10.0.12.0/24`, `ap-south-1b`) are associated with the shared private route table (`mrtuxcoder-guidra-production-private-rt`), which routes `10.0.0.0/16` locally and `0.0.0.0/0` to `guidra-production-NAT`. Using a single shared NAT Gateway keeps baseline infrastructure cost low, with the trade-off that private egress across both Availability Zones relies on a single NAT Gateway rather than per-AZ NAT redundancy.

**Application Load Balancer**

`guidra-ALB` is deployed across both `ap-south-1a` and `ap-south-1b` public subnets and forwards requests to the registered EC2 targets in the private subnets.

**EC2 instances**

|Instance Name|Instance ID|Type|AZ|Private IP|Root Volume|
|---|---|---|---|---|---|
|`guidra-prod-server-1`|`i-0964007212994913c`|`t3.small`|`ap-south-1a`|`10.0.11.193`|8 GiB `gp3`|
|`guidra-prod-server-2`|`i-0c4a2b8ac6117cbf7`|`t3.small`|`ap-south-1b`|`10.0.12.119`|8 GiB `gp3`|

![Guidra AWS VPC Network Diagram](/images/case-study/guidra-aws/vpc-network.png)

### Networking considerations

One thing I learned is that having an Internet Gateway attached to a VPC is not enough by itself. Subnet route table associations and security group rules also determine whether traffic can reach the intended resources.

I had to understand the complete traffic path rather than troubleshoot each AWS component independently.

## 5. Application Deployment Architecture

Each EC2 instance runs Amazon Linux 2023 (`x86_64`) with Docker Engine and Docker Compose, with application files and environment configuration stored under `/opt/guidra`.

The production Compose stack (`docker-compose.yml` + `docker-compose.prod.yml`) runs two containers with `restart: unless-stopped`:

|Service / Container|Image Base|Responsibility|
|---|---|---|
|`frontend` (`guidra-prod-client`)|`nginx:alpine` (built from `node:20-alpine`)|Serves the React/Vite production build on port `80` and reverse-proxies API traffic|
|`backend` (`guidra-prod-server`)|`node:22-alpine` (non-root `nodejs` user)|Runs the Express API on port `5000` and exposes `/health` for readiness checks|

The containers communicate through an isolated Docker bridge network named `guidra-network`.

### Frontend and backend routing

I used Nginx (`client/nginx.conf`) to serve the frontend, apply security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`), enforce `no-store` caching on `index.html` and PWA service worker files, and reverse-proxy API requests.

The routing is configured as follows:

|Domain / Path|Destination|
|---|---|
|`guidra.tech`|React frontend static files (`/`)|
|`www.guidra.tech`|React frontend static files (`/`)|
|`/api/` on main domains|Proxied to `http://backend:5000`|
|`api.guidra.tech`|Dedicated Nginx server block proxying all paths to `http://backend:5000`|

The frontend Nginx container communicates with the backend using the Docker Compose service name:

`http://backend:5000`

The backend port (`5000`) is not exposed on the ALB or allowed through the EC2 security group. This means the ALB only forwards requests to port `80` on the EC2 instances, and Nginx handles the separation between frontend and backend traffic.

![Guidra Application Request Flow](/images/case-study/guidra-aws/app-request-flow.png)

### Why Docker Compose?

I wanted the frontend and backend to have separate responsibilities and deployment configurations.

Docker Compose makes it easier to manage both containers together, split local development (`docker-compose.override.yml` with a local MongoDB container) from production (`docker-compose.prod.yml` connecting to MongoDB Atlas), and keep production deployments consistent across both instances.

## 6. DNS and HTTPS

I used Cloudflare to manage the Guidra domains:

- `guidra.tech`
- `www.guidra.tech`
- `api.guidra.tech`

All three domains are configured as proxied CNAME records pointing to the AWS Application Load Balancer DNS name (`guidra-ALB-1329936790.ap-south-1.elb.amazonaws.com`).

Cloudflare SSL/TLS is configured in **Full (strict)** mode, ensuring encrypted TLS connections both between users and Cloudflare and between Cloudflare and the AWS ALB.

On the AWS side, an Amazon-issued **AWS Certificate Manager (ACM)** certificate (RSA 2048, covering `guidra.tech` and `*.guidra.tech`) is attached to the ALB's `HTTPS:443` listener using `ELBSecurityPolicy-TLS13-1-2-Res-PQ-2025-09`.

### ALB Listeners and Target Group

- **HTTPS (`443`) listener:** Terminates TLS with the ACM certificate and forwards traffic to target group `guidra-app` (HTTP, port `80`).
- **HTTP (`80`) listener:** Includes a priority-1 host-header rule matching `api.guidra.tech` and a default rule, both forwarding to `guidra-app`.
- **Target group (`guidra-app`):** Health checks run every `30s` via HTTP `GET /` on traffic port `80` (timeout `5s`, healthy threshold `5`, unhealthy threshold `2`, matching HTTP `200`).

## 7. CI/CD, Immutable Images and Rollback

I wanted deployments to be repeatable rather than manually logging into EC2 instances and updating the application every time.

I implemented two GitHub Actions workflows in `.github/workflows/`: **`Guidra CI`** (`cicd.yml`) for build, test and deployment, and **`Guidra Rollback`** (`rollback.yml`) for release recovery.

### Deployment workflow (`Guidra CI`)

Triggered automatically on every `push` to `main`, the pipeline executes four sequential stages:

1. **Lint (`lint`):** Sets up Node.js 22 and runs `npm ci` + `npm run lint` (`eslint .`) for both `client/` and `server/`.
2. **Backend Tests (`test`):** Runs `docker compose -f docker-compose.test.yml up --build --exit-code-from server-test`, executing `node --test test/*.test.js` (JWT/cookie security tests and AI provider health checks), then tears down test containers.
3. **Build & Publish Container Images (`publish-AWS-ECR` and `publish-GHCR` in parallel):**
   - `publish-AWS-ECR` authenticates to AWS via GitHub OIDC (`aws-actions/configure-aws-credentials@v4`) and pushes `mrtuxcoder/guidra-backend:<github.sha>` and `mrtuxcoder/guidra-frontend:<github.sha>` to Amazon ECR in `ap-south-1`.
   - `publish-GHCR` mirrors the same builds to GitHub Container Registry (`ghcr.io/mrtuxcoder/guidra-backend` and `ghcr.io/mrtuxcoder/guidra-frontend`) tagged with both `<github.sha>` and `latest`.
4. **Deploy to EC2 (`deploy-to-ec2`):** Runs after `publish-AWS-ECR` using a matrix strategy across `EC2_INSTANCE_ID_1` (`i-0964007212994913c`) and `EC2_INSTANCE_ID_2` (`i-0c4a2b8ac6117cbf7`) with `fail-fast: false` and concurrency group `guidra-production-deployment` (`cancel-in-progress: false`).

![Guidra CI GitHub Actions Workflow Run](/images/case-study/guidra-aws/github-actions-ci-run.png)

### Container registry & immutable image tagging

Production EC2 instances pull images exclusively from **Amazon ECR** (`<account-id>.dkr.ecr.ap-south-1.amazonaws.com/mrtuxcoder/guidra-backend` and `mrtuxcoder/guidra-frontend`). GHCR serves as a parallel build mirror.

Both ECR repositories are configured with **`IMMUTABLE` image tag mutability** and **AES-256** encryption at rest. Rather than deploying a mutable `latest` tag, every CI run tags images with the **full 40-character Git commit SHA** (`${{ github.sha }}`).

Because ECR rejects overwriting an existing tag, every deployment maps cleanly to an exact commit, and previous versions remain intact for deterministic rollbacks.

![Immutable Commit-SHA Image Versions](/images/case-study/guidra-aws/ghcr-image-tags.png)

*(The same immutable 40-character Git commit-SHA tags are published to Amazon ECR for production deployments and mirrored to GHCR.)*

### SSM deployment procedure

Instead of opening public SSH ports or storing SSH keys in GitHub Actions, the `deploy-to-ec2` job uses `aws ssm send-command` (`AWS-RunShellScript`) against each target instance:

1. Checks SSM agent status via `aws ssm describe-instance-information`.
2. Downloads `docker-compose.yml` and `docker-compose.prod.yml` for the exact `${{ github.sha }}` commit into `/opt/guidra`.
3. Logs into Amazon ECR (`aws ecr get-login-password`).
4. Updates `BACKEND_IMAGE` and `FRONTEND_IMAGE` in `/opt/guidra/.env.production` to the new immutable ECR image URIs.
5. Pulls the new images and recreates the stack:

```bash
docker compose \
  --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.prod.yml pull

docker compose \
  --env-file .env.production \
  -f docker-compose.yml \
  -f docker-compose.prod.yml up -d --remove-orphans
```

6. Verifies both `guidra-prod-server` and `guidra-prod-client` report running via `docker inspect -f "{{.State.Running}}"`, then prunes old images (`docker system prune -af`).
7. Polls `aws ssm get-command-invocation` every 10 seconds (up to 60 attempts) until `Success`.

### Rollback (`Guidra Rollback`)

Rollback is implemented as a dedicated, **manually triggered** GitHub Actions workflow (`workflow_dispatch` in `.github/workflows/rollback.yml`) that accepts a `release_sha` input:

1. **Input validation:** Enforces a full 40-character lowercase hex Git SHA (`^[0-9a-f]{40}$`).
2. **Concurrency guard:** Shares the `guidra-production-deployment` concurrency group so a rollback cannot collide with an active forward deployment.
3. **Pre-flight ECR check:** Verifies both `mrtuxcoder/guidra-backend:<release_sha>` and `mrtuxcoder/guidra-frontend:<release_sha>` exist in Amazon ECR via `aws ecr describe-images` before touching production servers.
4. **Synchronized SSM restore:** Sends an `AWS-RunShellScript` command to both EC2 instances simultaneously to fetch the Compose files for `<release_sha>`, authenticate with ECR, rewrite `BACKEND_IMAGE` and `FRONTEND_IMAGE` in `.env.production`, pull and restart containers, verify both containers are running and wait up to 10 minutes per instance.

![Guidra Rollback GitHub Actions Run](/images/case-study/guidra-aws/github-actions-rollback-run.png)

### Why AWS Systems Manager?

I wanted to avoid depending on public SSH access for routine deployment and administration.

SSM provides an auditable control plane to manage EC2 instances and execute deployment commands through AWS IAM without exposing port `22` to the internet or managing SSH key distribution in CI.

## 8. Security and IAM

Security was designed around network isolation, least-privilege IAM and separating CI/CD build credentials from runtime deployment credentials.

### Security groups

|Security Group|Attached To|Inbound Rules|Outbound Rules|
|---|---|---|---|
|`mrtuxcoder-guidra-production-ALB-SG`|`guidra-ALB`|TCP `80` (HTTP) and `443` (HTTPS) from `0.0.0.0/0`|All traffic to `0.0.0.0/0`|
|`mrtuxcoder-guidra-production-app-SG`|Both EC2 instances|TCP `80` from `mrtuxcoder-guidra-production-ALB-SG`; TCP `22` from `guidra-eice-SG` only|All traffic to `0.0.0.0/0`|
|`guidra-eice-SG`|EC2 Instance Connect Endpoint (`Private Subnet A`)|None|All traffic to `0.0.0.0/0`|

- Public traffic can only enter through the ALB on ports `80` and `443`.
- Application instances only accept HTTP (`80`) from the ALB security group and private administrative SSH (`22`) exclusively from the VPC's **EC2 Instance Connect Endpoint** (`guidra-eice-SG`), with zero public SSH exposure.
- Backend port `5000` is never exposed externally.

### IAM roles and CI/CD separation

**Shared EC2 instance role (`mrtuxcoder-guidra-production-ec2-role`)**

Both `guidra-prod-server-1` and `guidra-prod-server-2` share this IAM instance profile, which has exactly three AWS managed policies attached and no inline policies:

- `AmazonEC2ContainerRegistryPullOnly` — allows pulling images from Amazon ECR.
- `AmazonSSMManagedInstanceCore` — enables SSM Session Manager and Run Command.
- `CloudWatchAgentServerPolicy` — permits sending metrics and logs to CloudWatch.

No long-lived AWS access keys are stored on the EC2 instances.

**CI/CD least-privilege separation**

- **Image publishing (`github-guidra-ecr-publisher` role):** Assumed via GitHub OIDC (`sts:AssumeRoleWithWebIdentity`) with a trust condition restricting assumption strictly to `repo:mrtuxcoder/Guidra-learning-platform:ref:refs/heads/main`. Attached `GuidraECRPushPolicy` grants `ecr:GetAuthorizationToken` and layer/image push permissions solely on the `mrtuxcoder/guidra-backend` and `mrtuxcoder/guidra-frontend` ECR repositories.
- **Deployment & rollback (`GuidraGitHubDeploymentPolicy`):** Scopes `ssm:SendCommand` strictly to the two production EC2 instance ARNs and `AWS-RunShellScript`, along with `ssm:GetCommandInvocation` and `ecr:DescribeImages` on the two Guidra ECR repositories.

### Database access and secret handling

MongoDB Atlas is hosted outside the AWS VPC. The backend connects using Mongoose (`server/configs/db.js`) over a TLS-encrypted `mongodb+srv://` URI with credential authentication and connection pooling (`minPoolSize: 2`, `maxPoolSize: 20`).

- Production environment variables and secrets (`MONGO_URI`, `JWT_SECRET`, Google OAuth credentials, `GEMINI_API_KEY`, `GROQ_API_KEY`, `HUGGINGFACE_TOKEN`) are stored in `/opt/guidra/.env.production` on each EC2 host, git-ignored in the repository and injected into `guidra-prod-server` via `env_file`.
- CI test secrets are stored separately in GitHub Actions Secrets.
- Outbound database traffic from both private EC2 instances leaves via the NAT Gateway's static IP, allowing Atlas Network Access rules to stay restricted without exposing database ports publicly.

As a future hardening step, moving runtime secrets out of `/opt/guidra/.env.production` into AWS Secrets Manager or SSM Parameter Store would centralize rotation across instances.

## 9. Monitoring and Infrastructure Health

Deploying the application is only one part of operating it. I also wanted to know when the infrastructure or application targets became unhealthy.

I configured CloudWatch alarms for EC2 instance status checks and ALB target health, backed by an SNS notification topic (`guidra_ec2_alarm_topic`).

### CloudWatch alarms

|Alarm Name|Namespace & Metric|Dimensions & Condition|Action|
|---|---|---|---|
|`guidra_ec2_alarm`|`AWS/EC2` · `StatusCheckFailed` (`Maximum`)|`InstanceId` = `guidra-prod-server-1`, `>= 1` for 1 datapoint in `60s`|SNS `guidra_ec2_alarm_topic`|
|`guidra-ec2-server-2-status-check`|`AWS/EC2` · `StatusCheckFailed` (`Maximum`)|`InstanceId` = `guidra-prod-server-2`, `>= 1` for 1 datapoint in `60s`|SNS `guidra_ec2_alarm_topic`|
|`guidra-alb-unhealthy-targets`|`AWS/ApplicationELB` · `UnHealthyHostCount` (`Minimum`)|`LoadBalancer` = `guidra-ALB`, `TargetGroup` = `guidra-app`, `> 0` for 2 consecutive `60s` datapoints|SNS `guidra_ec2_alarm_topic`|

### CloudWatch Logs

A CloudWatch Log Group (`/aws/guidra/guidra-production`, `STANDARD` class) is provisioned in `ap-south-1` with stream `guidra-prod-server-1/app/stdout` for centralized application and health-probe log aggregation, supported by `CloudWatchAgentServerPolicy` on both EC2 instances.

### Monitoring considerations

An EC2 instance can be running while the application itself is unhealthy.

That's why I added both EC2 status-check alarms and ALB target-health monitoring. Together with the backend `/health` endpoint (which checks MongoDB readiness) and SSM container state checks during deployment, they cover both host-level and application-level health.

## 10. Production Traffic & Response Time Analysis

I reviewed historical ALB telemetry in CloudWatch for the UTC window from 2026-11-05 through 2026-11-12. The ALB recorded **94,392 requests** during that period.

|Metric|Observed value|
|---|---|
|ALB requests|94,392|
|Target response time p50|0.68 ms|
|Target response time p90|2.32 ms|
|Target response time p95|3.70 ms|
|Target response time p99|67.69 ms|

These response-time figures are averages of hourly percentile samples from the ALB target-response-time metric. They are useful for understanding how the targets behaved over the observation window, but they are not end-user latency measurements and should not be treated as a controlled performance benchmark.

No load tests or Lighthouse benchmarks were executed as part of this review, so I have not inferred application performance from these infrastructure observations alone.

## 11. CI/CD Execution Performance

I also inspected one selected successful CI-to-deployment pipeline to understand the time spent across its stages. The overall elapsed time was **244 seconds**, from the first job starting until the final deployment completed.

|Job|Duration|
|---|---|
|Lint|22s|
|Backend tests|27s|
|GHCR publish|93s|
|ECR publish|116s|
|EC2 deployment 1|38s|
|EC2 deployment 2|35s|

The individual job durations do not add up to the total elapsed time because publishing and the two EC2 deployment jobs can overlap. This is one observed pipeline execution, rather than a generalised deployment benchmark.

## 12. Infrastructure Health & Monitoring

For the same seven-day observation window, I checked the ALB target-health and EC2 status-check metrics alongside the alarms already configured for the environment.

|Metric|Observation|
|---|---|
|Healthy ALB targets|2/2|
|Unhealthy target hourly samples|0|
|EC2 status-check failed hourly samples|0|
|Average CPU — instance 1|0.52%|
|Average CPU — instance 2|0.55%|

These observations indicate that both registered targets were healthy in the sampled hours and that no EC2 status-check failures were recorded in that window. They do not, by themselves, establish uninterrupted application availability or capacity under load.

## 13. Rollback Workflow Analysis

The rollback workflow is designed to restore a manually selected immutable release SHA after confirming that the required ECR images exist and then issuing the restore commands through SSM to both instances.

Two historical rollback workflow executions were reviewed: one completed successfully in **23 seconds**, and one failed in **13 seconds**. These figures measure workflow execution only; they are not application recovery times because the review did not record when the restored containers, backend readiness, or ALB targets became healthy.

## 14. Operational Findings & Improvements

The audit also highlighted a few areas where the operational checks can become more complete.

- CloudWatch reported **9,073 ELB-generated 5xx responses** in the review period. This remains an unresolved investigation and needs reconciliation with ALB access logs and target-level metrics before it can be attributed to the application or described as an application-error count.
- The ALB target group currently checks `GET /` on the Nginx-facing port, while the backend `/health` endpoint checks MongoDB connection readiness. Evaluating a staging readiness-verification flow would help confirm that the deployed application is ready beyond a successful root-path health check.
- The deployment workflow currently verifies that containers are running. Adding post-deployment readiness and ALB target-health checks would provide a clearer handoff from deployment completion to application readiness.
- Rollback reporting could record container, backend-readiness and ALB-health milestones so future rollback analysis can distinguish workflow duration from actual service recovery.

## 15. Challenges and Lessons Learned

The most valuable part of this deployment was understanding how the components work together.

### Networking was more complicated than I expected

At first, I treated the Internet Gateway, route tables and subnets as separate AWS resources.

I eventually understood that the actual traffic path depends on how they are connected.

An attached Internet Gateway does not automatically make every subnet public. Route table associations and security group rules matter.

### ALB and Nginx have different responsibilities

All three Guidra domains point to the same ALB.

I initially had to understand where the actual frontend/backend separation happens.

The ALB forwards traffic to the EC2 instances, while Nginx handles hostname-based and path-based routing inside the application environment.

This distinction helped me understand reverse proxies much better.

### Docker networking matters

Running frontend and backend in separate containers means they need to communicate through a Docker network.

Using the Compose service name `backend` instead of a public IP keeps the internal communication straightforward.

### Deployment automation needs more than a build pipeline

Building a Docker image successfully doesn't guarantee that the new application is running correctly.

The deployment process also needs to pull the correct image, restart services and verify application health.

Working with GitHub Actions, Docker Compose and SSM helped me understand the relationship between CI and CD.

Implementing immutable image tags and manual `workflow_dispatch` rollback via `release_sha` also made me think carefully about deployment safety and how to recover quickly from a problematic release.

### Monitoring is part of deployment

An EC2 instance can be running while the application itself is unhealthy.

That's why I added both EC2 status-check alarms and ALB target-health monitoring.

They monitor different layers of the system.

## 16. Final Thoughts

Guidra helped me connect several concepts I had learned separately.

I worked with Linux, Docker, AWS networking, load balancing, IAM, CI/CD and monitoring in one deployment.

More importantly, I learned that infrastructure is not just a collection of services.

A request travels through multiple layers. A problem in one layer can affect the entire application. Understanding the relationship between DNS, the ALB, security groups, EC2, Docker, Nginx and the backend is what makes troubleshooting possible.

I also realised that getting an application online is only the beginning. Operating it means thinking about deployment repeatability, monitoring, access control and failure handling.

Implementing immutable image versions and a rollback mechanism was an important part of making the deployment process more controlled.

Guidra is one of the projects that helped me move from learning individual DevOps tools to understanding how they fit together in an application environment.

---

## Architecture at a Glance

|Category|Technology|
|---|---|
|Cloud provider|AWS|
|Region|`ap-south-1` (Mumbai)|
|Networking|VPC (`10.0.0.0/16`), 2 public + 2 private subnets, IGW, NAT Gateway|
|Load balancing|Application Load Balancer (`guidra-ALB`, target group `guidra-app`)|
|Compute|2 × EC2 `t3.small` (`ap-south-1a`, `ap-south-1b`)|
|Operating system|Amazon Linux 2023|
|Containerisation|Docker, Docker Compose|
|Frontend|React 19 + Vite|
|Web server / reverse proxy|Nginx (`nginx:alpine`)|
|Backend|Node.js 22 + Express 5|
|Database|MongoDB Atlas|
|DNS and proxy|Cloudflare (Full strict)|
|TLS certificate|AWS Certificate Manager (RSA 2048)|
|Container registry|Amazon ECR (immutable SHA tags, AES-256) + GHCR mirror|
|CI/CD|GitHub Actions (`Guidra CI` + `Guidra Rollback`)|
|Deployment access|AWS Systems Manager (SSM) + EC2 Instance Connect Endpoint|
|Monitoring|Amazon CloudWatch Alarms, CloudWatch Logs (`/aws/guidra/guidra-production`), SNS|
