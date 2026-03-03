# Chaos injector & state machine for demo scenarios
# Generates realistic failure logs with real timestamps and manages system state

import time
from datetime import datetime, timezone, timedelta
from typing import Optional


class Simulator:
    """
    State machine: HEALTHY → INCIDENT_ACTIVE → RECOVERING → HEALTHY
    Tracks real timestamps for incident timeline.
    """

    def __init__(self):
        self.state = "healthy"
        self.active_scenarios: list[str] = []
        self.incident_start: Optional[float] = None
        self.total_fixes_available = 3
        self.fixes_applied = 0
        self.metrics = {
            "latency_ms": 32,
            "error_rate": 0.001,
            "cpu_percent": 24,
            "active_connections": 18,
            "queue_depth": 0,
        }
        # Timeline tracking for post-mortem
        self.timeline: list[dict] = []

    # ── Scenario definitions ──

    SCENARIOS = {
        "redis-timeout": {
            "name": "Redis Connection Timeout",
            "affected_services": ["auth-service", "id-verification-api"],
            "log_template": """[{ts0}] ERROR auth-service/redis_pool.py:142 — ConnectionPoolExhausted: Cannot acquire connection from pool (max=20, active=20, idle=0)
[{ts0}] WARN  auth-service/health.py:58 — Health check failing: Redis ping timeout after 5000ms
[{ts1}] ERROR id-verification-api/session.py:87 — TimeoutError: Redis GET session:usr_4829 timed out after 30s
[{ts1}] ERROR id-verification-api/session.py:91 — Traceback: File "session.py", line 87, in get_session | redis.exceptions.TimeoutError
[{ts2}] WARN  auth-service/pool_monitor.py:33 — 14 connections idle >300s detected — possible zombie processes
[{ts2}] ERROR auth-service/redis_pool.py:148 — Connection attempt 3/3 failed: ConnectionRefusedError [Errno 111]
[{ts3}] CRIT  monitoring/alert_manager.py:201 — ALERT FIRED: redis_connection_pool_exhausted (auth-redis-primary)
[{ts3}] ERROR id-verification-api/verify.py:134 — Identity verification failed for application APP-29481: upstream timeout
[{ts4}] WARN  gateway/circuit_breaker.py:45 — Circuit breaker OPEN for auth-service (failures: 12/10 threshold)
[{ts5}] INFO  monitoring/pager.py:89 — Page sent to on-call: redis_pool_exhausted severity=critical""",
            "metrics_override": {
                "latency_ms": 5000,
                "error_rate": 0.23,
                "cpu_percent": 45,
                "active_connections": 20,
            },
        },
        "api-degradation": {
            "name": "API Latency Spike",
            "affected_services": ["id-verification-api", "gateway"],
            "log_template": """[{ts0}] WARN  id-verification-api/interac.py:67 — Interac API response time: 4200ms (threshold: 500ms)
[{ts1}] WARN  id-verification-api/interac.py:67 — Interac API response time: 6800ms (threshold: 500ms)
[{ts1}] ERROR id-verification-api/interac.py:72 — Interac API request timeout after 10000ms for verification VER-88291
[{ts2}] WARN  gateway/rate_limiter.py:34 — Request queue depth: 247 (normal: <20)
[{ts2}] ERROR id-verification-api/handler.py:91 — 503 Service Unavailable returned to client — upstream Interac degraded
[{ts3}] WARN  id-verification-api/metrics.py:28 — p99 latency: 8400ms (SLA: 200ms) — SLA breach detected
[{ts3}] ERROR gateway/circuit_breaker.py:45 — Circuit breaker OPEN for id-verification-api (failures: 8/5 threshold)
[{ts4}] CRIT  monitoring/alert_manager.py:201 — ALERT FIRED: api_latency_sla_breach (id-verification-api)
[{ts4}] INFO  gateway/fallback.py:19 — Fallback mode activated: returning cached verification results where available
[{ts5}] INFO  monitoring/pager.py:89 — Page sent to on-call: api_latency_critical severity=critical""",
            "metrics_override": {
                "latency_ms": 8400,
                "error_rate": 0.15,
                "cpu_percent": 72,
                "active_connections": 247,
            },
        },
        "queue-backlog": {
            "name": "Document Processing Backlog",
            "affected_services": ["doc-processor", "title-search-service"],
            "log_template": """[{ts0}] WARN  doc-processor/queue.py:45 — Queue depth: 892 documents (normal: <50)
[{ts0}] ERROR doc-processor/worker.py:112 — Worker pool exhausted: 0/8 workers available
[{ts1}] WARN  doc-processor/worker.py:67 — Worker-3 stuck processing DOC-44891 for 1847s (timeout: 300s)
[{ts1}] WARN  doc-processor/worker.py:67 — Worker-7 stuck processing DOC-44756 for 2201s (timeout: 300s)
[{ts2}] ERROR title-search-service/api.py:89 — Title search request TSR-29481 queued — estimated wait: 45min
[{ts2}] WARN  doc-processor/memory.py:34 — Memory usage: 89% — approaching OOM threshold
[{ts3}] ERROR doc-processor/worker.py:118 — Worker-3 killed: OOMKilled (RSS: 3.8GB, limit: 4GB)
[{ts3}] CRIT  monitoring/alert_manager.py:201 — ALERT FIRED: doc_processing_backlog_critical (doc-processor)
[{ts4}] WARN  title-search-service/sla.py:22 — SLA breach: 34 title searches pending >30min
[{ts5}] INFO  monitoring/pager.py:89 — Page sent to on-call: doc_processor_backlog severity=high""",
            "metrics_override": {
                "latency_ms": 2500,
                "error_rate": 0.08,
                "cpu_percent": 89,
                "queue_depth": 892,
            },
        },
        "ssl-cert-expiry": {
            "name": "SSL Certificate Expiry",
            "affected_services": ["title-search-service", "gateway", "nginx-ingress"],
            "log_template": """[{ts0}] WARN  nginx-ingress/ssl_monitor.py:34 — SSL certificate for *.titleops.fct.ca expires in 0 days (serial: 3A:F2:9B:...)
[{ts0}] ERROR gateway/tls.py:89 — TLS handshake failed: certificate has expired (NotAfter: {ts0})
[{ts1}] ERROR title-search-service/client.py:201 — HTTPS request to title-search.fct.ca failed: SSL: CERTIFICATE_VERIFY_FAILED [ssl: 0x1416F086]
[{ts1}] WARN  gateway/tls.py:94 — 47 downstream clients received ERR_CERT_DATE_INVALID in last 60s
[{ts2}] ERROR id-verification-api/interac.py:145 — Interac callback webhook rejected: peer certificate expired
[{ts2}] CRIT  monitoring/alert_manager.py:201 — ALERT FIRED: ssl_certificate_expired (*.titleops.fct.ca)
[{ts3}] ERROR gateway/proxy.py:67 — 502 Bad Gateway for 12 upstream services — TLS termination failing
[{ts3}] WARN  title-search-service/health.py:19 — Health check FAILING: cannot establish secure connection to search index
[{ts4}] ERROR auth-service/oauth.py:88 — OAuth2 token refresh failed: SSL certificate problem: certificate has expired
[{ts5}] INFO  monitoring/pager.py:89 — Page sent to on-call: ssl_cert_expired severity=critical""",
            "metrics_override": {
                "latency_ms": 12000,
                "error_rate": 0.67,
                "cpu_percent": 30,
                "active_connections": 0,
            },
        },
        "dns-resolution-failure": {
            "name": "DNS Resolution Failure",
            "affected_services": ["salesforce-sync", "crm-integration", "gateway"],
            "log_template": """[{ts0}] ERROR salesforce-sync/api.py:56 — socket.gaierror: [Errno -2] Name or service not known: 'api.salesforce.com'
[{ts0}] WARN  crm-integration/resolver.py:23 — DNS lookup for login.salesforce.com timed out after 5s (attempt 1/3)
[{ts1}] ERROR salesforce-sync/api.py:56 — socket.gaierror: [Errno -2] Name or service not known: 'api.salesforce.com'
[{ts1}] ERROR crm-integration/resolver.py:27 — DNS lookup for login.salesforce.com failed after 3 retries — NXDOMAIN
[{ts2}] WARN  gateway/upstream.py:112 — Upstream salesforce-sync unreachable — DNS resolution failed for api.salesforce.com
[{ts2}] ERROR salesforce-sync/lead_sync.py:89 — Failed to sync 234 pending leads: ConnectionError(MaxRetryError)
[{ts3}] CRIT  monitoring/alert_manager.py:201 — ALERT FIRED: dns_resolution_failure (salesforce-sync, crm-integration)
[{ts3}] WARN  crm-integration/fallback.py:44 — Switching to cached CRM data — last fresh sync: 47min ago
[{ts4}] ERROR salesforce-sync/webhook.py:67 — Inbound Salesforce webhook delivery failed: DNS failure resolving callback URL
[{ts5}] INFO  monitoring/pager.py:89 — Page sent to on-call: dns_failure severity=high""",
            "metrics_override": {
                "latency_ms": 15000,
                "error_rate": 0.45,
                "cpu_percent": 18,
                "active_connections": 3,
            },
        },
        "memory-leak": {
            "name": "Memory Leak — RPA Worker",
            "affected_services": ["rpa-worker", "doc-processor", "title-search-service"],
            "log_template": """[{ts0}] WARN  rpa-worker/memory.py:34 — Heap usage: 3.2GB / 4GB (80%) — rising 200MB/min
[{ts0}] WARN  rpa-worker/gc.py:19 — GC cycle took 4.7s (threshold: 0.5s) — 1.2M unreachable objects
[{ts1}] ERROR rpa-worker/ibm_cloudpak.py:201 — IBM RPA bot session leaked: 847 open browser handles detected (expected: \u003c10)
[{ts1}] WARN  rpa-worker/memory.py:34 — Heap usage: 3.6GB / 4GB (90%) — OOM imminent
[{ts2}] ERROR doc-processor/worker.py:89 — Worker-2 response time degraded: 34s per document (SLA: 2s)
[{ts2}] ERROR rpa-worker/ibm_cloudpak.py:215 — RPA session pool saturated: 50/50 sessions active, 12 queued
[{ts3}] CRIT  rpa-worker/memory.py:41 — OOMKilled: rpa-worker-pod-7f8b9 (RSS: 4.1GB, limit: 4GB, restarts: 3)
[{ts3}] CRIT  monitoring/alert_manager.py:201 — ALERT FIRED: rpa_worker_oom (rpa-worker-pod-7f8b9)
[{ts4}] ERROR title-search-service/queue.py:34 — 127 title search jobs stuck in PROCESSING state — worker OOM
[{ts5}] INFO  monitoring/pager.py:89 — Page sent to on-call: rpa_oom_critical severity=critical""",
            "metrics_override": {
                "latency_ms": 34000,
                "error_rate": 0.31,
                "cpu_percent": 97,
                "active_connections": 50,
                "queue_depth": 127,
            },
        },
        "k8s-crashloop": {
            "name": "Kubernetes Pod CrashLoopBackOff",
            "affected_services": ["id-verification-api", "auth-service", "k8s-cluster"],
            "log_template": """[{ts0}] ERROR k8s-cluster/events.py:45 — Pod id-verification-api-6d4f8b-xk9p2 entered CrashLoopBackOff (restarts: 5, backoff: 160s)
[{ts0}] ERROR id-verification-api/main.py:12 — RuntimeError: Failed to connect to config-server:8888 — Connection refused
[{ts1}] WARN  k8s-cluster/hpa.py:67 — HorizontalPodAutoscaler unable to scale: 0/3 pods ready for id-verification-api
[{ts1}] ERROR k8s-cluster/events.py:45 — Pod auth-service-8a2c1d-mn4q7 entered CrashLoopBackOff (restarts: 4, backoff: 80s)
[{ts2}] ERROR auth-service/main.py:18 — ConnectionError: config-server:8888 — Could not fetch /auth-service/production configuration
[{ts2}] WARN  k8s-cluster/node.py:89 — Node k8s-worker-03: 14 pods in Error state, node pressure: memory 87%
[{ts3}] CRIT  monitoring/alert_manager.py:201 — ALERT FIRED: k8s_crashloop_multiple (id-verification-api, auth-service)
[{ts3}] ERROR gateway/upstream.py:56 — All endpoints DOWN for id-verification-api — 0 healthy pods
[{ts4}] ERROR gateway/circuit_breaker.py:45 — Circuit breaker OPEN for id-verification-api (0 healthy endpoints)
[{ts4}] WARN  k8s-cluster/dns.py:23 — CoreDNS: NXDOMAIN for id-verification-api.default.svc.cluster.local — no endpoints
[{ts5}] INFO  monitoring/pager.py:89 — Page sent to on-call: k8s_crashloop_critical severity=critical""",
            "metrics_override": {
                "latency_ms": 30000,
                "error_rate": 0.92,
                "cpu_percent": 87,
                "active_connections": 0,
            },
        },
    }

    def _now_est(self) -> datetime:
        return datetime.now(timezone(timedelta(hours=-5)))

    def _format_ts(self, dt: datetime) -> str:
        return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    def _format_readable(self, dt: datetime) -> str:
        return dt.strftime("%H:%M EST")

    def inject_fault(self, scenario: str) -> dict:
        """Activate a failure scenario with real timestamps."""
        if scenario not in self.SCENARIOS:
            scenario = "redis-timeout"

        now = self._now_est()
        self.state = "incident_active"
        if scenario not in self.active_scenarios:
            self.active_scenarios.append(scenario)
        self.incident_start = time.time()
        self.fixes_applied = 0
        if len(self.active_scenarios) == 1:
            self.timeline = [
                {"time": self._format_readable(now), "event": "Incident detected — anomalous metrics observed"},
            ]
        else:
            self.timeline.append({"time": self._format_readable(now), "event": f"Additional fault injected: {scenario}"})

        # Calculate combined metrics
        self.metrics = {"latency_ms": 32, "error_rate": 0.001, "cpu_percent": 24, "active_connections": 18, "queue_depth": 0}
        for s in self.active_scenarios:
            sc_override = self.SCENARIOS[s].get("metrics_override", {})
            self.metrics["latency_ms"] = max(self.metrics["latency_ms"], sc_override.get("latency_ms", 32))
            self.metrics["error_rate"] = min(1.0, self.metrics["error_rate"] + sc_override.get("error_rate", 0))
            self.metrics["cpu_percent"] = min(100, self.metrics["cpu_percent"] + sc_override.get("cpu_percent", 0))
            self.metrics["active_connections"] = max(self.metrics["active_connections"], sc_override.get("active_connections", 18))
            self.metrics["queue_depth"] += sc_override.get("queue_depth", 0)

        # Generate logs with real timestamps
        timestamps = {}
        for i in range(6):
            ts = now + timedelta(seconds=i)
            timestamps[f"ts{i}"] = self._format_ts(ts)

        raw_logs = self.SCENARIOS[scenario]["log_template"].format(**timestamps)

        return {
            "scenario": scenario,
            "raw_logs": raw_logs,
            "status": "incident_active",
        }

    def apply_partial_fix(self, applied_count: int, total_count: int) -> dict:
        """
        Apply fixes and adjust state based on how many were applied.
        - All fixes: fully resolved
        - Partial: degraded but improved
        """
        self.fixes_applied = applied_count
        self.total_fixes_available = total_count
        ratio = applied_count / total_count if total_count > 0 else 0
        now = self._now_est()

        if ratio >= 1.0:
            # All fixes applied — fully resolved
            self.state = "healthy"
            self.metrics = {
                "latency_ms": 32,
                "error_rate": 0.001,
                "cpu_percent": 24,
                "active_connections": 18,
                "queue_depth": 0,
            }
            self.timeline.append(
                {"time": self._format_readable(now), "event": f"All {applied_count} fixes applied — incident fully resolved"}
            )
            scenarios = list(self.active_scenarios)
            self.active_scenarios = []
            self.incident_start = None
            return {
                "resolution": "full",
                "new_state": "healthy",
                "message": f"All {applied_count}/{total_count} fixes applied. System fully recovered.",
                "scenario_resolved": ", ".join(scenarios),
            }
        else:
            # Partial fix — system improves but stays degraded
            self.state = "incident_active"  # still active
            
            # Recalculate combined incident metrics
            incident_metrics = {"latency_ms": 32, "error_rate": 0.001, "cpu_percent": 24, "active_connections": 18, "queue_depth": 0}
            for s in self.active_scenarios:
                sc_override = self.SCENARIOS[s].get("metrics_override", {})
                incident_metrics["latency_ms"] = max(incident_metrics["latency_ms"], sc_override.get("latency_ms", 32))
                incident_metrics["error_rate"] = min(1.0, incident_metrics["error_rate"] + sc_override.get("error_rate", 0))
                incident_metrics["cpu_percent"] = min(100, incident_metrics["cpu_percent"] + sc_override.get("cpu_percent", 0))
                incident_metrics["active_connections"] = max(incident_metrics["active_connections"], sc_override.get("active_connections", 18))
                incident_metrics["queue_depth"] += sc_override.get("queue_depth", 0)

            # Proportional recovery
            healthy = {"latency_ms": 32, "error_rate": 0.001, "cpu_percent": 24, "active_connections": 18, "queue_depth": 0}
            for k in self.metrics:
                incident_val = incident_metrics.get(k, self.metrics[k])
                healthy_val = healthy.get(k, 0)
                self.metrics[k] = round(healthy_val + (incident_val - healthy_val) * (1 - ratio), 1)

            self.timeline.append(
                {"time": self._format_readable(now),
                 "event": f"{applied_count}/{total_count} fixes applied — system partially recovered but still degraded"}
            )
            return {
                "resolution": "partial",
                "new_state": "degraded",
                "message": f"Only {applied_count}/{total_count} fixes applied. System improved but still degraded. "
                           f"Latency: {self.metrics['latency_ms']}ms, Error rate: {self.metrics['error_rate']}",
                "remaining_fixes": total_count - applied_count,
            }

    def execute_fix(self) -> dict:
        """Legacy full-reset — only called when ALL fixes are applied."""
        return self.apply_partial_fix(self.total_fixes_available, self.total_fixes_available)

    def add_timeline_event(self, event: str):
        """Add a timestamped event to the incident timeline."""
        now = self._now_est()
        self.timeline.append({"time": self._format_readable(now), "event": event})

    def get_timeline(self) -> list[dict]:
        """Return the full incident timeline with real timestamps."""
        return self.timeline.copy()

    def get_health(self) -> dict:
        return {
            "status": self.state,
            "incident_active": self.state == "incident_active",
            "active_scenarios": self.active_scenarios,
            "metrics": self.metrics.copy(),
        }

    def get_telemetry_data(self) -> list[dict]:
        """Return chart-ready time series with real timestamps."""
        now = self._now_est()
        points = []
        if self.state == "incident_active" and self.active_scenarios:
            peak = max([self.SCENARIOS[s].get("metrics_override", {}).get("latency_ms", 32) for s in self.active_scenarios])
            
            # Generate a realistic incident curve based on how long the incident has been active
            # 0-30s: steep climb
            # 30s-120s: peak plateau with jitter
            # 120s+: gradual decay (simulating partial auto-recovery/throttling)
            
            for i in range(15):
                t = now - timedelta(minutes=14 - i)
                
                if self.incident_start and t.timestamp() >= self.incident_start:
                    elapsed_seconds = t.timestamp() - self.incident_start
                    
                    if elapsed_seconds < 60:
                        # Ramp up phase
                        progress = elapsed_seconds / 60.0
                        v = int(32 + (peak - 32) * (progress ** 2)) # Quadratic ease-in
                    elif elapsed_seconds < 180:
                        # Peak phase with 5% jitter
                        import random
                        jitter = random.uniform(0.95, 1.05)
                        v = int(peak * jitter)
                    else:
                        # Throttling/decay phase (settles at 60% of peak)
                        steady_state = peak * 0.6
                        decay = (elapsed_seconds - 180) / 300.0 # 5 min decay window
                        decay = min(1.0, decay)
                        v = int(peak - ((peak - steady_state) * decay))
                else:
                    # Time before incident was healthy
                    v = [30, 28, 32, 29, 31, 30, 28, 33, 30, 29, 32, 31, 30, 29, 31][i]
                    
                points.append({"time": t.strftime("%H:%M"), "latency": v})
        else:
            for i in range(11):
                t = now - timedelta(minutes=10 - i)
                v = [30, 28, 32, 29, 31, 30, 28, 33, 30, 29, 32][i]
                points.append({"time": t.strftime("%H:%M"), "latency": v})
        return points


# Singleton instance used by all routers
simulator = Simulator()
