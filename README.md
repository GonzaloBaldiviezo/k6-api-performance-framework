# k6-api-performance-framework

Performance testing framework for APIs using k6 and TypeScript.

## Directory Structure

```text
.
├── config/
├── reports/
├── tests/
│   ├── load/
│   ├── smoke/
│   │   └── gorest.smoke.ts
│   └── stress/
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