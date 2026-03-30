import { Bin } from "../models/bin.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/AsyncHandler.js";

const updateBinFromSensor = asyncHandler(async (req, res) => {
  const { binId, fillLevel } = req.body;

  if (!binId || fillLevel === undefined) {
    throw new ApiError(400, "binId and fillLevel required");
  }

  const bin = await Bin.findById(binId);
  if (!bin) throw new ApiError(404, "Bin not found");

  bin.fillLevel = fillLevel;
  await bin.save();

  res.status(200).json(
    new ApiResponse(200, bin, "Bin updated from sensor")
  );
});

export { updateBinFromSensor };