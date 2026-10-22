---
title: "LANBox: Edge Homelab Systems Architecture"
description: "Designing a dedicated edge node for internal network services, hardware virtualization, and low-latency storage."
date: "2026-10-18"
tags:
  - Homelab
  - Linux
  - Networking
draft: false
---

## Overview

LANBox is an ongoing homelab infrastructure project designed to host critical internal services—DNS filtering, local metrics, wireguard meshes, and automated backup nodes—on low-power commodity silicon.

### Hardware Specifications

| Component | Model | Purpose |
| :--- | :--- | :--- |
| Compute | Intel NUC 11th Gen | Primary container host |
| Memory | 32 GB DDR4 3200MHz | Virtualization & caching |
| Storage | 1 TB NVMe SSD | Low-latency I/O persistence |
| Network | 2.5 GbE Intel NIC | LAN backbone transit |

### Network Route Inspection

```bash
# Verify gateway connectivity and default interface
ip route show default
ip addr show dev eth0
```

Refer back to the [Chronicle Case Study](/case-study/chronicle) for edge delivery comparison.
