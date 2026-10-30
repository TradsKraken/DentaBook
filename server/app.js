const express = require("express");
const cors = require("cors");
const { createClinicRouter } = require("./routes/clinics");
const { createAccountRouter } = require("./routes/accounts");
const { createWorkspaceRouter } = require("./routes/workspaces");
const { protectMutation } = require("./auth");
const { configuredPortal, restrictPortal } = require("./portal");

function createApp(pool, { logger = console } = {}) {
  configuredPortal();
  const app = express();
  app.disable("x-powered-by");
  // Accept forwarded client addresses only from explicitly trusted proxy networks.
  if (process.env.TRUST_PROXY)
    app.set(
      "trust proxy",
      process.env.TRUST_PROXY.split(",").map((value) => value.trim()),
    );
  app.use(
    cors({
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", restrictPortal, protectMutation);
  app.use((req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    next();
  });
  app.get("/api/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({
        status: "healthy",
        service: "dentabook-api",
        database: { connected: true },
      });
    } catch {
      res
        .status(503)
        .json({
          status: "unavailable",
          service: "dentabook-api",
          database: { connected: false },
        });
    }
  });
  app.get("/api", (req, res) =>
    res.json({
      message: "DentaBook API",
      version: "1.0.0",
      endpoints: { health: "/api/health", clinics: "/api/clinics" },
    }),
  );
  app.use("/api/clinics", createClinicRouter(pool));
  app.use("/api/auth", createAccountRouter(pool));
  app.use("/api/workspaces", createWorkspaceRouter(pool));
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "API route not found." }),
  );
  app.use((error, req, res, next) => {
    if (
      error.type === "entity.parse.failed" ||
      error.type === "entity.too.large"
    )
      return res.status(400).json({ error: "Please send a valid request." });
    logger.error("API request failed:", error);
    res
      .status(503)
      .json({
        error:
          "This service is temporarily unavailable. Please try again later.",
      });
  });
  return app;
}
module.exports = { createApp };
