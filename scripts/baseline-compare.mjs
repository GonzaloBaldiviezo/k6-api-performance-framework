#!/usr/bin/env node

import fs from 'node:fs';

function usage() {
  console.error('Usage: node scripts/baseline-compare.mjs <baseline-json> <summary-json>');
}

function formatNumber(value, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a';
  }
  return value.toFixed(digits);
}

function deltaPct(current, baseline) {
  if (typeof current !== 'number' || typeof baseline !== 'number') {
    return null;
  }
  if (baseline === 0 && current === 0) {
    return 0;
  }
  if (baseline === 0) {
    return null;
  }
  return ((current - baseline) / baseline) * 100;
}

const baselinePath = process.argv[2];
const summaryPath = process.argv[3];

if (!baselinePath || !summaryPath) {
  usage();
  process.exit(1);
}

if (!fs.existsSync(baselinePath)) {
  console.error(`Baseline file not found: ${baselinePath}`);
  process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
  console.error(`Summary file not found: ${summaryPath}`);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));

const b = baseline.metrics || {};
const m = summary.metrics || {};

const current = {
  http_req_duration_p95: m.http_req_duration?.['p(95)'] ?? null,
  http_req_duration_p90: m.http_req_duration?.['p(90)'] ?? null,
  http_req_failed_rate: m.http_req_failed?.value ?? null,
  http_reqs_rate: m.http_reqs?.rate ?? null,
  checks_rate: m.checks?.value ?? null,
  iterations_count: m.iterations?.count ?? null
};

const rows = [
  ['http_req_duration p90 (ms)', b.http_req_duration_p90 ?? b.http_req_duration_p99, current.http_req_duration_p90],
  ['http_req_duration p95 (ms)', b.http_req_duration_p95, current.http_req_duration_p95],
  ['http_req_failed rate', b.http_req_failed_rate, current.http_req_failed_rate],
  ['http_reqs rate (req/s)', b.http_reqs_rate, current.http_reqs_rate],
  ['checks rate', b.checks_rate, current.checks_rate],
  ['iterations count', b.iterations_count, current.iterations_count]
];

console.log('Baseline comparison');
console.log(`Baseline: ${baselinePath}`);
console.log(`Current:  ${summaryPath}`);
console.log('');
console.log('| Metric | Baseline | Current | Delta |');
console.log('| --- | ---: | ---: | ---: |');

for (const [name, baselineValue, currentValue] of rows) {
  const delta = deltaPct(currentValue, baselineValue);
  const baselineFmt = formatNumber(baselineValue);
  const currentFmt = formatNumber(currentValue);
  const deltaFmt = delta === null ? 'n/a' : `${delta >= 0 ? '+' : ''}${formatNumber(delta)}%`;
  console.log(`| ${name} | ${baselineFmt} | ${currentFmt} | ${deltaFmt} |`);
}
