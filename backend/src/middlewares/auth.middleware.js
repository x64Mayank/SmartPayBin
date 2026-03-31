import { asyncHandler } from "../utils/AsyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { Bin } from "../models/bin.model.js";
import { ApiError } from "../utils/ApiError.js";

// Verify user JWT token
export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(400, error?.message || "Invalid token");
  }
});

// Verify bin API key (machine-to-machine auth)
export const verifyBinApiKey = asyncHandler(async (req, res, next) => {
  const apiKey = req.header("x-bin-api-key");
  const binId = req.header("x-bin-id");

  if (!apiKey || !binId) {
    throw new ApiError(401, "Missing bin credentials (x-bin-api-key and x-bin-id headers required)");
  }

  const bin = await Bin.findById(binId);
  if (!bin) {
    throw new ApiError(401, "Bin not found");
  }

  if (!bin.isActive) {
    throw new ApiError(403, "Bin has been deactivated");
  }

  const isValid = await bin.isApiKeyCorrect(apiKey);
  if (!isValid) {
    throw new ApiError(401, "Invalid bin API key");
  }

  req.bin = bin;
  next();
});
