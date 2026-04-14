#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

function usage() {
  console.error('Usage: node scripts/history-report.mjs <history-json> <output-html>');
}

function safeNumber(value, digits = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a';
  }
  return value.toFixed(digits);
}

function safePct(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'n/a';
  }
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function deltaClass(value, invert = false) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'neutral';
  }

  if (value === 0) {
    return 'neutral';
  }

  if (invert) {
    return value < 0 ? 'good' : 'bad';
  }

  return value > 0 ? 'good' : 'bad';
}

function pickRecent(entries, getter, maxPoints = 20) {
  return entries
    .slice(-maxPoints)
    .map((entry) => getter(entry))
    .filter((v) => typeof v === 'number' && Number.isFinite(v));
}

function buildSparkline(values, color) {
  const width = 640;
  const height = 160;
  const paddingX = 18;
  const paddingY = 12;

  if (values.length === 0) {
    return {
      svg: `<svg viewBox="0 0 ${width} ${height}" class="spark"><text x="12" y="84" fill="#777" font-size="14">No data</text></svg>`,
      min: null,
      max: null,
      count: 0
    };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;

  const gridLines = [0.25, 0.5, 0.75]
    .map((ratio) => {
      const y = paddingY + plotHeight * ratio;
      return `<line x1="${paddingX}" y1="${y.toFixed(2)}" x2="${width - paddingX}" y2="${y.toFixed(2)}" stroke="#e6ebf2" stroke-width="1" />`;
    })
    .join('');

  if (values.length === 1) {
    const y = paddingY + plotHeight / 2;
    return {
      svg: `<svg viewBox="0 0 ${width} ${height}" class="spark" aria-hidden="true">${gridLines}<line x1="${paddingX}" y1="${y.toFixed(2)}" x2="${width - paddingX}" y2="${y.toFixed(2)}" stroke="#d0d7de" stroke-width="1.5" /><circle cx="${(width / 2).toFixed(2)}" cy="${y.toFixed(2)}" r="4.5" fill="${color}" /></svg>`,
      min,
      max,
      count: 1
    };
  }

  const step = plotWidth / (values.length - 1);

  const points = values
    .map((v, i) => {
      const x = paddingX + i * step;
      const y = height - paddingY - ((v - min) / range) * plotHeight;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return {
    svg: `<svg viewBox="0 0 ${width} ${height}" class="spark" aria-hidden="true">${gridLines}<polyline fill="none" stroke="${color}" stroke-width="2.5" points="${points}" /></svg>`,
    min,
    max,
    count: values.length
  };
}

function esc(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

const historyPath = process.argv[2];
const outputPath = process.argv[3];

if (!historyPath || !outputPath) {
  usage();
  process.exit(1);
}

if (!fs.existsSync(historyPath)) {
  console.error(`History file not found: ${historyPath}`);
  process.exit(1);
}

const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
const entries = Array.isArray(history.entries) ? history.entries : [];

const latest = entries.length > 0 ? entries[entries.length - 1] : null;
const recent = entries.slice(-20).reverse();

const p95Trend = buildSparkline(pickRecent(entries, (e) => e.metrics?.http_req_duration_p95), '#1f6feb');
const throughputTrend = buildSparkline(pickRecent(entries, (e) => e.metrics?.http_reqs_rate), '#2da44e');
const errorTrend = buildSparkline(pickRecent(entries, (e) => e.metrics?.http_req_failed_rate), '#cf222e');

function chartMeta(labelMin, labelMax, trend, unit = '') {
  const minTxt = trend.min === null ? 'n/a' : `${safeNumber(trend.min)}${unit}`;
  const maxTxt = trend.max === null ? 'n/a' : `${safeNumber(trend.max)}${unit}`;
  return `<div class="chart-meta"><span>${labelMin}: ${minTxt}</span><span>${labelMax}: ${maxTxt}</span></div>`;
}

const latestCards = latest
  ? `
    <div class="cards">
      <div class="card"><div class="label">p90</div><div class="value">${safeNumber(latest.metrics?.http_req_duration_p90)} ms</div></div>
      <div class="card"><div class="label">p95</div><div class="value">${safeNumber(latest.metrics?.http_req_duration_p95)} ms</div></div>
      <div class="card"><div class="label">error rate</div><div class="value">${safeNumber(latest.metrics?.http_req_failed_rate, 4)}</div></div>
      <div class="card"><div class="label">throughput</div><div class="value">${safeNumber(latest.metrics?.http_reqs_rate)} req/s</div></div>
    </div>
  `
  : '<p>No entries yet.</p>';

const rows = recent
  .map((entry, index) => {
    const when = esc(entry.timestamp || 'n/a');
    const run = esc(entry.ci?.runNumber || 'local');
    const ref = esc(entry.ci?.ref || 'local');
    const p90 = safeNumber(entry.metrics?.http_req_duration_p90);
    const p95 = safeNumber(entry.metrics?.http_req_duration_p95);
    const err = safeNumber(entry.metrics?.http_req_failed_rate, 4);
    const rps = safeNumber(entry.metrics?.http_reqs_rate);
    const d95Raw = entry.deltaPct?.http_req_duration_p95;
    const drpsRaw = entry.deltaPct?.http_reqs_rate;
    const d95 = safePct(d95Raw);
    const drps = safePct(drpsRaw);
    const d95Class = deltaClass(d95Raw, true);
    const drpsClass = deltaClass(drpsRaw, false);
    const rank = entries.length - index;

    return `<tr>
      <td>${rank}</td>
      <td>${when}</td>
      <td>${run}</td>
      <td>${ref}</td>
      <td>${p90}</td>
      <td>${p95}</td>
      <td>${err}</td>
      <td>${rps}</td>
      <td class="${d95Class}">${d95}</td>
      <td class="${drpsClass}">${drps}</td>
    </tr>`;
  })
  .join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Moderate Load History Report</title>
  <style>
    :root {
      --bg: #f3f6fb;
      --panel: #ffffff;
      --text: #17212f;
      --muted: #5b6472;
      --line: #d8dee8;
      --good: #1a7f37;
      --bad: #cf222e;
      --neutral: #6e7781;
      --accent: #1f6feb;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif;
      margin: 0;
      color: var(--text);
      background: radial-gradient(circle at top right, #e8f0ff, var(--bg));
    }
    .container { max-width: 1100px; margin: 0 auto; padding: 24px; }
    .hero {
      background: linear-gradient(135deg, #0f2747, #1f6feb);
      color: #fff;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(15, 39, 71, 0.18);
    }
    h1 { margin: 0 0 8px 0; font-size: 28px; }
    .meta { color: #deebff; }
    .panel {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px;
      background: var(--panel);
      box-shadow: 0 4px 10px rgba(15, 23, 42, 0.05);
    }
    .cards { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); margin: 16px 0 14px; }
    .card { border: 1px solid var(--line); border-radius: 10px; padding: 12px; background: #f8fbff; }
    .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
    .value { font-size: 24px; font-weight: 700; margin-top: 6px; }
    .charts { display: grid; gap: 14px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-bottom: 16px; }
    .chart-card { border: 1px solid var(--line); border-radius: 10px; padding: 10px; background: #fcfdff; }
    .chart-wide { grid-column: 1 / -1; }
    .chart-title { font-weight: 600; margin: 0 0 6px; }
    .chart-meta { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; margin-bottom: 6px; }
    .chart-axis { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; margin-top: 4px; }
    .spark { width: 100%; height: 180px; background: #fcfdff; border: 1px solid var(--line); border-radius: 8px; }
    h2 { margin: 20px 0 12px 0; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; background: var(--panel); border: 1px solid var(--line); }
    th, td { border-bottom: 1px solid #eef2f7; padding: 8px; text-align: left; }
    th { background: #f8fbff; position: sticky; top: 0; }
    .good { color: var(--good); font-weight: 600; }
    .bad { color: var(--bad); font-weight: 600; }
    .neutral { color: var(--neutral); }
    .muted { color: var(--muted); font-size: 13px; margin: 0; }
    .table-wrap { overflow-x: auto; border-radius: 12px; }
    @media (max-width: 600px) {
      .container { padding: 14px; }
      .hero { padding: 16px; }
      h1 { font-size: 22px; }
      .value { font-size: 20px; }
      .charts { grid-template-columns: 1fr; }
      .chart-wide { grid-column: auto; }
      table { font-size: 12px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <section class="hero">
      <h1>Moderate Load History</h1>
      <div class="meta">Entries: ${entries.length} | Updated: ${esc(history.updatedAt || 'n/a')}</div>
    </section>

    <section class="panel" style="margin-top: 14px;">
      ${latestCards}
      <div class="charts">
        <div class="chart-card chart-wide">
          <p class="chart-title">p95 trend</p>
          ${chartMeta('min', 'max', p95Trend, ' ms')}
          ${p95Trend.svg}
          <div class="chart-axis"><span>oldest run</span><span>latest run</span></div>
        </div>
        <div class="chart-card">
          <p class="chart-title">throughput trend</p>
          ${chartMeta('min', 'max', throughputTrend, ' req/s')}
          ${throughputTrend.svg}
          <div class="chart-axis"><span>oldest run</span><span>latest run</span></div>
        </div>
        <div class="chart-card">
          <p class="chart-title">error rate trend</p>
          ${chartMeta('min', 'max', errorTrend)}
          ${errorTrend.svg}
          <div class="chart-axis"><span>oldest run</span><span>latest run</span></div>
        </div>
      </div>
      <p class="muted">Color code: green means better, red means worse. For latency deltas, negative is better.</p>
    </section>

    <h2>Recent runs (latest 20)</h2>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Timestamp</th>
            <th>Run</th>
            <th>Ref</th>
            <th>p90 (ms)</th>
            <th>p95 (ms)</th>
            <th>error rate</th>
            <th>req/s</th>
            <th>delta p95</th>
            <th>delta req/s</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="10">No history entries.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);

console.log(`History report generated at ${outputPath}`);
