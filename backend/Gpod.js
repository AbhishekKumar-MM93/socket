import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import userRoute from "./Routes/userRoutes.js";
import cmsRouter from "./Routes/cmsRoute.js";
import { errorHandler } from "./middleware/errorMiddleware.js";
import bodyParser from "body-parser";
import mongoose from "mongoose";

import path from "path";
import flash from "connect-flash";

import fileUpload from "express-fileupload";
const __dirname = path.resolve();
// console.log("directory-name ", __dirname);
// console.log(path.join(__dirname, "public"), ">>>>>>");
import fs from "fs";
import util from "util";
import apiRoute from "./Routes/api/apiRoutes.js";
import faqRouter from "./Routes/faqRoutes.js";

import http from "http";
import { Server } from "socket.io";
import socket from "./socket.js";

console.error = console.log;
dotenv.config();

const app = express();
app.use(cors());

const server = http.createServer(app);
var io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Replace with your frontend URL
    methods: ["GET", "POST"],
    credentials: true,
  },
});

//--------------------------------
// Set View Engine
//--------------------------------
app.set("view engine", "ejs");
app.set("views", "views");

app.use(flash());
app.use(
  fileUpload({
    useTempFiles: true,
  })
);

// app.use(express.static(path.join(__dirname, "public")));
// app.use(cors(corsOptions));

// var corsOptions = {
//   origin: "http://65.2.68.95:3033/",
//   optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
// };

mongoose.set("strictQuery", false);
mongoose
  .connect(
    "mongodb+srv://seeke:aiNsP6WpGmsyD7aV@cluster0.thv9xbf.mongodb.net/Gpod?retryWrites=true&w=majority",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then((con) => {
    console.log("Db Connected.....");
  })
  .catch((err) => {
    console.log(err, "=========err=========");
  });

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", express.static(path.join(__dirname, "frontend/build")));
app.use("/*", express.static(path.join(__dirname, "frontend/build")));
app.use(express.static(path.join(__dirname, "public")));

app.use("/user", userRoute);
app.use("/api", apiRoute);
app.use("/cms", cmsRouter);
app.use("/faq", faqRouter);

app.use(errorHandler);
app.use(errorHandler);

socket(io);

const PORT = 3033;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
