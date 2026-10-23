---
title: "Deployment & Architecture of Chronicle on Linux Homelab"
description: "Internet → Cloudflare → Tunnel → Homelab → Docker → Nginx. Packaging, deploying, automating, and recovering a full-stack blogging platform on self-hosted Linux infrastructure."
date: "2026-09-24"
tags:
  - Linux
  - Docker
  - Docker Compose
  - Nginx
  - CI/CD
  - Cloudflare
  - Tailscale
  - MongoDB
draft: false
---

## 1. From Application to Deployment

Chronicle started as a full-stack blogging platform built with React, Node.js, Express, and MongoDB. The application follows a simple publishing model: anyone can read published articles, while only the authenticated Chronicle administrator can create, edit, publish, and delete articles.

Once the application was working locally, I wanted to go beyond application development and learn how to package, deploy, update, troubleshoot, and recover the entire system on a Linux homelab server.

![Chronicle blogging application running in the browser](/images/case-study/chronicle/chronicle-app.png)

### Final Deployment Stack

* **Frontend**: React served by Nginx
* **Backend API**: Node.js + Express REST API
* **Database**: MongoDB running as a container with named volume persistence
* **Orchestration**: Docker Compose for multi-service coordination
* **Continuous Integration & Delivery**: GitHub Actions
* **Image Distribution**: GitHub Container Registry (GHCR)
* **Private Networking**: Tailscale for secure server management and deployment
* **Public Ingress**: Cloudflare Tunnel for outbound HTTPS access without open inbound ports

---

## 2. The Final Architecture

The deployment is defined by a Docker Compose configuration. The Linux homelab server runs the frontend, backend, and MongoDB as separate containers. Public traffic reaches the homelab through Cloudflare Tunnel.

```text
                         Public Internet
                               │
                               ▼
                          Cloudflare
                               │
                       Cloudflare Tunnel
                               │
                               ▼
                          cloudflared
                               │
                               ▼
                         Linux Homelab
                               │
                         Docker Compose
                               │
                        ┌──────┴──────┐
                        │             │
                    frontend       backend
                    Nginx :80     Node.js :5000
                        │             │
                        │             ▼
                        │          MongoDB
                        │
                        └── /api/* → backend
```

| Service | Technology | Responsibility |
| :--- | :--- | :--- |
| **frontend** | React + Nginx | Serves compiled static assets and proxies API requests |
| **backend** | Node.js + Express | REST API, authentication, and application logic |
| **mongodb** | MongoDB 6.0 | Application state and encrypted administrator credentials |

---

## 3. Containerizing the Application

Instead of installing the application runtime and dependencies directly on the server, I created Docker images for the frontend and backend. MongoDB runs from the official MongoDB image.

Docker Compose defines how these services work together. The containers share a private Docker network and communicate using Compose service names instead of hardcoded container IP addresses.

* The frontend reaches the backend through the internal hostname `backend:5000`.
* The backend reaches MongoDB through the hostname `mongodb:27017`.
* MongoDB uses a named Docker volume mounted at `/data/db`. This keeps database data independent from the lifecycle of the container, allowing containers to be upgraded or recreated without data loss.

![Chronicle Docker containers running in the terminal](/images/case-study/chronicle/chronicle-terminal.png)

---

## 4. Nginx as the Application Entry Point

Nginx runs inside the frontend container and acts as the local entry point for Chronicle. It serves the compiled React application and forwards requests under `/api/` to the backend service.

```text
Cloudflare Tunnel
        │
        ▼
    Nginx :80
        │
        ├── /       → React application
        │
        └── /api/*  → backend:5000
```

This gives the application a single internal entry point. The browser does not need to know the backend container's internal address, while Docker's internal DNS handles service discovery between containers.

---

## 5. CI/CD with GitHub Actions

After the Docker deployment was working, I changed the workflow so the server no longer needed the frontend and backend source directories. GitHub Actions became responsible for building and publishing the application images.

```text
git push
   │
   ▼
GitHub Actions
   │
   ├── Build frontend image
   ├── Build backend image
   └── Publish images
          │
          ▼
        GHCR
          │
          ▼
   Homelab server
          │
          ├── docker compose pull
          └── docker compose up -d
```

The application images are published to GitHub Container Registry. During deployment, the server pulls the new images and recreates the services using the Docker Compose configuration already present on the server.

This separates the application source code from the deployment environment. The server needs only the Compose configuration, environment secrets, and Docker runtime, while application code is packaged into immutable images.

![Chronicle CI/CD workflow from GitHub Actions to deployment](/images/case-study/chronicle/chronicle-workflow.png)

---

## 6. Public Access with Cloudflare Tunnel

Chronicle runs on a Linux homelab server and is made publicly accessible through Cloudflare Tunnel. The `cloudflared` daemon runs on the homelab and maintains an outbound connection to Cloudflare, allowing the application to be accessed from the internet without directly exposing the homelab server.

```text
Internet
    │
    ▼
Cloudflare
    │
    │ Cloudflare Tunnel
    ▼
cloudflared
    │
    ▼
Chronicle frontend :80
    │
    ▼
Nginx
    │
    └── /api/* → backend:5000
```

The public application is available through Cloudflare-managed HTTPS. The homelab does not require an inbound public port to be opened. Tailscale remains separate from the public access path and is used strictly for private server administration and deployment triggers.

---

## 7. Admin Credential Initialization

Chronicle uses an admin-only publishing model. Public visitors can read published articles, while only the authenticated administrator can create, edit, publish, or delete articles.

The backend includes a credential-generation script that creates the administrator credential directly in MongoDB. The script accepts a username, password, and optional role, hashes the password with bcrypt, and stores the resulting credential:

```bash
node scripts/createCredential.js <username> <password> [role]
```

Because the script is included in the backend image, it can be executed inside the backend container on the server. The script communicates with MongoDB through the Docker Compose network using the MongoDB service hostname.

---

## 8. Debugging a Real Deployment Failure

One automated deployment exposed a Docker networking issue. The frontend container exited immediately because Nginx could not resolve the backend service:

```text
host not found in upstream "backend"
```

I inspected the actual Docker runtime state using inspection commands:

```bash
docker inspect <container_id>
docker network inspect chronicle_default
docker compose config
```

The investigation revealed that the backend was attached to the expected `chronicle_default` bridge network, but the recreated frontend container had failed to attach to the network during an interrupted pull.

Recreating the frontend through Docker Compose reattached it to the correct network. Docker's internal DNS immediately resolved `backend`, Nginx started successfully, and traffic flow was restored.

---

## 9. Deployment and Recovery Testing

After deployment was working, I tested the system beyond normal successful operation. The server was rebooted to verify that Docker services could return to a working state without manually rebuilding the application.

* The MongoDB named volume preserved database data across container recreation.
* Docker daemon restart policies (`restart: unless-stopped`) restored application services after the host rebooted.
* Cloudflare Tunnel automatically re-established outbound connectivity.

This validated an important part of the deployment: the system was not only able to run successfully, but could also recover autonomously after an unexpected host restart.

---

## 10. Key DevOps & Systems Lessons

* **Docker Images**: Packaging application dependencies and runtime requirements ensures the host server does not need to reproduce complex local development environments.
* **Docker Compose**: Cleanly codifies how containers, networks, volumes, and service dependencies interact as a single unit.
* **Container Networking**: Internal service names like `backend` and `mongodb` resolve deterministically via Docker's built-in DNS daemon.
* **Persistent Storage**: Databases require volume mounts decoupled from container lifecycles to prevent data loss during image updates.
* **Automated CI/CD**: Building and publishing images to GHCR enables push-button deployments without copying raw source code to the host.
* **Cloudflare Tunnel**: Enables secure public ingress over outbound connections without opening router firewall ports.
* **Runtime Verification**: Inspecting real container socket and network state with `docker inspect` is far more reliable than assuming the runtime matches the Compose file.
* **Host Recovery**: Periodic reboot and crash testing exposes hidden failure modes that never appear during typical operation.

---

## Conclusion

Chronicle started as a blogging application, but the deployment process became the most valuable part of the project. It provided a practical environment for understanding how application code, containers, networking, CI/CD, persistent storage, reverse proxies, and a Linux host fit together into a reliable system.
