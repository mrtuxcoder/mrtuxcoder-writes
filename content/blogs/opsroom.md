---
title: "Don't Give AI the Root Keys: Building a Governed Multi-Agent Incident Response Team in Telegram with Switch"
description: "How OpsRoom uses Switch and Antigravity to build a governed AI SRE team inside Telegram — with deterministic human authorization gates before any mutating command touches production."
date: "2026-11-06"
tags: ["ai", "devops", "aws", "telegram", "switch", "multi-agent", "incident-response"]
draft: false
---

**Author:** Guganraj Rengaraju ([@mrtuxcoder](https://github.com/mrtuxcoder)) & The OpsRoom Team  
**Repository:** [github.com/mrtuxcoder/OpsRoom](https://github.com/mrtuxcoder/OpsRoom)  
**Demo Video:** [Watch on YouTube](https://youtu.be/1SA2d8gol98)  
**Target Platform:** Switch AI + Telegram + Antigravity (Gemini) + AWS SDK v3  

---

## The 3:00 AM Alert: How My Real Project (Guidra) Sparked OpsRoom

Every developer running infrastructure knows the sinking feeling in their chest when their phone buzzes at 3:14 AM.

I maintain a production project called **Guidra**, deployed on Amazon Web Services. Like most modern cloud backends, Guidra relies on an Application Load Balancer (ALB) routing incoming traffic to containerized microservices hosted on EC2 instances, with telemetry piped into Amazon CloudWatch Logs. 

Whenever a subtle deadlock or memory leak struck, my workflow was always the same high-friction scramble:
1. Stumble out of bed and open my laptop.
2. Log into the AWS Management Console with MFA.
3. Check the ALB Target Group health to find out which container failed.
4. Jump into CloudWatch Logs Insights, running queries across thousands of lines to isolate the exact crash trace.
5. Open an SSM terminal session or SSH tunnel to run `docker restart` or `systemctl restart`.
6. Meanwhile, keep replying to teammates on Telegram who are asking: *"Is production down? What happened?"*

By the time the service recovered, target health turned green, and I wrote a post-mortem summary, over an hour had slipped away. I had resolved the incident, but at the cost of acute cognitive burnout.

### The Tempting (and Dangerous) Temptation: "Just Give AI the Root Keys"

With the explosion of autonomous AI agents like Claude Code, Cursor, and Antigravity, the knee-jerk reaction in the developer community has been:

> *"Why not just give an AI agent root AWS access, wire it to CloudWatch alarms, and let it autonomously heal production?"*

Anyone who has run production infrastructure at scale knows the answer: **giving an unconstrained, fully autonomous AI agent write access to your cloud infrastructure is terrifying.**

A single hallucinated command—an errant `DROP DATABASE`, an accidental `terraform destroy`, or an uncoordinated EC2 reboot during an in-flight transaction—can transform a transient 2-minute blip into an existential, multi-day company outage.

Chatbots that do nothing but recite AWS documentation are useless during an outage. Fully autonomous agents with write keys are dangerous.

What engineers actually need is a **Governed AI SRE Team**: specialized agents that do the heavy lifting of diagnostic triage right inside your team's existing chat app, with **deterministic human authorization gates** before any mutating command is allowed to touch production.

This is why we built **OpsRoom**.

---

## 📺 2-Minute Incident Walkthrough Demo

Before diving into the architecture, watch OpsRoom detect an outage, diagnose the root cause, and execute approved remediation in real time:

[![OpsRoom Demo](https://img.youtube.com/vi/1SA2d8gol98/maxresdefault.jpg)](https://youtu.be/1SA2d8gol98)

*(Click above to watch the end-to-end incident response lifecycle in our collaborative Telegram room)*

---

## What is OpsRoom?

**OpsRoom** transforms your team's chat application (Telegram or Slack) into a collaborative incident response war-room powered by **Switch** and **Antigravity**.

Instead of an engineer frantically context-switching across AWS consoles, the human engineer and two specialized AI agents work together as peers in a shared chat channel:

### The Three Participants in the Room:
1. **Sentinel (`@ops-sentinel`) — The Infrastructure Watcher:**  
   Runs continuous read-only telemetry probes against ALB target groups. When latency spikes or targets fail health checks (`502 Bad Gateway`), Sentinel alerts the Telegram group and hands off context to Investigator.
2. **Investigator (`@ops-investigator`) — The Diagnostic Engine:**  
   Pulls recent application and system logs from CloudWatch, isolates root causes (e.g., worker pool deadlocks, memory leaks, unhandled exceptions), and formulates a structured remediation proposal. Crucially, Investigator **cannot execute mutations autonomously**.
3. **Human Engineer (You) — The Authorization Gate:**  
   Reviews the proposed remediation and grants execution by issuing an explicit token (`@ops-investigator APPROVE #101`).

![Investigator isolating the root cause and requesting explicit human approval before executing remediation in Telegram](/images/blogs/opsroom/telegram-incident-approval.png)

*Figure 1: Investigator isolating the root cause and requesting explicit human approval before executing remediation in Telegram.*

---

## Why Switch is Indispensable (The "Why Not a Simple Bot?" Test)

The most important question in multi-agent systems is: *Could this have just been a standard Python Telegram bot script?*

**Without Switch, OpsRoom breaks down completely.** A standard Telegram bot is a monolithic, single-identity webhook script without separation of concerns or conversational boundaries. Switch provides four architectural primitives that made OpsRoom possible:

### 1. Distinct Multi-Agent Personas & Failure Domains
Sentinel and Investigator operate in the exact same chat room with distinct identities, capabilities, and addressing rules. Sentinel is granted read-only telemetry tools (`check-health.js`), while Investigator possesses diagnostic and SSM remediation tools (`inspect-logs.js`, `run-remediation.js`). If one agent encounters a tool error or timeout, the other remains uncompromised.

### 2. Addressing Policies Before Instructions
In Switch, you define who can speak to each agent before writing a single line of prompt instructions:
* **Sentinel** operates under `addressing: anyone`, meaning any human or scheduled job can ask for health audits.
* **Investigator** operates under `addressing: owner-agents`, meaning it will not respond to arbitrary chatter; it only speaks when handed work by Sentinel or directly addressed by authorized human engineers.

### 3. Room-Level Instructions & Shared Memory
In a traditional setup, you have to hardcode conversational memory and operational protocols into each individual agent's prompt. In Switch, operational policy lives in **Switch Room Instructions** ([`switch/room-instructions.md`](https://github.com/mrtuxcoder/OpsRoom/blob/main/switch/room-instructions.md)). When Sentinel posts an alert, Investigator reads the shared room state and history to understand what happened without needing redundant webhook payloads or external state databases.

### 4. 1-Click Declarative Reproducibility
The entire operations war-room—both agents, their Antigravity provider, their working directories, their addressing rules, and their Telegram bridge—is codified declaratively in [`switch/opsroom.template.yaml`](https://github.com/mrtuxcoder/OpsRoom/blob/main/switch/opsroom.template.yaml). A new DevOps team can instantiate the complete workflow into their own Telegram group in 60 seconds via Switch Console.

![Multi-agent coordination in action inside Telegram via Switch](/images/blogs/opsroom/telegram-warroom-chat.png)

*Figure 2: Multi-agent coordination in action inside Telegram via Switch.*

---

## Deep Under the Hood: Real Engineering Roadblocks & Solutions

Building real-world multi-agent workflows is never as simple as plugging an API key into a prompt. During our build, we encountered two deep infrastructure hurdles that required diving into the internals of Switch Core.

### Roadblock 1: The Telegram Bot API Constraint (Channel Adoption vs. Creation)
When we first ran our Switch template on Telegram, the run was immediately refused by Switch:
```text
Nothing was kept: the rooms could not be created: Creating channels is turned off for the 'Telegram' connection.
```

**The Root Cause:** Unlike Slack or Discord, Telegram's Bot API **does not permit bots to create groups or channels**. A Telegram group must always exist first, and the bot must be invited into it.

**The Solution:** Switch solves this through **Room Adoption**. Instead of having the template call `room: name: "{team}-ops"`, we parameterized the room selection:
```yaml
params:
  room:
    type: room
    label: Operations Room
    description: Select your adopted Telegram chat

agents:
  - name: "{team}-sentinel"
    join: ["{room}"]
  - name: "{team}-investigator"
    join: ["{room}"]
```
When instantiated in Switch Console, Switch scans for existing adopted Telegram groups and seamlessly attaches both agents directly into your pre-existing team group via `join: ["{room}"]`.

### Roadblock 2: The 5-Second Connection Timeout Crash in Switch Core
During initial connection, our Telegram bridge crashed with an unexpected error:
```text
httpx.ConnectTimeout: ConnectTimeout while calling telegram.ext.Application.initialize()
Bridge 187d0f1a-999a-491d-a886-8622d4234756 crashed
```

**The Root Cause:** In `switch_core/bridges/collaboration/telegram/adapter.py`, `ApplicationBuilder` was instantiated with python-telegram-bot's default `5.0s` connection timeout. On networks with dual-stack IPv6 DNS fallback, the initial SSL/TLS handshake with `api.telegram.org` took ~4.2 seconds, occasionally tripping the timeout and terminating the bridge process.

**The Solution:** We patched Switch Core's Telegram adapter to provide a robust 30-second connection and pool timeout:
```python
# switch_core/bridges/collaboration/telegram/adapter.py
app = (
    ApplicationBuilder()
    .token(self._config.bot_token)
    .connect_timeout(30.0)
    .read_timeout(30.0)
    .get_updates_connect_timeout(30.0)
    .get_updates_read_timeout(30.0)
    .build()
)
```
The bridge immediately stabilized, initialized without errors, and began polling Telegram reliably.

---

## Container Architecture & Safe AWS Remediation

In production environments, cloud applications run inside containers. If an agent tries to remediate an issue by executing an uncoordinated `sudo reboot` on an EC2 instance, it takes down the entire virtual machine, disconnecting SSH bastions, background cron jobs, and adjacent microservices.

To prevent this, OpsRoom uses a **Container-Aware Remediation Engine**:

### 1. Non-Destructive SSM Remediation
When human approval is granted, Investigator dispatches an AWS Systems Manager command ([`src/aws/ssm.js`](https://github.com/mrtuxcoder/OpsRoom/blob/main/src/aws/ssm.js)) using `AWS-RunShellScript`. The script is intelligent:
```bash
if docker ps -a --format '{{.Names}}' | grep -q "^${serviceName}$"; then
  echo "Restarting Docker container ${serviceName}..."
  docker restart ${serviceName}
elif systemctl list-units --type=service | grep -q "${serviceName}"; then
  echo "Restarting systemd service ${serviceName}..."
  systemctl restart ${serviceName}
else
  echo "Falling back to docker compose restart..."
  if [ -d "/opt/guidra" ]; then cd /opt/guidra && docker compose restart; fi
fi
```
This restarts only the failing container in **3.2 seconds**, restoring the target group without ever rebooting the underlying EC2 instance.

### 2. Zero-Friction Clean-Room Sandbox (Docker Compose)
We also packaged the entire target sandbox in a lightweight [`Dockerfile`](https://github.com/mrtuxcoder/OpsRoom/blob/main/Dockerfile) and [`docker-compose.yml`](https://github.com/mrtuxcoder/OpsRoom/blob/main/docker-compose.yml). Anyone can spin up the simulated Guidra backend target locally with:
```bash
docker compose up -d
```
No local Node.js version manager headaches, and zero AWS charges while testing.

---

## Security First: What Permissions Does the Bot Actually Demand?

We designed OpsRoom following the **Principle of Least Privilege (PoLP)**. You should **never** provide root AWS access or `AdministratorAccess` keys to any bot.

Across the entire codebase, OpsRoom requires only **3 specific AWS SDK actions**:

| Tool | AWS Action | Permission Type | Resource Scope |
| :--- | :--- | :--- | :--- |
| **Sentinel** (`check-health.js`) | `elasticloadbalancing:DescribeTargetHealth` | Read-Only | Specific Target Group ARN |
| **Investigator** (`inspect-logs.js`) | `logs:FilterLogEvents` | Read-Only | Specific CloudWatch Log Group ARN |
| **Investigator** (`run-remediation.js`) | `ssm:SendCommand` | Mutating *(Human-Gated)* | Specific EC2 Instance ARN & `AWS-RunShellScript` Document |

### Minimal IAM Policy:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "OpsRoomAlbHealthCheck",
      "Effect": "Allow",
      "Action": ["elasticloadbalancing:DescribeTargetHealth"],
      "Resource": "arn:aws:elasticloadbalancing:<REGION>:<AWS_ACCOUNT_ID>:targetgroup/<TARGET_GROUP_NAME>/*"
    },
    {
      "Sid": "OpsRoomCloudWatchLogInspection",
      "Effect": "Allow",
      "Action": ["logs:FilterLogEvents"],
      "Resource": "arn:aws:logs:<REGION>:<AWS_ACCOUNT_ID>:log-group:<LOG_GROUP_NAME>:*"
    },
    {
      "Sid": "OpsRoomSsmRemediation",
      "Effect": "Allow",
      "Action": ["ssm:SendCommand"],
      "Resource": [
        "arn:aws:ec2:<REGION>:<AWS_ACCOUNT_ID>:instance/<EC2_INSTANCE_ID>",
        "arn:aws:ssm:<REGION>::document/AWS-RunShellScript"
      ]
    }
  ]
}
```

### Static Access Keys vs. IAM Role
* **External Deployment (Off-AWS):** If you run OpsRoom locally on your machine or on an external bot server, use a dedicated IAM user with the scoped policy above.
* **In-VPC Deployment (On-AWS):** If you run OpsRoom on an EC2 instance, ECS task, or EKS pod inside your VPC, leave the access keys empty in `.env`. The AWS SDK v3 automatically discovers ambient credentials from the attached IAM Instance Profile!

---

## 60-Second Clean-Room Reproducibility (The Dual-Mode Engine)

A critical hurdle for developer adoption is setup friction. If someone needs a live AWS account, an active credit card, and an Application Load Balancer to try your tool, 99% of people will bounce.

To solve this, OpsRoom includes a **Dual-Mode Engine**:

| Mode | Configuration | Behavior |
| :--- | :--- | :--- |
| **Mock Sandbox (Default)** | `MOCK_AWS=true` | Runs an in-memory Express server (`src/mock/server.js`) simulating ALB target probes, CloudWatch error bursts, deadlock chaos injection, and SSM restarts. 100% offline, zero AWS bill. |
| **Live AWS Production** | `MOCK_AWS=false` | Uses `@aws-sdk/client-*` to interact directly with your live AWS ALB, CloudWatch, and SSM resources. |

### Test the Entire Incident Flow in 5 Seconds:
```bash
git clone https://github.com/mrtuxcoder/OpsRoom.git
cd OpsRoom
npm install

# In Terminal 1: Start the simulated Guidra target
npm run start:mock

# In Terminal 2: Run the full automated incident lifecycle test
make test-flow
```

You will see:
```text
=== 1. Starting Initial Health Check (Expected Healthy) ===
Status: HEALTHY (200 OK)

=== 2. Injecting Chaos (Crashing target to 502) ===
Simulating worker thread crash... Target is now degraded.

=== 3. Sentinel Detecting Failure ===
Status: UNHEALTHY (502 Bad Gateway)
ALERT: Target Group guidra-production is failing probes!

=== 4. Investigator Inspecting Logs ===
CloudWatch Log Analysis: Isolated 3 error events matching 'SIGABRT'.

=== 5. Human Approving Remediation (#101) ===
Authorized with Token: 101
SUCCESS: Service guidra-production restarted successfully via SSM.

=== 6. Sentinel Verifying Recovery ===
Status: HEALTHY (200 OK, latency 42ms)

=== 7. Investigator Generating Post-Mortem Artifact ===
Artifact created: artifacts/incident-2026-11-06T04-37-13-627Z.md

✅ Full E2E Incident Response Flow Verified Successfully!
```

---

## The Tangible Post-Mortem Artifact

Once an incident resolves, Investigator automatically compiles an audit-ready post-mortem markdown report in [`artifacts/`](https://github.com/mrtuxcoder/OpsRoom/tree/main/artifacts):

```markdown
# Incident Post-Mortem: guidra-production Outage
**Incident ID:** INC-849201  
**Target Service:** `guidra-production`  
**Severity:** P1 (ALB Target Group Healthcheck Failure)  
**Resolution Status:** Resolved  

## Incident Timeline (UTC)
| Timestamp | Participant | Action / Event |
| :--- | :--- | :--- |
| **T - 4m** | **Sentinel** | Detected ALB probe failure (HTTP 502). Alerted Telegram room. |
| **T - 3m** | **Sentinel** | Handed off incident context to @ops-investigator. |
| **T - 2m** | **Investigator** | Inspected logs, isolated worker thread deadlock (SIGABRT). |
| **T - 1m** | **Human SRE** | Granted authorization: '@ops-investigator APPROVE #101'. |
| **T - 30s**| **Investigator** | Executed container restart via SSM command. |
| **T - 0s** | **Sentinel** | Confirmed ALB target returned to HEALTHY (200 OK). |
```

---

## Lessons Learned & What's Next

Building OpsRoom taught us that **the bottleneck in AI operations was never model intelligence—it was governance and interface.**

Chat applications like Telegram are where on-call engineers already spend their lives. By pairing **Switch's multi-agent routing engine** with **Antigravity's reasoning models**, we achieved the holy grail:
* **Zero alert fatigue:** The AI triages and isolates stack traces before you even open your laptop.
* **Zero hallucination risk:** The AI cannot mutate production without a deterministic cryptographic or approval token.
* **Shared team transparency:** Every alert, hypothesis, diagnosis, and approval is visible to everyone in the room.

If you are running cloud infrastructure on AWS and want to turn your team chat into an intelligent, governed war-room, check out the repository, run the 60-second sandbox, and instantiate the template in your own Switch workspace!

---

### Resources & Links:
* 🌐 **GitHub Repository:** [github.com/mrtuxcoder/OpsRoom](https://github.com/mrtuxcoder/OpsRoom)
* 📺 **YouTube Demo:** [Watch the Walkthrough](https://youtu.be/1SA2d8gol98)
* ⚙️ **Switch Template:** [`switch/opsroom.template.yaml`](https://github.com/mrtuxcoder/OpsRoom/blob/main/switch/opsroom.template.yaml)
* 🚀 **Built for:** The WeMakeDevs *Flip the Switch Hackathon* (November 2026)
