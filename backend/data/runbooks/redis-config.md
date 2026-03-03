# Redis Configuration — Internal Runbook

## Connection Pool Settings

The auth-service Redis instance uses a connection pool with the following defaults:

```python
# config/redis.py
REDIS_POOL = redis.ConnectionPool(
    host='auth-redis-primary',
    port=6379,
    max_connections=20,
    timeout=5,
    retry_on_timeout=True
)
```

## Common Issues

### Connection Pool Exhaustion
- **Symptom:** `ConnectionPoolExhausted` errors in auth-service logs
- **Cause:** Zombie processes holding connections, or connection leaks in session handlers
- **Fix:**
  1. Kill idle connections: `redis-cli -h auth-redis-primary CLIENT LIST | grep idle=300 | awk '{print $2}' | xargs -I {} redis-cli CLIENT KILL ID {}`
  2. Increase pool size in config: `max_connections=50`
  3. Add connection health checks: `health_check_interval=30`

### Timeout Configuration
- Default timeout: 5s for regular ops, 30s for blocking ops
- If timeouts spike, check network latency to Redis host first
