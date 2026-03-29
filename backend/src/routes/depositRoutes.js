import express from "express";
import Deposit from "../models/Deposit.model.js";
import { generateRewardPointsAndUpdateFillPercentage } from "../controllers/deposit.controller.js";

const router = express.Router();

router.post("/", generateRewardPointsAndUpdateFillPercentage);

router.get("/", (req, res) => {
  res.json({ message: "Get all deposits" });
});
export default router;
