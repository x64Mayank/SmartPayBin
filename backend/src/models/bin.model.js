import mongoose from "mongoose";
import bcrypt from "bcrypt";

const binSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
    fillLevel: {
      type: Number,
      required: true,
      default: 0,
    },
    apiKeyHash: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    hasActiveSession: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

binSchema.methods.isApiKeyCorrect = async function (rawApiKey) {
  return await bcrypt.compare(rawApiKey, this.apiKeyHash);
};

export const Bin = mongoose.model("Bin", binSchema);
