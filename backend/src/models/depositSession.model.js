import mongoose from "mongoose";

const depositSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    binId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bin",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "expired", "cancelled"],
      default: "pending",
      required: true,
    },
    // Filled by the bin on completion
    wasteType: {
      type: String,
      enum: ["plastic", "recyclable", "biodegradable", "mixed"],
    },
    weightKg: {
      type: Number,
    },
    rewardPoints: {
      type: Number,
      default: 0,
    },
    fillPercentage: {
      type: Number,
    },
    // Timeout management
    expiresAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes documents 24h after expiry (cleanup of old expired/cancelled sessions)
depositSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

// Fast lookup: bin polling for its pending sessions
depositSessionSchema.index({ binId: 1, status: 1 });

// Fast lookup: user checking their active session
depositSessionSchema.index({ userId: 1, status: 1 });

export const DepositSession = mongoose.model("DepositSession", depositSessionSchema);
