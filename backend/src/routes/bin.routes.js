import express from "express";
import { updateBinFromSensor } from "../controllers/bin.controller.js";

const router = express.Router();

router.post("/update-bin", updateBinFromSensor);

export default router;