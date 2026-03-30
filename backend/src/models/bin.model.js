import mongoose from "mongoose";

const binSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
  },
  capacity: {
    type: Number,
    required: true,
  },
  fillLevel: {
    type: Number,
    required: true,
  },
});
