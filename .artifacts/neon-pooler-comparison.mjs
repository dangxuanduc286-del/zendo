/**
 * Neon Pooler vs Direct comparison benchmark.
 * Tests the same database with pooler endpoint (port 6543 / -pooler hostname).
 * Run: node --env-file=.env .artifacts/neon-pooler-comparison.mjs
 */

import pg from "pg";
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const url = new URL(DATABASE_URL);

// Derive pooler URL from direct URL
// Neon pooler format: ep-xxx-pooler.region.aws.neon.tech:5432
// Or with explicit port 6543 on same host
function derivePoolerUrl(directUrl) {
  const parsed = new URL(directUrl);
  const host = parsed.hostname;

  // Check if already using pooler
  if (host.includes("-pooler")) {
    return directUrl;
  }

  // Try to construct pooler URL by adding -pooler before the region part
  // Pattern: ep-muddy-fog-am36dykq.c-5.us-east-1.aws.neon.tech
  // Pooler:  ep-muddy-fog-am36dykq-pooler.c-5.us-east-1.aws.neon.tech
  const parts = host.split(".");
  if (parts[0].startsWith("ep-")) {
    parts[0] = parts[0] + "-pooler";
    parsed.hostname = parts.join(".");
    // Neon pooler uses port 5432 by default now (was 6543 previously)
    return parsed.toString();
  }

  return null;
}

const poolerUrl = derivePoolerUrl(DATABASE_URL);

console.log("=== NEON POOLER COMPARISON ===");
console.log(`Direct URL host: ${url.hostname}`);
console.log(`Derived pooler host: ${poolerUrl ? new URL(poolerUrl).hostname : "CANNOT DERIVE"}`);
console.log("");

if (!poolerUrl) {
  console.log("Cannot derive pooler URL. Exiting.");
  process.exit(1);
}

async function benchmarkConnection(label, connectionString, runs = 3) {
  console.log(`--- ${label} ---`);
  const results = [];

  for (let i = 0; i < runs; i++) {
    const pool = new Pool({
      connectionString,
      max: 4,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });

    const t0 = performance.now();
    const client = await pool.connect();
    const t1 = performance.now();
    await client.query("SELECT 1");
    const t2 = performance.now();

    results.push({
      acquisition: t1 - t0,
      query: t2 - t1,
      total: t2 - t0,
    });

    client.release();
    await pool.end();

    // Wait between runs
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("Run | Acquisition | Query | Total");
  console.log("----|-------------|-------|------");
  results.forEach((r, i) => {
    console.log(`  ${i + 1} | ${r.acquisition.toFixed(2)}ms | ${r.query.toFixed(2)}ms | ${r.total.toFixed(2)}ms`);
  });

  const avg = {
    acquisition: results.reduce((s, r) => s + r.acquisition, 0) / results.length,
    query: results.reduce((s, r) => s + r.query, 0) / results.length,
    total: results.reduce((s, r) => s + r.total, 0) / results.length,
  };
  console.log(`AVG | ${avg.acquisition.toFixed(2)}ms | ${avg.query.toFixed(2)}ms | ${avg.total.toFixed(2)}ms`);
  console.log("");

  return avg;
}

async function main() {
  try {
    const directResult = await benchmarkConnection("DIRECT (current)", DATABASE_URL);
    const poolerResult = await benchmarkConnection("POOLER (proposed)", poolerUrl);

    console.log("=== COMPARISON ===");
    console.log(`Direct avg cold start: ${directResult.total.toFixed(2)}ms`);
    console.log(`Pooler avg cold start: ${poolerResult.total.toFixed(2)}ms`);
    console.log(`Difference: ${(directResult.total - poolerResult.total).toFixed(2)}ms`);
    console.log(`Improvement: ${(((directResult.total - poolerResult.total) / directResult.total) * 100).toFixed(1)}%`);
  } catch (err) {
    console.error("Benchmark failed:", err.message);
    if (err.message.includes("pooler")) {
      console.log("\nPooler endpoint may not be enabled. Check Neon dashboard.");
    }
  }
}

main();
