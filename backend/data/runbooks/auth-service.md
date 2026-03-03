# Auth Service — Internal Runbook

## Overview
The auth-service handles authentication and session management. It depends on Redis for session storage and interfaces with the identity verification API.

## Architecture
- **Language:** Python 3.11 (FastAPI)
- **Session Store:** Redis (auth-redis-primary)
- **Dependencies:** id-verification-api, user-db-primary

## Runbook: Service Degradation

### Step 1: Check health endpoint
```bash
curl -s http://auth-service:8080/health | jq
```

### Step 2: Check Redis connectivity
```bash
redis-cli -h auth-redis-primary ping
redis-cli -h auth-redis-primary INFO clients
```

### Step 3: Restart affected pods
```bash
kubectl rollout restart deployment/auth-service -n production
```

### Step 4: Verify recovery
Monitor error rates for 5 minutes post-restart. If errors persist, escalate to Platform team.
