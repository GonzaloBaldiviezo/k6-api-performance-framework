#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.error('Usage: node scripts/history-append.mjs <summary-json> <baseline-json> <history-json> [entry-json]');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function asNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
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

const summaryPath = process.argv[2];
const baselinePath = process.argv[3];
const historyPath = process.argv[4];
const entryPath = process.argv[5];

if (!summaryPath || !baselinePath || !historyPath) {
  usage();
  process.exit(1);
}

if (!fs.existsSync(summaryPath)) {
  console.error(`Summary file not found: ${summaryPath}`);
  process.exit(1);
}

if (!fs.existsSync(baselinePath)) {
  console.error(`Baseline file not found: ${baselinePath}`);
  process.exit(1);
}

const summary = readJson(summaryPath);
const baseline = readJson(baselinePath);
const metrics = summary.metrics || {};
const baselineMetrics = baseline.metrics || {};

const current = {
  http_req_duration_p90: asNumber(metrics.http_req_duration?.['p(90)']),
  http_req_duration_p95: asNumber(metrics.http_req_duration?.['p(95)']),
  http_req_failed_rate: asNumber(metrics.http_req_failed?.value),
  http_reqs_rate: asNumber(metrics.http_reqs?.rate),
  checks_rate: asNumber(metrics.checks?.value),
  iterations_count: asNumber(metrics.iterations?.count)
};

const entry = {
  timestamp: new Date().toISOString(),
  profile: process.env.K6_PROFILE || 'moderate',
  sourceSummary: summaryPath,
  ci: {
    runId: process.env.GITHUB_RUN_ID || null,
    runNumber: process.env.GITHUB_RUN_NUMBER || null,
    workflow: process.env.GITHUB_WORKFLOW || null,
    ref: process.env.GITHUB_REF_NAME || process.env.GITHUB_REF || null,
    sha: process.env.GITHUB_SHA || null,
    actor: process.env.GITHUB_ACTOR || null,
    repository: process.env.GITHUB_REPOSITORY || null
  },
  metrics: current,
  baseline: {
    source: baseline.sourceSummary || null,
    metrics: baselineMetrics
  },
  deltaPct: {
    http_req_duration_p90: deltaPct(current.http_req_duration_p90, baselineMetrics.http_req_duration_p90 ?? baselineMetrics.http_req_duration_p99),
    http_req_duration_p95: deltaPct(current.http_req_duration_p95, baselineMetrics.http_req_duration_p95),
    http_req_failed_rate: deltaPct(current.http_req_failed_rate, baselineMetrics.http_req_failed_rate),
    http_reqs_rate: deltaPct(current.http_reqs_rate, baselineMetrics.http_reqs_rate),
    checks_rate: deltaPct(current.checks_rate, baselineMetrics.checks_rate),
    iterations_count: deltaPct(current.iterations_count, baselineMetrics.iterations_count)
  }
};

let history = { version: 1, updatedAt: null, entries: [] };
if (fs.existsSync(historyPath)) {
  const existing = readJson(historyPath);
  if (existing && Array.isArray(existing.entries)) {
    history = {
      version: typeof existing.version === 'number' ? existing.version : 1,
      updatedAt: existing.updatedAt || null,
      entries: existing.entries
    };
  }
}

history.entries.push(entry);
history.updatedAt = entry.timestamp;

// Keep last 500 entries to avoid unbounded growth.
if (history.entries.length > 500) {
  history.entries = history.entries.slice(-500);
}

fs.mkdirSync(path.dirname(historyPath), { recursive: true });
fs.writeFileSync(historyPath, JSON.stringify(history, null, 2) + '\n');

if (entryPath) {
  fs.mkdirSync(path.dirname(entryPath), { recursive: true });
  fs.writeFileSync(entryPath, JSON.stringify(entry, null, 2) + '\n');
}

console.log(`History updated at ${historyPath}`);
if (entryPath) {
  console.log(`Entry written at ${entryPath}`);
}
