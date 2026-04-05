import "dotenv/config";
import connectDB from "../src/db/db.js";
import { app } from "./server.js";
import { startSessionCleanup } from "./utils/sessionCleanup.js";

connectDB()
  .then(() => {
    app.on("ERROR", (err) => {
      console.log("There is an error in start of the server ", err);
    });

    app.listen(process.env.PORT, "0.0.0.0", () => {
      console.log(` server has started at PORT : ${process.env.PORT}`);
      startSessionCleanup();
    });
  })
  .catch((err) => {
    console.log("MongoDb connection ERROR !!! ", err);
  });

