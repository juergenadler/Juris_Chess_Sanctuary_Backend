"use strict";

const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
require("colors");
const path = require("path");

const connectDB = require("./dbinit");

const isPortInUse = require("./src/utils/checkPort");

const userRouter = require("./src/routes/userRouter");
const pgnRouter = require("./src/routes/pgnRouter");
const stockfishRouter = require("./src/routes/stockfishRouter");

async function main() {
  try {
    const PORT = process.env.PORT || 8080;

    const portInUse = await isPortInUse(PORT);
    if (portInUse) {
      console.log(`Port ${PORT} is already in use`);
      return;
    }

    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    app.use((req, res, next) => {
      console.log(req.path, req.method);
      next();
    });

    await connectDB();
    console.log("Database connected successfully.".green);

    const basePath = "/sanctuary";

    app.get(basePath, (req, res) => {
      res.send("Welcome to my sanctuary API!");
    });
    console.log("Welcome to my sanctuary API!");

    app.use(express.static(path.join(__dirname, "public")));
    app.get(`${basePath}/stockfishrouter/test`, (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    // Mount the regular routers.
    app.use(`${basePath}/userrouter`, userRouter);
    app.use(`${basePath}/pgnrouter`, pgnRouter);
    app.use(`${basePath}/stockfishrouter`, stockfishRouter);

    // const expressListEndpoints = require('express-list-endpoints');
    // console.log(expressListEndpoints(app));

    const server = app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`.green); // cannot read .rainbow :-P
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use.`);
      } else {
        console.error("Error starting server:", err.message);
      }
      process.exit(1);
    });

    process.on("unhandledRejection", (err) => {
      console.error("Unhandled Rejection:", err);

      server.close(() => {
        process.exit(1);
      });
    });

    process.on("uncaughtException", (err) => {
      console.error("Uncaught Exception:", err);
      server.close(() => {
        process.exit(1);
      });
    });

    process.on("SIGINT", () => {
      console.log("SIGINT signal received. Closing server...");
      server.close(() => {
        console.log("Server closed.");
        process.exit(0);
      });
    });

    process.on("SIGBREAK", () => {
      console.log("SIGBREAK signal received. Closing server...");
      server.close(() => {
        console.log("Server closed.");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Exception occurred during server startup:", error.message);
    process.exit(1);
  }
}

main().catch((err) => console.error("Error in main:", err));
