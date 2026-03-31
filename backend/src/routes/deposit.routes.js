import express from "express";
import {
  startSession,
  getSessionStatus,
  cancelSession,
} from "../controllers/deposit.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All user-facing, JWT-protected
router.post("/start-session", verifyJWT, startSession);
router.get("/session-status/:sessionId", verifyJWT, getSessionStatus);
router.post("/cancel-session/:sessionId", verifyJWT, cancelSession);

export default router;
