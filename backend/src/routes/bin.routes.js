import express from "express";
import { updateBinFromSensor } from "../controllers/bin.controller";

const router = express.Router();

router.post("/update-bin", updateBinFromSensor);