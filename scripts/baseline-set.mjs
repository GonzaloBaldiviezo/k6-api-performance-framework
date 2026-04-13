#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.error('Usage: node scripts/baseline-set.mjs <summary-json> <baseline-json>');
}

const summaryPath = process.argv[2];
const baselinePath = process.argv[3];

if (!summaryPath || !baselinePath) {
  usage();
  process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
  console.error(`Summary file not found: ${summaryPath}`);
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
const metrics = summary.metrics || {};

const baseline = {
  createdAt: new Date().toISOString(),
  sourceSummary: summaryPath,
  metrics: {
    http_req_duration_p95: metrics.http_req_duration?.['p(95)'] ?? null,
    http_req_duration_p90: metrics.http_req_duration?.['p(90)'] ?? null,
    http_req_failed_rate: metrics.http_req_failed?.value ?? null,
    http_reqs_rate: metrics.http_reqs?.rate ?? null,
    checks_rate: metrics.checks?.value ?? null,
    iterations_count: metrics.iterations?.count ?? null
  }
};

fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + '\n');

console.log(`Baseline written to ${baselinePath}`);
