import connectDB from "../src/db/index.js";
import { app } from "./server.js";
import dotenv from "dotenv";

connectDB()
  .then(() => {
    app.on("ERROR", (err) => {
      console.log("There is an error in start of the server ", err);
    });

    app.listen(process.env.PORT, () => {
      console.log(` server has started at PORT : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MongoDb connection ERROR !!! ", err);
  });
