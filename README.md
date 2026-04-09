# k6-api-performance-framework

Performance testing framework for APIs using k6 and TypeScript.

## Directory Structure

```text
.
├── tests/
│   ├── config/
│   ├── load/
│   ├── smoke/
│   │   └── gorest.smoke.ts
│   └── stress/
├── reports/
├── package.json
└── tsconfig.json
```

## Prerequisites

- Node.js 20+
- pnpm
- k6

## Installation

```bash
pnpm install
```

## Running Tests

### Smoke Test (GoREST)

Set environment variables:

```bash
export GOREST_BASE_URL="https://gorest.co.in/public/v2"
export GOREST_TOKEN="<YOUR_TOKEN>"
```

Run:

```bash
pnpm run smoke
```

For local validation without environment variables:

```bash
pnpm run smoke:local
```

## Available Scripts

- `pnpm run build`: Transpiles TypeScript to `dist/`
- `pnpm run smoke`: Build and run smoke test against GoREST
- `pnpm run smoke:local`: Minimal setup validation
- `pnpm run load:moderate`: Run the moderate load profile
- `pnpm run load:standard`: Run the standard load profile
- `pnpm run stress`: Run the stress profile

## CI/CD

- `.github/workflows/ci.yml`: runs on pull requests, pushes to `main`/`master`, and manual dispatch. It installs dependencies, builds the project, runs the smoke test, and uploads smoke artifacts.
- `.github/workflows/load-tests.yml`: runs nightly and on manual dispatch. It executes the moderate load profile and uploads the resulting summary and log as artifacts.

Artifacts include the k6 summary JSON and the console log for each run.