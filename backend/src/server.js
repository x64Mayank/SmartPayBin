import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  }),
);

import { ApiError } from "./utils/ApiError.js";

// Global error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      errors: err.errors,
      data: err.data
    });
  }
  return res.status(499).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import depositRouter from "./routes/deposit.routes.js";
app.use("/api/deposits", depositRouter);

import userRouter from './routes/user.routes.js'
app.use('/users', userRouter)

export { app };
