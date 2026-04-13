# Load and Stress Tests

This directory contains progressive load testing scenarios against the GoREST API.

## Test Profiles

### Moderate Load (`gorest.moderate.load.ts`)

**Profile:** Conservative user simulation.

- **VUs:** 10 users (ramp 0→10 in 1m, hold 2m, ramp down 30s)
- **Scenarios:** Read-only operations (GETs only)
  - List Users (40% weight)
  - List Posts (30% weight)
  - Get User Details (20% weight)
  - Get User Posts (10% weight)
- **Thresholds:**
  - Error rate < 5%
  - p95 latency < 2000ms
  - p99 latency < 3000ms
  - p95 waiting time < 1500ms

**Use case:** Validate baseline performance under normal load.

```bash
pnpm run load:moderate
```

### Standard Load (`gorest.standard.load.ts`)

**Profile:** Realistic sustained load.

- **VUs:** 30 users (ramp 0→30 in 2m, hold 3m, ramp down 1m)
- **Scenarios:** Same as moderate
- **Thresholds:**
  - Error rate < 10%
  - p95 latency < 2500ms
  - p99 latency < 4000ms
  - p95 waiting time < 1800ms
  - Check pass rate > 95%

**Use case:** Simulate typical traffic patterns and system capacity.

```bash
pnpm run load:standard
```

### Stress Test (`gorest.stress.ts`)

**Profile:** Aggressive sustained load to find breaking point.

- **VUs:** 100 users constant
- **Duration:** 5 minutes
- **Scenarios:** Same read-only mix
- **Thresholds (relaxed):**
  - Error rate < 20%
  - p95 latency < 3500ms
  - p99 latency < 5000ms

**Use case:** Identify system limits and rate limiting behavior.

```bash
pnpm run stress
```

## Scenario Weights

Scenarios are executed with weighted randomization to simulate realistic user patterns:

| Scenario | Weight | % of Mix |
|----------|--------|----------|
| List Users | 40 | 40% |
| List Posts | 30 | 30% |
| Get User Details | 20 | 20% |
| Get User Posts | 10 | 10% |

## Environment Variables

All tests respect:

```bash
export GOREST_BASE_URL="https://gorest.co.in/public/v2"
export GOREST_TOKEN="<optional_for_future_writes>"
```

If TOKEN is set, mutation scenarios (POST/PATCH) can be enabled by adjusting weights in `tests/config/scenarios.ts`.

## Interpreting Results

### Key Metrics

- **http_req_failed**: Percentage of failed requests (4xx, 5xx)
- **http_req_duration**: Total request time (DNS + TCP + TLS + request + response + waiting)
- **http_req_waiting**: Server processing time (p50/p95/p99 are most useful)
- **checks**: Custom validation pass rate

### Exit Codes

- `0`: All thresholds passed
- `99`: One or more thresholds failed
- `1`: Script error or k6 system failure

## Iteration Tips

1. **Start with smoke** to ensure basic connectivity
2. **Run moderate** to understand baseline latencies
3. **Run standard** to validate under expected load
4. **Run stress** to identify breaking point

Between runs, check `reports/` directory for exported results (if JSON exporting is enabled).

## Baseline Comparison

Use baseline comparison to evaluate whether a new run regresses or improves against a saved reference.

1. Generate a summary file from moderate load:

```bash
pnpm run load:moderate:summary
```

2. Save it as baseline (first time, or when resetting baseline):

```bash
pnpm run baseline:set:moderate
```

3. For the next run, compare current summary vs baseline:

```bash
pnpm run load:moderate:summary
pnpm run baseline:compare:moderate
```

The comparison prints metric deltas for p90/p95 latency, error rate, throughput, checks, and iterations.
