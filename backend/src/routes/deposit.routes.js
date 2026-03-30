import express from "express";
import { Deposit } from "../models/deposit.model.js";
import { generateAndUpdateRewardPoints } from "../controllers/deposit.controller.js";

const router = express.Router();

router.post("/deposit", generateAndUpdateRewardPoints);

router.get("/", (req, res) => {
  res.json({ message: "Get all deposits" });
});
export default router;
