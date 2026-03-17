import express from "express";
import Deposit from "../models/Deposit.model.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { wasteType, weightKg, fillLevelCm, capacityCm } = req.body;

  const fillPercentage = ((capacityCm - fillLevelCm) / capacityCm) * 100;

  const rewardRates = {
    recyclable: 10,
    plastic: 8,
    biodegradable: 5,
    mixed: 0,
  };

  const rewardPoints = weightKg * (rewardRates[wasteType] || 0);

  res.json({
    message: "Deposit recorded",
    rewardPoints,
    fillPercentage,
  });
});

router.get("/", (req, res) => {
  res.json({ message: "Get all deposits" });
});
export default router;
