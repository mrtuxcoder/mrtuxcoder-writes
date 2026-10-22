---
title: "[Test Fixture] LANBox: Edge Homelab Systems"
description: "A test fixture verifying routing and multi-category discovery for LANBox edge infrastructure."
date: "2026-10-18"
tags:
  - Homelab
  - Linux
  - Networking
draft: false
---

## Overview

This is a test fixture demonstrating case study documentation for a local edge node.

### System Specifications

| Component | Model | Purpose |
| :--- | :--- | :--- |
| Compute | Intel NUC 11th Gen | Container host |
| Memory | 32 GB DDR4 3200MHz | Virtualization & caching |
| Storage | 1 TB NVMe SSD | Fast I/O persistence |
| Network | 2.5 GbE Intel NIC | LAN backbone |

### Network Route Inspection

```bash
ip route show default
ip addr show dev eth0
```

Refer back to the [Chronicle Case Study](/case-study/chronicle) for comparison.
