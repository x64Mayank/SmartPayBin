import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    wasteType: {
      type: String,
      enum: ["plastic", "recyclable", "biodegradable", "mixed"],
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    weightKg: {
      type: Number,
      required: true,
    },
    rewardPoints: {
      type: Number,
      default: 0,
    },
    fillPercentage: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Deposit", depositSchema);
