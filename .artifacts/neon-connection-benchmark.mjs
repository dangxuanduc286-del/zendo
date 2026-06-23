/**
 * Neon Connection Benchmark
 * Measures cold start, connection acquisition, and query execution times.
 * Run: node --env-file=.env .artifacts/neon-connection-benchmark.mjs
 */

import pg from "pg";
const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

// Parse connection string to check pooler vs direct
const url = new URL(DATABASE_URL);
console.log("=== CONNECTION STRING ANALYSIS ===");
console.log(`Host: ${url.hostname}`);
console.log(`Port: ${url.port || "5432 (default)"}`);
console.log(`Database: ${url.pathname.slice(1)}`);
console.log(`SSL mode: ${url.searchParams.get("sslmode") || "not specified"}`);
console.log(`Pooler detected: ${url.hostname.includes("-pooler") || url.port === "6543"}`);
console.log(`Direct detected: ${!url.hostname.includes("-pooler") && url.port !== "6543"}`);
console.log("");

// Cold connection test (new Pool, first connect)
async function benchmarkColdStart() {
  console.log("=== COLD START BENCHMARK (new Pool + first query) ===");
  const t0 = performance.now();

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

  const t1 = performance.now();
  console.log(`Pool creation: ${(t1 - t0).toFixed(2)}ms`);

  const t2 = performance.now();
  const client = await pool.connect();
  const t3 = performance.now();
  console.log(`Connection acquisition (cold): ${(t3 - t2).toFixed(2)}ms`);

  const t4 = performance.now();
  await client.query("SELECT 1 AS ping");
  const t5 = performance.now();
  console.log(`First query (SELECT 1): ${(t5 - t4).toFixed(2)}ms`);

  console.log(`Total cold start: ${(t5 - t0).toFixed(2)}ms`);
  console.log("");

  client.release();
  await pool.end();
  return { poolCreation: t1 - t0, acquisition: t3 - t2, firstQuery: t5 - t4, total: t5 - t0 };
}

// Warm connection test (reusing existing pool)
async function benchmarkWarmRequest() {
  console.log("=== WARM REQUEST BENCHMARK (existing pool) ===");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 4,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

  // Warm up the pool
  const warmClient = await pool.connect();
  await warmClient.query("SELECT 1");
  warmClient.release();

  // Now measure warm request
  const results = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const client = await pool.connect();
    const t1 = performance.now();
    await client.query("SELECT 1 AS ping");
    const t2 = performance.now();
    client.release();

    results.push({
      acquisition: t1 - t0,
      query: t2 - t1,
      total: t2 - t0,
    });
  }

  console.log("Run | Acquisition | Query | Total");
  console.log("----|-------------|-------|------");
  results.forEach((r, i) => {
    console.log(`  ${i + 1} | ${r.acquisition.toFixed(2)}ms | ${r.query.toFixed(2)}ms | ${r.total.toFixed(2)}ms`);
  });

  const avgAcq = results.reduce((s, r) => s + r.acquisition, 0) / results.length;
  const avgQuery = results.reduce((s, r) => s + r.query, 0) / results.length;
  const avgTotal = results.reduce((s, r) => s + r.total, 0) / results.length;
  console.log(`AVG | ${avgAcq.toFixed(2)}ms | ${avgQuery.toFixed(2)}ms | ${avgTotal.toFixed(2)}ms`);
  console.log("");

  await pool.end();
  return { avgAcquisition: avgAcq, avgQuery: avgQuery, avgTotal: avgTotal };
}

// Realistic query test (something like storefront would do)
async function benchmarkRealisticQuery() {
  console.log("=== REALISTIC QUERY BENCHMARK ===");

  const pool = new Pool({
    connectionString: DATABASE_URL,
    max: 12,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

  // Warm up
  const warmClient = await pool.connect();
  await warmClient.query("SELECT 1");
  warmClient.release();

  // Simulate storefront: multiple queries in sequence
  const t0 = performance.now();
  const client = await pool.connect();
  const t1 = performance.now();

  // Query 1: Settings-like
  await client.query("SELECT COUNT(*) FROM \"Setting\"");
  const t2 = performance.now();

  // Query 2: Categories-like
  await client.query("SELECT COUNT(*) FROM \"Category\"");
  const t3 = performance.now();

  // Query 3: Products-like
  await client.query("SELECT COUNT(*) FROM \"Product\"");
  const t4 = performance.now();

  client.release();

  console.log(`Connection acquisition: ${(t1 - t0).toFixed(2)}ms`);
  console.log(`Query 1 (Settings count): ${(t2 - t1).toFixed(2)}ms`);
  console.log(`Query 2 (Categories count): ${(t3 - t2).toFixed(2)}ms`);
  console.log(`Query 3 (Products count): ${(t4 - t3).toFixed(2)}ms`);
  console.log(`Total (warm, 3 queries): ${(t4 - t0).toFixed(2)}ms`);
  console.log("");

  await pool.end();
}

// Sequential cold starts (simulates Vercel serverless cold boots)
async function benchmarkSequentialColdStarts() {
  console.log("=== SEQUENTIAL COLD STARTS (simulates serverless) ===");

  const results = [];
  for (let i = 0; i < 3; i++) {
    const pool = new Pool({
      connectionString: DATABASE_URL,
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

    // Wait a bit to let Neon potentially cool down
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("Run | Acquisition | Query | Total");
  console.log("----|-------------|-------|------");
  results.forEach((r, i) => {
    console.log(`  ${i + 1} | ${r.acquisition.toFixed(2)}ms | ${r.query.toFixed(2)}ms | ${r.total.toFixed(2)}ms`);
  });
  console.log("");
}

// Pool configuration analysis
function analyzePoolConfig() {
  console.log("=== POOL CONFIGURATION ANALYSIS ===");
  console.log(`PG_POOL_MAX env: ${process.env.PG_POOL_MAX || "not set (default 12)"}`);
  console.log(`Effective max: ${Math.max(4, Number(process.env.PG_POOL_MAX) || 12)}`);
  console.log(`Idle timeout: 30000ms`);
  console.log(`Connection timeout: 15000ms`);
  console.log("");

  // Check if using Neon pooler
  const host = url.hostname;
  if (host.includes("-pooler")) {
    console.log("✅ Using Neon Connection Pooler (PgBouncer)");
    console.log("   - Server-side pooling active");
    console.log("   - Reduced cold start impact");
  } else if (host.includes(".neon.tech")) {
    console.log("⚠️  Using Neon DIRECT connection (no pooler)");
    console.log("   - Each new connection = full Neon compute wakeup");
    console.log("   - Cold starts will be 500-2000ms higher");
    console.log("   - RECOMMENDATION: Switch to pooler endpoint");
  } else {
    console.log("ℹ️  Non-Neon host detected (possibly local/other provider)");
  }
  console.log("");
}

// Main
async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  ZENDO.VN - NEON CONNECTION BENCHMARK               ║");
  console.log("║  Date: " + new Date().toISOString() + "    ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("");

  analyzePoolConfig();

  try {
    const coldResult = await benchmarkColdStart();
    const warmResult = await benchmarkWarmRequest();
    await benchmarkRealisticQuery();
    await benchmarkSequentialColdStarts();

    console.log("=== SUMMARY ===");
    console.log(`Cold start total: ${coldResult.total.toFixed(2)}ms`);
    console.log(`  - Pool creation: ${coldResult.poolCreation.toFixed(2)}ms`);
    console.log(`  - Connection acquisition: ${coldResult.acquisition.toFixed(2)}ms`);
    console.log(`  - First query: ${coldResult.firstQuery.toFixed(2)}ms`);
    console.log("");
    console.log(`Warm request avg: ${warmResult.avgTotal.toFixed(2)}ms`);
    console.log(`  - Acquisition: ${warmResult.avgAcquisition.toFixed(2)}ms`);
    console.log(`  - Query: ${warmResult.avgQuery.toFixed(2)}ms`);
    console.log("");

    const overhead = coldResult.total - warmResult.avgTotal;
    console.log(`Cold start overhead: ${overhead.toFixed(2)}ms`);
    console.log("");

    if (overhead > 500) {
      console.log("🔴 SIGNIFICANT cold start overhead detected (>500ms)");
      console.log("   Likely causes:");
      if (!url.hostname.includes("-pooler")) {
        console.log("   1. Direct connection to Neon (no pooler)");
        console.log("   2. Neon compute needs to wake up on each new connection");
      }
      console.log("   3. TLS handshake to remote server");
      console.log("   4. DNS resolution");
    } else if (overhead > 200) {
      console.log("🟡 Moderate cold start overhead (200-500ms)");
    } else {
      console.log("🟢 Cold start overhead is acceptable (<200ms)");
    }
  } catch (err) {
    console.error("Benchmark failed:", err.message);
    console.error(err.stack);
  }
}

main();
