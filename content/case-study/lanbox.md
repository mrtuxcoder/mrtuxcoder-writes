---
title: "Self-Hosted LAN File Storage & Deployment Automation with LANBox"
description: "LAN Device → Linux Server → Docker → Nginx → LANBox Backend → Filesystem. Designing a browser-based self-hosted network storage platform with containerized services and one-step installation automation."
date: "2026-09-23"
tags:
  - Linux
  - Docker
  - Docker Compose
  - Nginx
  - GHCR
  - Networking
  - Self-Hosted
draft: false
---

## Executive Summary

LANBox is a self-hosted LAN file-sharing and file-management platform designed to allow devices on the same local network to browse, upload, download, and organize files through a web browser without depending on third-party cloud storage.

The project was built as a practical systems engineering and DevOps exercise, focusing on Linux administration, Docker containerization, local area networking, Nginx reverse proxy configuration, pre-built image distribution via GitHub Container Registry (GHCR), and scripted deployment automation.

![LANBox application running in the browser](/images/case-study/lanbox/lanbox.png)

### Key Project Highlights

* **Private LAN Storage**: Secure file management restricted to the local network perimeter.
* **Universal Browser Ingress**: Frictionless access from smartphones, laptops, and desktop clients without client software installation.
* **Modular Containerization**: Independent Docker containers for frontend web delivery and backend filesystem manipulation.
* **Pre-Built Distribution**: Application artifacts built and hosted via GitHub Container Registry (GHCR).
* **Source-Free Installer**: Automated installation script that provisions `/opt/lanbox` and starts services without requiring source code cloning.
* **Multi-Tenant Homelab**: Co-located alongside Chronicle on a single Linux host with zero port conflicts.

---

## 1. System Architecture

The overall request lifecycle travels from private client devices over standard LAN protocols through an Nginx edge container into the backend filesystem handler:

```text
                                                 ┌─── LANBox Backend → Filesystem
LAN Device → Linux Server → Docker Compose → Nginx 
                                                 └─── LANBox Frontend
```

| Layer | Technology | Operational Responsibility |
| :--- | :--- | :--- |
| **Client** | Modern Web Browser | Interacts with file views, uploads, and media players |
| **Network** | Private Local Area Network | Provides isolated intranet connectivity to the host |
| **Host** | Linux Server | Manages kernel namespaces, disk storage, and Docker daemon |
| **Frontend** | Docker + Nginx | Serves static assets and reverse-proxies API requests |
| **Backend** | Node.js Runtime | Executes disk I/O, file streaming, and directory mutations |
| **Storage** | Host Ext4 Filesystem | Persists user files and directory structures |

---

## 2. Application Design

LANBox provides an intuitive browser-based interface for managing files directly on the host machine. The application decouples the user-facing interface from backend filesystem operations.

### Core Capabilities

* Recursive folder hierarchy navigation and creation
* High-throughput file uploading and chunked downloading
* Atomic file deletions and folder removals
* In-browser media previews for images, audio, and video formats
* Concurrent access across heterogeneous client devices on the LAN

By keeping client requirements minimal, any device capable of running a modern browser can read and write to the central storage node without specialized client applications.

---

## 3. Docker Deployment

LANBox is decoupled into separate frontend and backend microservices, managed as a unified stack using Docker Compose:

```text
LANBox
├── frontend container
│   └── Nginx (Port 80)
│
└── backend container
    └── Node.js (Internal Port 3000)
        └── Linux filesystem mount
```

* **Frontend Container Image**: `ghcr.io/mrtuxcoder/lanbox-client:latest`
* **Backend Container Image**: `ghcr.io/mrtuxcoder/lanbox-server:latest`
* **Port Ingress**: Frontend listens on port `80`; backend runs internally on port `3000`.
* **Zero Host Toolchains**: Because the host pulls pre-compiled images from GHCR, neither Node.js, npm, nor frontend build toolchains are required on the production host.

---

## 4. LAN Networking Architecture

LANBox operates primarily within a private network perimeter. The host server binds port `80` to all network interfaces (`0.0.0.0:80`), allowing devices connected to the local Wi-Fi or Ethernet switch to access the interface using the server's private LAN IP:

```text
Phone / Laptop
      │
      │ HTTP :80
      ▼
Linux Server (LAN IP)
      │
      ▼
LANBox Frontend (Nginx)
      │
      ▼
LANBox Backend (Node.js :3000)
      │
      ▼
Local Disk Storage
```

* Frontend is exposed cleanly on TCP port `80`.
* The backend remains internal to the private Docker bridge network.
* Devices connect seamlessly without VPN tunnels or special certificates.

---

## 5. Automated Linux Installation Workflow

To make self-hosting frictionless, LANBox includes a shell installer that sets up the application without requiring a manual Git repository clone:

```text
Linux Machine
     │
     ▼
Run Installer with sudo
     │
     ▼
Check Docker & Compose
     │
     ▼
Create /opt/lanbox
     │
     ▼
Generate .env configuration
     │
     ▼
Download Compose Manifest
     │
     ▼
Pull Pre-Built Images from GHCR
     │
     ▼
Launch Containers (up -d)
     │
     ▼
Verify Container Health
     │
     ▼
Display Resolved LAN IP Address
```

The script verifies Docker dependencies, creates standard system directories under `/opt/lanbox`, downloads the Compose manifest, starts the stack, and outputs the exact local URL for browser access.

---

## 6. Co-Locating Multiple Services on One Server

LANBox was deployed on the same Linux homelab server that concurrently powers the Chronicle publication stack. Both applications run as independent Docker Compose projects with dedicated network spaces and isolated ports:

```text
Linux Homelab Server
│
├── Chronicle Compose Stack
│   ├── Frontend → :8080 (Cloudflare Tunnel target)
│   ├── Backend
│   └── MongoDB
│
└── LANBox Compose Stack
    ├── Frontend → :80 (LAN target)
    └── Backend → Internal :3000
```

![LANBox and Chronicle running simultaneously on the same Linux server](/images/case-study/lanbox/lanbox-terminal.png)

This verified multi-project coexistence, port isolation, and predictable resource utilization on a single Linux host.

---

## 7. Key Engineering Challenges

### 1. LAN Network Reachability
Allowing client devices to connect required binding Nginx to the host's actual network interface rather than `127.0.0.1`. Ensuring firewall rules permitted port `80` traffic across the subnet was key to mobile accessibility.

### 2. Multi-App Port Conflicts
Because Chronicle also runs on the server, port allocations were assigned intentionally: Chronicle's frontend listens on port `8080` (routed via Cloudflare Tunnel), while LANBox claims port `80` for straightforward local LAN access without requiring port numbers in the URL.

### 3. Source-Free Delivery
Distributing application binaries via GitHub Container Registry decoupled deployment from source code, enabling rapid clean-slate installs across different machines.

### 4. Deployment Automation
Codifying manual container provisioning into an idempotent bash script eliminated human configuration error during setup.

---

## 8. Deployment Validation Checklist

* [x] LANBox frontend listening stably on host port `80`
* [x] Node.js backend container isolated and communicating over internal Docker bridge
* [x] Multi-architecture container images successfully published to GHCR
* [x] Tested full file read/write workflows from mobile and desktop browsers over Wi-Fi
* [x] Verified simultaneous execution of LANBox and Chronicle with zero resource contention
* [x] Server reboot recovery confirmed via Docker Compose restart policies

---

## 9. Systems & DevOps Takeaways

* **Linux System Administration**: Practical handling of file ownership, systemd services, host firewall rules, and process monitoring.
* **Container Isolation**: Running multiple isolated Compose projects on one host proves containerization is the cleanest method for preventing dependency collisions.
* **Pre-Built Distribution**: Container registries turn complex multi-tier applications into easily deployable appliances.
* **Self-Hosting Independence**: Demonstrates that consumer hardware can reliably replace cloud storage for local data needs.

---

## 10. Conclusion

LANBox evolved from a simple file-management utility into a complete exercise in self-hosted infrastructure: container packaging, local networking, Nginx configuration, registry pipelines, and deployment automation.

> *"Build it, deploy it, break it, understand it."*  
> — Guganraj Rengaraju
