import crypto from "crypto";
import bcrypt from "bcrypt";
import { Bin } from "../models/bin.model.js";
import { Deposit } from "../models/deposit.model.js";
import { DepositSession } from "../models/depositSession.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

// Session timeout for active sessions (in milliseconds)
const ACTIVE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes max for a deposit

// Reward rates per kg by waste type
const REWARD_RATES = {
  recyclable: 10,
  plastic: 8,
  biodegradable: 5,
  mixed: 0,
};

// ─── Bin-facing endpoints (authenticated via x-bin-api-key) ───

// Bin polls for pending sessions assigned to it
const getPendingSessions = asyncHandler(async (req, res) => {
  const binId = req.bin._id;

  const sessions = await DepositSession.find({
    binId,
    status: "pending",
    expiresAt: { $gt: new Date() }, // only non-expired
  })
    .populate("userId", "fullName username")
    .sort({ createdAt: 1 }); // oldest first

  res.status(200).json(
    new ApiResponse(200, { sessions }, `Found ${sessions.length} pending session(s)`)
  );
});

// Bin acknowledges a session — starts waste detection
const acknowledgeSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.body;
  const bin = req.bin;

  if (!sessionId) {
    throw new ApiError(400, "sessionId is required");
  }

  const session = await DepositSession.findById(sessionId);
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Verify session belongs to this bin
  if (session.binId.toString() !== bin._id.toString()) {
    throw new ApiError(403, "This session does not belong to your bin");
  }

  if (session.status !== "pending") {
    throw new ApiError(400, `Session is already "${session.status}", cannot acknowledge`);
  }

  // Check if session has expired
  if (new Date() > session.expiresAt) {
    session.status = "expired";
    await session.save();
    throw new ApiError(410, "Session has expired");
  }

  // Lock the bin and activate the session
  bin.hasActiveSession = true;
  await bin.save();

  session.status = "active";
  session.expiresAt = new Date(Date.now() + ACTIVE_TIMEOUT_MS); // extend timeout for active phase
  await session.save();

  res.status(200).json(
    new ApiResponse(200, {
      sessionId: session._id,
      status: "active",
      userId: session.userId,
      expiresAt: session.expiresAt,
    }, "Session acknowledged. Bin is now active for waste detection.")
  );
});

// Bin completes a session — submits sensor data, triggers reward calculation
const completeSession = asyncHandler(async (req, res) => {
  const { sessionId, wasteType, weightKg } = req.body;
  const bin = req.bin;

  if (!sessionId || !wasteType || weightKg === undefined) {
    throw new ApiError(400, "sessionId, wasteType, and weightKg are required");
  }

  if (weightKg <= 0) {
    throw new ApiError(400, "Weight must be greater than 0");
  }

  if (!REWARD_RATES.hasOwnProperty(wasteType)) {
    throw new ApiError(400, `Invalid wasteType. Must be one of: ${Object.keys(REWARD_RATES).join(", ")}`);
  }

  const session = await DepositSession.findById(sessionId);
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  if (session.binId.toString() !== bin._id.toString()) {
    throw new ApiError(403, "This session does not belong to your bin");
  }

  if (session.status !== "active") {
    throw new ApiError(400, `Session status is "${session.status}", expected "active"`);
  }

  // Calculate fill level
  const newFillLevel = bin.fillLevel + weightKg;
  if (newFillLevel > bin.capacity) {
    throw new ApiError(400, "Weight exceeds remaining bin capacity");
  }

  const fillPercentage = Number(
    ((newFillLevel / bin.capacity) * 100).toFixed(2)
  );

  // Calculate reward points
  const rewardPoints = Number((weightKg * (REWARD_RATES[wasteType] || 0)).toFixed(2));

  // Create the deposit record
  const deposit = await Deposit.create({
    sessionId: session._id,
    wasteType,
    weightKg,
    fillPercentage,
    userId: session.userId,
    binId: bin._id,
    rewardPoints,
  });

  // Update bin
  bin.fillLevel = newFillLevel;
  bin.hasActiveSession = false;
  await bin.save();

  // Credit user
  await User.findByIdAndUpdate(session.userId, {
    $inc: {
      totalRewards: rewardPoints,
      totalWasteDepositedInKg: weightKg,
    },
  });

  // Complete the session
  session.status = "completed";
  session.wasteType = wasteType;
  session.weightKg = weightKg;
  session.rewardPoints = rewardPoints;
  session.fillPercentage = fillPercentage;
  session.completedAt = new Date();
  await session.save();

  res.status(200).json(
    new ApiResponse(200, {
      sessionId: session._id,
      depositId: deposit._id,
      rewardPoints,
      fillPercentage,
      wasteType,
      weightKg,
    }, "Deposit completed successfully. Rewards credited to user.")
  );
});

// ─── Admin endpoint ───

// Register a new bin (admin only, protected by ADMIN_SECRET)
const registerBin = asyncHandler(async (req, res) => {
  const adminSecret = req.header("x-admin-secret");

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    throw new ApiError(401, "Invalid admin credentials");
  }

  const { name, location, capacity } = req.body;

  if (!name || !location || !capacity) {
    throw new ApiError(400, "name, location, and capacity are required");
  }

  if (capacity <= 0) {
    throw new ApiError(400, "capacity must be greater than 0");
  }

  // Generate a random API key
  const rawApiKey = crypto.randomUUID();

  // Hash it for storage
  const apiKeyHash = await bcrypt.hash(rawApiKey, 10);

  const bin = await Bin.create({
    name,
    location,
    capacity,
    fillLevel: 0,
    apiKeyHash,
    isActive: true,
    hasActiveSession: false,
  });

  // Return the raw API key ONCE — must be saved to the Pi's .env
  res.status(201).json(
    new ApiResponse(201, {
      binId: bin._id,
      name: bin.name,
      location: bin.location,
      capacity: bin.capacity,
      apiKey: rawApiKey, // ⚠️ Only returned once — store this securely on the Raspberry Pi
    }, "Bin registered successfully. Save the API key — it will not be shown again.")
  );
});

export { getPendingSessions, acknowledgeSession, completeSession, registerBin };