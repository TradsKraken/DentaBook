require("dotenv").config();
const { createPool } = require("./db");
const { createApp } = require("./app");
const { migrate } = require("./database/migrate");
const pool = createPool();
async function start() {
  const clientUrl = new URL(process.env.CLIENT_URL || "http://localhost:3000");
  if (
    process.env.NODE_ENV === "production" &&
    clientUrl.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(clientUrl.hostname)
  )
    throw new Error("CLIENT_URL must use HTTPS in production.");
  await migrate(pool);
  const server = createApp(pool).listen(process.env.PORT || 5000, process.env.HOST || '0.0.0.0', () =>
    console.log("DentaBook API listening on port", process.env.PORT || 5000),
  );
  function shutdown() {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  }
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
start().catch(async (error) => {
  console.error("API startup failed:", error.message);
  await pool.end();
  process.exitCode = 1;
});
