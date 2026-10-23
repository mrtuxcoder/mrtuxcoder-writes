---
title: "End-to-End Deployment of Guidra Backend on Azure VM"
description: "Azure VM → Nginx → Node.js → MongoDB Atlas. Documenting production-oriented deployment practices on cloud infrastructure: host hardening, defense-in-depth firewalls, Nginx reverse proxy, SSL termination, and PM2 process management."
date: "2026-09-22"
tags:
  - Azure
  - Cloud
  - Ubuntu
  - Nginx
  - Nodejs
  - PM2
  - MongoDB
  - Security
  - SSL
draft: false
---

## Executive Summary

This case study documents the production deployment of the Guidra backend API on Microsoft Azure cloud infrastructure. The implementation demonstrates production-oriented systems practices including cloud VM provisioning, security hardening, reverse proxy configuration, SSL termination, process supervision, and managed database integration.

* **Technologies Used**: Azure Virtual Machine (Ubuntu 24.04 LTS), Nginx, Node.js 20 LTS, PM2, MongoDB Atlas, Let's Encrypt, UFW, fail2ban

### Key Operational Metrics

* **API Latency**: ~150–230ms round-trip response time
* **Idle Memory Footprint**: ~600MB resident system memory
* **Tested Availability**: 7+ days continuous operational stability
* **SSL Security Rating**: Grade A verified on Qualys SSL Labs
* **Automated Provisioning**: Deployment script executes in under 30 seconds
* **Process Recovery**: Respawn latency < 2 seconds following process crash

---

## 1. System Architecture

Traffic passes through multi-layer defense-in-depth firewalls before reaching the Nginx reverse proxy and PM2-managed application processes:

```text
Internet → Azure NSG → UFW → Nginx (Reverse Proxy) → PM2 → Node.js App → MongoDB Atlas
```

| Architectural Layer | Technology Stack | Operational Purpose |
| :--- | :--- | :--- |
| **Cloud Infrastructure** | Azure VM (B2als v2) | Virtualized compute resources running Ubuntu 24.04 |
| **Network Security** | Azure NSG + Host UFW | Multi-tier defense-in-depth packet filtering |
| **Reverse Proxy** | Nginx | SSL/TLS termination, HTTP-to-HTTPS redirects, rate buffering |
| **Application Runtime** | Node.js 20 LTS | Asynchronous JavaScript execution environment |
| **Process Supervisor** | PM2 Process Manager | Zero-downtime clustering, systemd integration, crash auto-restart |
| **Cloud Database** | MongoDB Atlas | Managed distributed document database with TLS SRV records |
| **Intrusion Prevention** | fail2ban & SSH Hardening | Brute-force mitigation and port scanning defense |
| **Certificate Authority** | Let's Encrypt + Certbot | Automated 90-day TLS certificate generation and renewal |

---

## 2. Multi-Stage Deployment Phases

### Phase 1: Infrastructure Foundation
* Provisioned Ubuntu 24.04 LTS Azure Virtual Machine with static public IP assignment.
* Established passwordless SSH public key authentication.
* Configured dedicated non-root administrative deploy user with targeted sudo privileges.
* Enabled Uncomplicated Firewall (UFW) with a default-deny policy, explicitly allowing only ports `22` (SSH), `80` (HTTP), and `443` (HTTPS).

### Phase 2: Security Implementation
* Hardened OpenSSH daemon (`/etc/ssh/sshd_config`): disabled root login, password authentication, and non-essential PAM features.
* Configured fail2ban with custom SSH jail parameters (3 failed attempts trigger a 1-hour ban).
* Enabled automated unattended security patch upgrades.
* Configured Azure Network Security Group (NSG) ingress rules matching the host firewall.

### Phase 3: Application Stack Setup
* Installed Node.js LTS via Node Version Manager (NVM).
* Configured PM2 as a systemd service for persistent application daemonization.
* Integrated MongoDB Atlas connection string with secure environment variables.
* Tested database authentication and TLS handshakes using Node.js client drivers.

### Phase 4: Web Server & SSL Configuration
* Configured Nginx reverse proxy blocks to forward requests to the local Node.js upstream.
* Provisioned Let's Encrypt TLS certificates using Certbot automated ACME challenges.
* Implemented automatic HTTP to HTTPS 301 redirection.
* Bound domain DNS records to the static Azure public IP address.

---

## 3. Engineering Challenges & Incidents

### Self-Inflicted SSH Lockout
During aggressive fail2ban jail testing, simulated brute-force authentication triggered a local IP ban on the host.  
* **Resolution**: Leveraged Azure Cloud Shell serial console to access the VM out-of-band, inspected `/var/log/fail2ban.log`, unbanned the workstation IP, and tuned jail thresholds. This validated both fail2ban's real-world blocking effectiveness and the necessity of cloud provider fallback mechanisms.

### Nginx IPv6 Wildcard Binding
Initial configurations failed to bind properly to IPv6 interfaces on Azure's dual-stack virtual network.  
* **Resolution**: Added explicit `listen [::]:80;` and `listen [::]:443 ssl;` directives to Nginx server blocks to accept dual-stack connections reliably.

---

## 4. Defense-in-Depth Security Hardening

Security was implemented across multiple orthogonal layers rather than relying on a single control point:

1. **Cloud Perimeter**: Azure NSG discards unapproved network packets before reaching VM interfaces.
2. **Host Firewall**: UFW drops unexpected ingress attempts directly at the Linux kernel level.
3. **Intrusion Defense**: fail2ban dynamically modifies iptables to quarantine abusive source IPs.
4. **Access Control**: SSH login requires RSA-4096 / Ed25519 key authentication; root login is completely disabled.
5. **Automated Upgrades**: `unattended-upgrades` applies upstream security patches autonomously.

---

## 5. Production Readiness Validation

The deployment underwent rigorous failure and recovery testing:

* **Reboot Persistence**: Validated that PM2 and Nginx restore services automatically after system reboot via systemd unit hooks.
* **Process Crash Auto-Respawn**: Killed Node.js worker processes with `kill -9`; PM2 respawned the instance within 2 seconds.
* **Certificate Renewal Verification**: Executed `certbot renew --dry-run` successfully.
* **Port Verification**: Scanned the public IP with `nmap` to confirm that only ports `22`, `80`, and `443` were discoverable.

---

## 6. Key Systems Lessons

* **Cloud Networking**: Cloud virtual machines always require explicit Network Security Group (NSG) configuration in addition to host firewalls.
* **Process Supervision**: Tools like PM2 are critical for ensuring Node.js processes recover instantly from unhandled exceptions.
* **Automated TLS**: Modern ACME certbots eliminate the maintenance risk of expired SSL certificates.
* **Out-of-Band Recovery**: Cloud console access is an indispensable safety net when testing intrusion prevention systems.
* **Idempotent Automation**: Codifying server provisioning into repeatable shell scripts prevents human error during multi-server rollouts.

---

## Conclusion

The Guidra deployment provided end-to-end practical experience with cloud server administration, defense-in-depth networking, reverse proxying, and production process supervision.

> *"Documentation is the difference between experience and expertise."*  
> — Guganraj Rengaraju
