import { DepositSession } from "../models/depositSession.model.js";
import { Bin } from "../models/bin.model.js";

const CLEANUP_INTERVAL_MS = 60 * 1000; // Run every 60 seconds

/**
 * Finds expired pending/active sessions and marks them as expired.
 * Also unlocks any bins that were locked by those sessions.
 */
async function cleanupExpiredSessions() {
  try {
    const now = new Date();

    // Find all expired sessions that are still pending or active
    const expiredSessions = await DepositSession.find({
      status: { $in: ["pending", "active"] },
      expiresAt: { $lt: now },
    });

    if (expiredSessions.length === 0) return;

    // Collect bin IDs that need to be unlocked (only from active sessions)
    const binIdsToUnlock = expiredSessions
      .filter((s) => s.status === "active")
      .map((s) => s.binId);

    // Mark all as expired
    await DepositSession.updateMany(
      {
        _id: { $in: expiredSessions.map((s) => s._id) },
      },
      { $set: { status: "expired" } }
    );

    // Unlock the bins
    if (binIdsToUnlock.length > 0) {
      await Bin.updateMany(
        { _id: { $in: binIdsToUnlock } },
        { $set: { hasActiveSession: false } }
      );
    }

    console.log(
      `[Session Cleanup] Expired ${expiredSessions.length} session(s), unlocked ${binIdsToUnlock.length} bin(s)`
    );
  } catch (error) {
    console.error("[Session Cleanup] Error:", error.message);
  }
}

/**
 * Starts the periodic session cleanup interval.
 * Call this once after DB connection is established.
 */
export function startSessionCleanup() {
  console.log(
    `[Session Cleanup] Started — running every ${CLEANUP_INTERVAL_MS / 1000}s`
  );
  setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);

  // Also run once immediately on startup
  cleanupExpiredSessions();
}
