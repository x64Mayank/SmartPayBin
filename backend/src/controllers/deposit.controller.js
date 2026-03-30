import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import {Deposit} from "../models/deposit.model.js";
import { User } from "../models/user.model.js";
import { Bin } from "../models/bin.model.js";
const generateAndUpdateRewardPoints = asyncHandler(
  async (req, res) => {
    // we need an api requet to get the waste type, weight, fill level and capacity
    const { binId, wasteType, weightKg } = req.body;
    const userId = req.user._id;

    if (!binId || !wasteType || !weightKg) {
      throw new ApiError(400, "Missing required fields");
    }

    if (weightKg <= 0) {
      throw new ApiError(400, "Weight must be greater than 0");
    }

  // Get real-time bin data
  const bin = await Bin.findById(binId);
  if (!bin){
    throw new ApiError(404, "Bin not found");
  } 

    if (bin.fillLevel >= bin.capacity) {
      throw new ApiError(
        400,
        "Bin is full can not take more waste until it is emptied "
      );
    }

    const newFillLevel = bin.fillLevel + weightKg;
    if (newFillLevel > bin.capacity) {
      throw new ApiError(400, "Exceeds bin capacity");
    }

    const fillPercentage = Number(
      ((newFillLevel / bin.capacity) *
      100
      ).toFixed(2)
    );

    const rewardRates = {
      recyclable: 10,
      plastic: 8,
      biodegradable: 5,
      mixed: 0,
    };
    const rewardPoints = weightKg * (rewardRates[wasteType] || 0);
    
    const newDeposit = await Deposit.create({
      wasteType,
      weightKg,
      fillPercentage,
      userId,
      binId,
      rewardPoints,
    });

    // Update bin (after deposit)
    bin.fillLevel = newFillLevel;
    await bin.save();

    await User.findByIdAndUpdate(userId, {
      $inc: { rewardPoints: rewardPoints },
    });

    res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { rewardPoints, fillPercentage, deposit: newDeposit, },
          "Reward points calculated successfully and user updated successfully"
        )
      );
  }
);

export { generateAndUpdateRewardPoints };
