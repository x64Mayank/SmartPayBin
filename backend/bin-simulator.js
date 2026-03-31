/**
 * Bin Simulator — simulates a Raspberry Pi bin for testing.
 *
 * Usage:
 *   node bin-simulator.js
 *
 * Environment variables (or set in .env):
 *   BIN_ID       — The bin's MongoDB _id
 *   BIN_API_KEY  — The raw API key returned during bin registration
 *   SERVER_URL   — Backend server URL (default: http://localhost:8000)
 */

import "dotenv/config";
import readline from "readline";

const BIN_ID = process.env.BIN_ID;
const BIN_API_KEY = process.env.BIN_API_KEY;
const SERVER_URL = process.env.SERVER_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 3000;

if (!BIN_ID || !BIN_API_KEY) {
  console.error("❌ BIN_ID and BIN_API_KEY must be set in .env or environment");
  process.exit(1);
}

const binHeaders = {
  "Content-Type": "application/json",
  "x-bin-id": BIN_ID,
  "x-bin-api-key": BIN_API_KEY,
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: binHeaders,
    ...options,
  });
  return res.json();
}

async function pollForSessions() {
  console.log(`\n🔄 Polling for pending sessions... (every ${POLL_INTERVAL_MS / 1000}s)`);
  console.log(`   Bin ID: ${BIN_ID}`);
  console.log(`   Server: ${SERVER_URL}\n`);

  while (true) {
    try {
      const data = await fetchJSON(`${SERVER_URL}/api/bin/pending-sessions`);

      if (data.data?.sessions?.length > 0) {
        const session = data.data.sessions[0]; // take the first one
        console.log(`\n✅ Session found!`);
        console.log(`   Session ID: ${session._id}`);
        console.log(`   User: ${session.userId?.fullName || session.userId}`);

        await handleSession(session);
      } else {
        process.stdout.write(".");
      }
    } catch (error) {
      console.error(`\n❌ Poll error: ${error.message}`);
    }

    await sleep(POLL_INTERVAL_MS);
  }
}

async function handleSession(session) {
  // Step 1: Acknowledge the session
  console.log("\n📡 Acknowledging session...");
  const ackResult = await fetchJSON(`${SERVER_URL}/api/bin/ack-session`, {
    method: "POST",
    body: JSON.stringify({ sessionId: session._id }),
  });

  if (!ackResult.success) {
    console.error(`❌ Acknowledge failed: ${ackResult.message}`);
    return;
  }
  console.log(`✅ Session active! Expires at: ${ackResult.data?.expiresAt}`);

  // Step 2: Simulate waste detection (manual input)
  console.log("\n🗑️  Simulating waste detection...");
  console.log("   Available waste types: recyclable, plastic, biodegradable, mixed\n");

  const wasteType = await ask("   Enter waste type: ");
  const weightStr = await ask("   Enter weight (kg): ");
  const weightKg = parseFloat(weightStr);

  if (isNaN(weightKg) || weightKg <= 0) {
    console.error("❌ Invalid weight. Aborting.");
    return;
  }

  // Step 3: Complete the session
  console.log("\n📤 Submitting deposit data...");
  const completeResult = await fetchJSON(
    `${SERVER_URL}/api/bin/complete-session`,
    {
      method: "POST",
      body: JSON.stringify({
        sessionId: session._id,
        wasteType,
        weightKg,
      }),
    }
  );

  if (completeResult.success) {
    console.log(`\n🎉 Deposit complete!`);
    console.log(`   Waste type: ${completeResult.data?.wasteType}`);
    console.log(`   Weight: ${completeResult.data?.weightKg} kg`);
    console.log(`   Rewards earned: ${completeResult.data?.rewardPoints} points`);
    console.log(`   Bin fill: ${completeResult.data?.fillPercentage}%`);
  } else {
    console.error(`❌ Complete failed: ${completeResult.message}`);
  }

  console.log("\n─────────────────────────────────────────");
  console.log("Returning to polling...\n");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start
pollForSessions();
