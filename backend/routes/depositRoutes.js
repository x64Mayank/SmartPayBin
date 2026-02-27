const express = require("express");
const router = express.Router();
const Deposit = require("../models/Deposit");

router.post("/", async (req, res) => {
  const {
    binId,
    userId,
    wasteType,
    weightKg,
    fillLevelCm,
    capacityCm,
    timestamp
  } = req.body;

  const fillPercentage =
    ((capacityCm - fillLevelCm) / capacityCm) * 100;

  const rewardRates = {
    recyclable: 10,
    plastic: 8,
    biodegradable: 5,
    mixed: 0
  };

  const rewardPoints = weightKg * (rewardRates[wasteType] || 0);

  const deposit = new Deposit({
    binId,
    userId,
    wasteType,
    weightKg,
    rewardPoints,
    fillPercentage,
    timestamp
  });

  await deposit.save();

  res.json({
    message: "Deposit recorded",
    rewardPoints,
    fillPercentage
  });
});

module.exports = router;