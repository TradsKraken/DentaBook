require("dotenv").config();
const readline = require("node:readline");
const { Writable } = require("node:stream");
const bcrypt = require("bcrypt");
const { createPool } = require("../db");
const { migrate } = require("../database/migrate");
const { email, password, text } = require("../validation");

async function main() {
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: !!process.stdin.isTTY,
  });
  const ask = (prompt, hidden = false) =>
    new Promise((resolve) => {
      process.stdout.write(prompt);
      muted = hidden;
      rl.question("", (answer) => {
        muted = false;
        if (hidden) process.stdout.write("\n");
        resolve(answer);
      });
    });
  let pool;
  try {
    const name = await ask("Administrator full name: ");
    const address = await ask("Administrator email: ");
    const secret = await ask(
      "Password (at least 12 characters; hidden): ",
      true,
    );
    const repeat = await ask("Confirm password (hidden): ", true);
    if (
      !text(name, 150) ||
      !email(address) ||
      !password(secret) ||
      secret !== repeat
    )
      throw new Error(
        "Check the name, email, and matching passwords. Passwords require at least 12 characters and at most 72 UTF-8 bytes.",
      );
    pool = createPool();
    await migrate(pool);
    const hash = await bcrypt.hash(secret, 12);
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, 'system_admin')`,
      [name.trim(), address.trim().toLowerCase(), hash],
    );
    console.log("Administrator account created. Sign in through the website.");
  } finally {
    rl.close();
    if (pool) await pool.end();
  }
}
main().catch((error) => {
  console.error(
    error.code === "23505"
      ? "An account already uses that email. No account was changed."
      : error.message,
  );
  process.exitCode = 1;
});
