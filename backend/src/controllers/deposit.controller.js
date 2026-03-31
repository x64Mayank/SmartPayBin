import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { DepositSession } from "../models/depositSession.model.js";
import { Bin } from "../models/bin.model.js";

// Session timeout constants (in milliseconds)
const PENDING_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes for bin to acknowledge

// User starts a deposit session by scanning bin QR code
const startSession = asyncHandler(async (req, res) => {
  const { binId } = req.body;
  const userId = req.user._id;

  if (!binId) {
    throw new ApiError(400, "binId is required");
  }

  // Validate bin exists and is active
  const bin = await Bin.findById(binId);
  if (!bin) {
    throw new ApiError(404, "Bin not found");
  }

  if (!bin.isActive) {
    throw new ApiError(403, "This bin is currently inactive");
  }

  // Check bin is not already in use
  if (bin.hasActiveSession) {
    throw new ApiError(409, "This bin is currently in use by another user. Please wait.");
  }

  // Check bin capacity
  if (bin.fillLevel >= bin.capacity) {
    throw new ApiError(400, "Bin is full. Cannot accept waste until it is emptied.");
  }

  // Check user doesn't already have an active/pending session
  const existingSession = await DepositSession.findOne({
    userId,
    status: { $in: ["pending", "active"] },
  });

  if (existingSession) {
    throw new ApiError(
      409,
      `You already have an ${existingSession.status} session. Complete or cancel it first.`
    );
  }

  // Create the session
  const session = await DepositSession.create({
    userId,
    binId,
    status: "pending",
    expiresAt: new Date(Date.now() + PENDING_TIMEOUT_MS),
  });

  res.status(201).json(
    new ApiResponse(201, {
      sessionId: session._id,
      status: session.status,
      binName: bin.name,
      binLocation: bin.location,
      expiresAt: session.expiresAt,
    }, "Deposit session started. Waiting for bin to acknowledge.")
  );
});

// User polls for session status updates
const getSessionStatus = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;

  const session = await DepositSession.findById(sessionId);
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  // Ensure user can only see their own sessions
  if (session.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only view your own sessions");
  }

  // Check if session has expired (in case cleanup hasn't run yet)
  if (
    ["pending", "active"].includes(session.status) &&
    new Date() > session.expiresAt
  ) {
    session.status = "expired";
    await session.save();

    // Unlock the bin if it was locked
    await Bin.findByIdAndUpdate(session.binId, { hasActiveSession: false });
  }

  const responseData = {
    sessionId: session._id,
    status: session.status,
    expiresAt: session.expiresAt,
    createdAt: session.createdAt,
  };

  // Include deposit details if session is completed
  if (session.status === "completed") {
    responseData.wasteType = session.wasteType;
    responseData.weightKg = session.weightKg;
    responseData.rewardPoints = session.rewardPoints;
    responseData.fillPercentage = session.fillPercentage;
    responseData.completedAt = session.completedAt;
  }

  res.status(200).json(
    new ApiResponse(200, responseData, `Session status: ${session.status}`)
  );
});

// User cancels a pending session (before bin acknowledges)
const cancelSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const userId = req.user._id;

  const session = await DepositSession.findById(sessionId);
  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  if (session.userId.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only cancel your own sessions");
  }

  if (session.status !== "pending") {
    throw new ApiError(
      400,
      `Cannot cancel a session with status "${session.status}". Only pending sessions can be cancelled.`
    );
  }

  session.status = "cancelled";
  await session.save();

  res.status(200).json(
    new ApiResponse(200, { sessionId: session._id, status: "cancelled" }, "Session cancelled successfully")
  );
});

export { startSession, getSessionStatus, cancelSession };
