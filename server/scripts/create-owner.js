require("dotenv").config();
const readline = require("node:readline");
const { Writable } = require("node:stream");
const { createPool } = require("../db");
const { migrate } = require("../database/migrate");
const { createOwnerAccount } = require("../owner-account");

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--development")) throw new Error("Supported option: --development");
  const development = args.includes("--development");
  if (development && process.env.NODE_ENV !== "development")
    throw new Error("Development accounts require NODE_ENV=development. No database changes were made.");
  let rl;
  let pool;
  try {
    let options;
    if (development) {
      // Explicit operator command only. Never seeded at application startup.
      options = { username: "admin", name: "Administrator", secret: "admin123", development: true };
    } else {
      let muted = false;
      const output = new Writable({ write(chunk, encoding, callback) {
        if (!muted) process.stdout.write(chunk);
        callback();
      } });
      rl = readline.createInterface({ input: process.stdin, output, terminal: !!process.stdin.isTTY });
      const ask = (prompt, hidden = false) => new Promise(resolve => {
        process.stdout.write(prompt);
        muted = hidden;
        rl.question("", answer => { muted = false; if (hidden) process.stdout.write("\n"); resolve(answer); });
      });
      const username = await ask("Owner username: ");
      const name = await ask("Owner full name: ");
      const address = await ask("Email (optional): ");
      const secret = await ask("Strong password (12+ characters; hidden): ", true);
      const repeat = await ask("Confirm password (hidden): ", true);
      if (secret !== repeat) throw new Error("Passwords do not match. No account was created.");
      options = { username, name, address: address.trim() || null, secret };
    }
    pool = createPool();
    await migrate(pool);
    const owner = await createOwnerAccount(pool, options);
    console.log(`Owner account '${owner.username}' created. Sign in separately to patient, clinic, and administrator portals.`);
    if (development) console.log("This development-only account is blocked by production APIs.");
  } finally {
    if (rl) rl.close();
    if (pool) await pool.end();
  }
}
main().catch(error => {
  console.error(error.code === "23505" ? "Username or email already exists. No existing account was changed." : error.message);
  process.exitCode = 1;
});
