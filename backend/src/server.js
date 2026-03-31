import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN.split(',').map(o => o.trim()),
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

import depositRouter from "./routes/deposit.routes.js";
app.use("/api/deposits", depositRouter);

import userRouter from './routes/user.routes.js'
app.use('/users', userRouter)

import binRouter from './routes/bin.routes.js'
app.use('/api/bin', binRouter)

// Global error handling middleware (must be AFTER all routes)
import { ApiError } from "./utils/ApiError.js";

app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      errors: err.errors,
      data: err.data
    });
  }
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error"
  });
});

export { app };

