// Explicitly invoked test harness. It never uses application database credentials.
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const fs = require("node:fs/promises");
const path = require("node:path");
const { migrate } = require("../database/migrate");
const { createApp } = require("../app");
if (process.env.DENTABOOK_ISOLATED_BOOKING_TEST !== "1") throw new Error("This harness requires the isolated booking test environment.");
const pool = new Pool({ host: "dentabook-booking-test-db", database: "dentabook_booking_browser", user: "booking_test", password: "isolated_test_only" });
(async () => {
  await pool.query(await fs.readFile(path.join(__dirname,"../database/init.sql"),"utf8"));
  await migrate(pool);
  const hash = await bcrypt.hash("Booking browser test password!",12);
  const staff = (await pool.query("INSERT INTO users (email,password_hash,full_name,phone,role) VALUES ('staff@example.test',$1,'Test Clinic Staff','09123456789','clinic_staff') RETURNING id",[hash])).rows[0].id;
  await pool.query("INSERT INTO users (email,password_hash,full_name,phone,role) VALUES ('patient@example.test',$1,'Test Patient','09123456789','patient')",[hash]);
  const clinicId="11111111-1111-4111-8111-111111111111";
  await pool.query("INSERT INTO clinics (id,owner_user_id,name,address,phone,email,status) VALUES ($1,$2,'Isolated Booking Clinic','Isolated test address','09123456789','clinic@example.test','approved')",[clinicId,staff]);
  await pool.query("INSERT INTO services (id,clinic_id,name,category,estimated_price,duration_minutes) VALUES ('22222222-2222-4222-8222-222222222222',$1,'Test treatment','General',1500,30)",[clinicId]);
  await pool.query("INSERT INTO dentists (id,clinic_id,full_name,title,credentials_summary) VALUES ('33333333-3333-4333-8333-333333333333',$1,'Test Dentist','Test title','Test qualifications')",[clinicId]);
  const server=createApp(pool).listen(5000,"127.0.0.1",()=>console.log("Isolated booking API ready"));
  async function close() { await new Promise(resolve=>server.close(resolve)); await pool.end(); process.exit(0); }
  process.once("SIGTERM",close); process.once("SIGINT",close);
})().catch(error=>{console.error(error);process.exit(1);});
