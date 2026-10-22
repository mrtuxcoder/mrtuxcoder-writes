---
title: "Understanding Docker Bridge & Host Networking"
description: "A deep dive into container network namespaces, virtual bridge interfaces, and iptables port forwarding rules."
date: "2026-10-19"
tags:
  - Docker
  - Linux
  - Networking
draft: false
---

## Introduction to Container Networks

Docker provides multiple network drivers to isolate or bridge container network namespaces. Choosing the right driver impacts both latency and container discoverability.

### Bridge Network Driver

The default network creates a virtual bridge interface named `docker0`.

```bash
# Inspect docker bridge interface
ip addr show docker0

# Create custom user-defined bridge
docker network create --driver bridge app-network
```

### Port Mapping Mechanics

When you expose a port using `-p 8080:80`, Docker installs an `iptables` NAT rule on the host:

```text
PREROUTING -p tcp -m tcp --dport 8080 -j DNAT --to-destination 172.18.0.2:80
```

> **Note**: User-defined bridge networks provide automatic DNS resolution between containers by container name, avoiding hardcoded IP addresses.
