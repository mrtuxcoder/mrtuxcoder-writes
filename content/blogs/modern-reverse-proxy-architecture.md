---
title: "Modern Reverse Proxy Architecture: Edge Routing & TLS Termination"
description: "How to configure a resilient edge reverse proxy with automatic SSL certification, header filtering, and low-latency upstream multiplexing."
date: "2026-10-23"
tags:
  - Networking
  - Linux
  - DevOps
  - Infrastructure
draft: false
---

## Introduction

A reverse proxy serves as the gateway for public web traffic, terminating TLS connections, managing security policies, and routing requests to internal microservices or containerized workloads.

In modern homelab and production infrastructure, deploying a dedicated proxy decouples application logic from transport-layer encryption and certificate rotation.

---

## Traffic Flow Architecture

The diagram below outlines request flow from public client ingress down to internal network meshes:

![Reverse Proxy Routing Architecture](/images/reverse-proxy-flow.svg)

Incoming requests arrive over HTTPS on TCP port `443`. The edge layer terminates TLS certificates automatically, validates headers, and forwards requests over a private, non-routable bridge interface.

### Key Architectural Benefits

1. **Centralized Certificate Lifecycle**: Zero-touch Let's Encrypt renewal using automated ACME challenges.
2. **Namespace Isolation**: Upstream backend applications bind only to internal loopback interfaces or container networks.
3. **Observability**: Standardized structured JSON access logs emitted for monitoring stacks.

---

## Proxy Engine Comparison

Selecting the right engine depends on configuration ergonomics and memory footprint:

| Feature | Caddy Server | NGINX | Traefik |
| :--- | :--- | :--- | :--- |
| Automatic TLS | Native (Built-in) | Manual / Certbot | Native (Built-in) |
| Configuration Syntax | Declarative Caddyfile | Imperative Blocks | YAML / Labels |
| Docker Provider | Via Plugin | External Templates | Native Auto-Discovery |
| Memory Footprint | ~30 MB | ~15 MB | ~45 MB |
| HTTP/3 (QUIC) | Default | Optional Compile | Supported |

---

## Production Configuration Blueprint

Below is a production-ready Caddyfile snippet demonstrating transparent proxying and strict security headers:

```nginx
notes.guganraj.me {
    encode zstd gzip

    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    reverse_proxy 127.0.0.1:4321 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }

    log {
        output file /var/log/caddy/notes.access.log {
            roll_size 10MB
            roll_keep 5
        }
    }
}
```

### Health Check Verification

You can verify TLS handshake parameters and header injection with a standard curl probe:

```bash
curl -Iv https://notes.guganraj.me 2>&1 | grep -E "HTTP/|server:|strict-transport"
```

> **Security Note**: Never expose raw upstream application ports directly to public interfaces. Ensure firewall rules (`ufw` or `nftables`) restrict ingress strictly to ports `80` and `443`.

## Summary

Placing a modern reverse proxy in front of static or dynamic services establishes an immutable perimeter, simplifies TLS administration, and ensures uniform security headers across all subdomains.
