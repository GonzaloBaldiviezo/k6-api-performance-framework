# k6 API Performance Framework

Performance testing framework for HTTP APIs built with k6 and TypeScript.

## TL;DR

**What this project does:**

- Checks if an API stays fast and stable under different traffic levels.
- Measures response time and errors so issues are easy to spot.
- Compares results over time to show if performance improved or got worse.

---

The project currently targets GoREST (`https://gorest.co.in/public/v2`) and provides:

- Smoke tests for fast pipeline validation
- Progressive load profiles (moderate, standard, stress)
- Reusable scenario mix + thresholds
- CI summaries in GitHub Actions
- Baseline comparison to detect regressions over time

## How It Works

1. TypeScript test files are compiled into `dist/`.
2. k6 runs the compiled scripts and exports a JSON summary into `reports/`.
3. CI publishes key metrics in the GitHub job summary.
4. Load workflow compares current metrics against `baselines/moderate.json`.

## Project Structure

```text
.
├── .github/workflows/
│   ├── ci.yml
│   └── load-tests.yml
├── baselines/
│   └── moderate.json
├── scripts/
│   ├── baseline-set.mjs
│   └── baseline-compare.mjs
├── tests/
│   ├── config/
│   │   ├── scenarios.ts
│   │   └── thresholds.ts
│   ├── load/
│   ├── smoke/
│   └── stress/
├── reports/
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js 20+
- pnpm 8+
- k6

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. (Optional) set API base URL:

```bash
export GOREST_BASE_URL="https://gorest.co.in/public/v2"
```

3. Run smoke test:

```bash
pnpm run smoke
```

If you want write scenarios later, set a token too:

```bash
export GOREST_TOKEN="<YOUR_TOKEN>"
```

## NPM Scripts

- `pnpm run build`: compile TypeScript to `dist/`
- `pnpm run smoke`: build + smoke test
- `pnpm run smoke:local`: 1 VU / 1 iteration smoke check
- `pnpm run load:moderate`: moderate profile
- `pnpm run load:moderate:summary`: moderate profile + `reports/moderate-summary.json`
- `pnpm run load:standard`: standard profile
- `pnpm run stress`: stress profile
- `pnpm run baseline:set:moderate`: create/update baseline file from latest moderate summary
- `pnpm run baseline:compare:moderate`: compare latest moderate summary vs baseline

## Baseline Strategy

Baseline is intentionally versioned in git (`baselines/moderate.json`).

- `set` is manual and controlled: run when you intentionally accept a new reference.
- `compare` is automated in CI load workflow: every run shows metric deltas.

### Typical Flow

First baseline (or when resetting):

```bash
pnpm run load:moderate:summary
pnpm run baseline:set:moderate
```

Normal comparison:

```bash
pnpm run load:moderate:summary
pnpm run baseline:compare:moderate
```

If baseline file is missing in CI, the load workflow fails with an explicit error.

## Historical Runs

Moderate runs are persisted as historical data in the `perf-history` branch.

- Source per run: `reports/moderate-summary.json`
- Aggregated history file: `history/moderate-history.json` (in `perf-history`)
- Latest run snapshot: `history/latest-entry.json` (in `perf-history`)

You can also generate/update local history files manually:

```bash
pnpm run history:append:moderate
```

## CI Workflows

- `.github/workflows/ci.yml`
	- Trigger: pull requests, push to `main`/`master`, manual dispatch
	- Runs build + smoke
	- Publishes smoke summary (`iterations`, `p95`, `error rate`)
	- Uploads `reports/smoke-summary.json` and `reports/smoke.log`

- `.github/workflows/load-tests.yml`
	- Trigger: nightly schedule + manual dispatch
	- Runs moderate load with summary export
	- Runs baseline comparison against `baselines/moderate.json`
	- Appends run metrics to historical dataset in `perf-history`
	- Publishes both moderate summary and baseline delta table
	- Uploads summary, console log, comparison output, and history artifacts

## Notes

- Load scenario details and thresholds are documented in `tests/load/README.md`.
- Dynamic user ID caching is used in read scenarios to avoid false failures from stale fixed IDs.