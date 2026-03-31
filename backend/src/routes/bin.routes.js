import express from "express";
import {
  getPendingSessions,
  acknowledgeSession,
  completeSession,
  registerBin,
} from "../controllers/bin.controller.js";
import { verifyBinApiKey } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Bin-facing routes (API key auth)
router.get("/pending-sessions", verifyBinApiKey, getPendingSessions);
router.post("/ack-session", verifyBinApiKey, acknowledgeSession);
router.post("/complete-session", verifyBinApiKey, completeSession);

// Admin route (admin secret auth)
router.post("/register", registerBin);

export default router;