// Initialize a workspace-owned PostgreSQL instance without altering Windows services.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { Pool } = require('../server/node_modules/pg');
const dotenv = require('../server/node_modules/dotenv');
const bcrypt = require('../server/node_modules/bcrypt');
const { migrate } = require('../server/database/migrate');
const { email } = require('../server/validation');
const root = path.resolve(__dirname, '..');
const runtime = path.join(root, '.local');
const bin = path.join(runtime, 'postgresql/pgsql/bin');
const data = path.join(runtime, 'postgres-data');
const logs = path.join(runtime, 'logs');
const identifier = value => `"${value.replaceAll('"','""')}"`;
function command(name, args, allowFailure = false) {
  // A detached PostgreSQL child can retain pipe handles on Windows. Do not wait
  // for pipe EOF when pg_ctl starts it; server diagnostics go to its log file.
  const result = spawnSync(path.join(bin, `${name}.exe`), args, { encoding:'utf8', windowsHide:true, stdio: name === 'pg_ctl' && args.includes('start') ? 'ignore' : 'pipe' });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) throw new Error(`${name} failed: ${result.stderr || result.stdout}`);
  return result;
}
async function main() {
  const adminEmail = (process.argv[2] || '').trim().toLowerCase();
  if (!email(adminEmail)) throw new Error('Provide the intended administrator email address as the sole argument.');
  if (!fs.existsSync(path.join(bin, 'initdb.exe'))) throw new Error('Download the EDB PostgreSQL 16 Windows binaries into .local/postgresql first.');
  const rootEnv = path.join(root, '.env');
  if (!fs.existsSync(rootEnv)) {
    const template = fs.readFileSync(path.join(root,'.env.example'),'utf8');
    fs.writeFileSync(rootEnv, template.replace(/^DB_PASSWORD=.*$/m, 'DB_PASSWORD='+crypto.randomBytes(32).toString('hex')), { flag:'wx' });
  }
  const env = dotenv.parse(fs.readFileSync(rootEnv));
  if (!/^[a-f0-9]{64}$/.test(env.DB_PASSWORD || '')) throw new Error('Local setup requires the generated database password in the ignored root .env file.');
  fs.mkdirSync(logs, { recursive:true });
  const bootstrapPath = path.join(runtime, 'postgres-admin.json');
  if (!fs.existsSync(bootstrapPath)) fs.writeFileSync(bootstrapPath, JSON.stringify({ user:'dentabook_local_admin', password:crypto.randomBytes(32).toString('hex') }), { flag:'wx' });
  const bootstrap = JSON.parse(fs.readFileSync(bootstrapPath, 'utf8'));
  if (!/^[a-f0-9]{64}$/.test(bootstrap.password)) throw new Error('Invalid local database bootstrap credentials.');
  if (!fs.existsSync(path.join(data, 'PG_VERSION'))) {
    const passwordFile = path.join(runtime, 'initdb-password.tmp');
    fs.writeFileSync(passwordFile, bootstrap.password);
    try { command('initdb', ['-D',data,'-U',bootstrap.user,'--pwfile',passwordFile,'-A','scram-sha-256','--encoding=UTF8','--locale=C']); }
    finally { fs.unlinkSync(passwordFile); }
    console.log('Initialized native PostgreSQL data directory.');
  }
  if (command('pg_ctl', ['-D',data,'status'], true).status !== 0) {
    command('pg_ctl', ['-D',data,'-l',path.join(logs,'postgresql.log'),'-o','-h 127.0.0.1 -p 55432','-w','start']);
  }
  const admin = new Pool({ host:'127.0.0.1',port:55432,user:bootstrap.user,password:bootstrap.password,database:'postgres' });
  try {
    if (!(await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[env.DB_USER])).rows.length) {
      await admin.query(`CREATE ROLE ${identifier(env.DB_USER)} LOGIN PASSWORD '${env.DB_PASSWORD}'`);
    }
    if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[env.DB_NAME])).rows.length) {
      await admin.query(`CREATE DATABASE ${identifier(env.DB_NAME)} OWNER ${identifier(env.DB_USER)}`);
    }
  } finally { await admin.end(); }
  const localEnv = { ...env, DB_HOST:'127.0.0.1', DB_PORT:'55432', HOST:'127.0.0.1', NODE_ENV:'development', PORT:'5000', CLIENT_URL:'http://localhost:3000' };
  const localEnvPath = path.join(root,'server/.env');
  if (fs.existsSync(localEnvPath)) {
    const previous = dotenv.parse(fs.readFileSync(localEnvPath));
    if (previous.DB_HOST !== localEnv.DB_HOST || previous.DB_PORT !== localEnv.DB_PORT || previous.DB_NAME !== localEnv.DB_NAME || previous.DB_USER !== localEnv.DB_USER || previous.DB_PASSWORD !== localEnv.DB_PASSWORD) {
      throw new Error('An existing server/.env points to a different database. It was not changed.');
    }
  } else fs.writeFileSync(localEnvPath, Object.entries(localEnv).map(([key,value])=>`${key}=${value}`).join('\n')+'\n', { flag:'wx' });
  const pool = new Pool({ host:localEnv.DB_HOST,port:Number(localEnv.DB_PORT),user:localEnv.DB_USER,password:localEnv.DB_PASSWORD,database:localEnv.DB_NAME });
  try {
    await pool.query(fs.readFileSync(path.join(root,'server/database/init.sql'),'utf8'));
    await migrate(pool);
    const existing = (await pool.query('SELECT role FROM users WHERE LOWER(email)=$1',[adminEmail])).rows[0];
    if (existing && existing.role !== 'system_admin') throw new Error('That email belongs to a non-administrator account. No role was changed.');
    const credentialsPath = path.join(runtime,'admin-credentials.txt');
    if (!existing) {
      const password = `Db!${crypto.randomBytes(20).toString('base64url')}`;
      if (fs.existsSync(credentialsPath)) throw new Error('The local credentials file already exists. It was not overwritten.');
      const hash = await bcrypt.hash(password,12);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO users (full_name,email,password_hash,role) VALUES ($1,$2,$3,'system_admin')`,['DentaBook Administrator',adminEmail,hash]);
        fs.writeFileSync(credentialsPath,`DentaBook local administrator\nWebsite: http://localhost:3000/admin/sign-in\nEmail: ${adminEmail}\nPassword: ${password}\n\nKeep this file private. It is ignored by Git.\n`,{flag:'wx'});
        await client.query('COMMIT');
      } catch(error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
      console.log('Created the requested administrator. Credentials saved in .local/admin-credentials.txt.');
    } else console.log('Kept the existing administrator account and password.');
    console.log('Native PostgreSQL 16 is ready on loopback port 55432. Schema and migrations applied.');
  } finally { await pool.end(); }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
