import Deposit from "../models/Deposit.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import asyncHandler from "express-async-handler";

const generateRewardPointsAndUpdateFillPercentage = asyncHandler(
  async (req, res) => {
    // we need an api requet to get the waste type, weight, fill level and capacity
    const { wasteType, weightKg, fillLevelCm, capacityCm } = req.body;

    if (!wasteType || !weightKg || !fillLevelCm || !capacityCm) {
      return new ApiError(
        400,
        "Missing required fields: wasteType, weightKg, fillLevelCm, capacityCm"
      );
    }

    if (fillLevelCm >= capacityCm) {
      return new ApiError(
        400,
        "Bin is full can not take more waste until it is emptied "
      );
    }

    const fillPercentage = (
      ((capacityCm - fillLevelCm) / capacityCm) *
      100
    ).toFixed(2);

    const rewardRates = {
      recyclable: 10,
      plastic: 8,
      biodegradable: 5,
      mixed: 0,
    };
    const rewardPoints = weightKg * (rewardRates[wasteType] || 0);

    const newDeposit = Deposit.create({
      wasteType,
      weightKg,
      fillLevelCm,
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { rewardPoints, fillPercentage },
          "Reward points calculated successfully"
        )
      );
  }
);

export { generateRewardPointsAndUpdateFillPercentage };
