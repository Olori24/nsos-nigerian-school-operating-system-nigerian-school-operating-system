import { performance } from "node:perf_hooks";

const baseUrl = process.env.NSOS_AUDIT_URL ?? "https://nsos-system-uhkdscaf.manus.space";
const totalRequests = 50;
const concurrency = 10;
const input = encodeURIComponent(JSON.stringify({ json: { timestamp: Date.now() } }));
const target = `${baseUrl}/api/trpc/system.health?input=${input}`;

const latencies = [];
let success = 0;
let failures = 0;
let cursor = 0;
const started = performance.now();

async function one() {
  const requestIndex = cursor++;
  if (requestIndex >= totalRequests) return;
  const began = performance.now();
  try {
    const response = await fetch(target, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
    await response.arrayBuffer();
    if (response.ok) success += 1;
    else failures += 1;
  } catch {
    failures += 1;
  } finally {
    latencies.push(performance.now() - began);
  }
  return one();
}

await Promise.all(Array.from({ length: concurrency }, one));
latencies.sort((a, b) => a - b);
const percentile = (fraction) => latencies[Math.min(latencies.length - 1, Math.ceil(latencies.length * fraction) - 1)] ?? 0;
const elapsedMs = performance.now() - started;

console.log(JSON.stringify({
  label: "MEASURED: read-only public health-check workload",
  target: new URL(target).pathname,
  totalRequests,
  concurrency,
  successfulRequests: success,
  failedRequests: failures,
  errorRatePercent: Number(((failures / totalRequests) * 100).toFixed(2)),
  requestsPerSecond: Number((totalRequests / (elapsedMs / 1000)).toFixed(2)),
  latencyMs: { p50: Number(percentile(0.5).toFixed(2)), p95: Number(percentile(0.95).toFixed(2)), p99: Number(percentile(0.99).toFixed(2)) },
}, null, 2));
