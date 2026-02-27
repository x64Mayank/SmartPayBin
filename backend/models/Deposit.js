const mongoose = require("mongoose");

const depositSchema = new mongoose.Schema({
  binId: String,
  userId: String,
  wasteType: String,
  weightKg: Number,
  rewardPoints: Number,
  fillPercentage: Number,
  timestamp: Date
});

module.exports = mongoose.model("Deposit", depositSchema);