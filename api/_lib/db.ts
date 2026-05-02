import pg from 'pg';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

let poolInstance: pg.Pool | null = null;

export function getDatabaseConfigError() {
  if (!process.env.DATABASE_URL) {
    return 'DATABASE_URL is not configured on the server';
  }
  return null;
}

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
}

export function getPool() {
  const configError = getDatabaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  if (!poolInstance) {
    try {
      poolInstance = createPool();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize database connection';
      throw new Error(`Database configuration error: ${message}`);
    }
  }

  return poolInstance;
}

export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop, receiver) {
    return Reflect.get(getPool() as object, prop, receiver);
  }
}) as pg.Pool;

const CRYPTO_SECRET = process.env.CRYPTO_SECRET || 'fallback_secret_for_dev_only';

export const encrypt = (text: any) => {
  if (text === undefined || text === null) return '';
  return CryptoJS.AES.encrypt(text.toString(), CRYPTO_SECRET).toString();
};

export const decrypt = (ciphertext: string) => {
  if (!ciphertext) return '0';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, CRYPTO_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8) || '0';
  } catch (e) {
    return '0';
  }
};

export async function initDb() {
  await pool.query(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    vehicleNumber TEXT,
    customerName TEXT,
    customerType TEXT,
    material TEXT,
    brass TEXT,
    rate TEXT,
    amount TEXT,
    paidAmount TEXT,
    status TEXT,
    date TEXT,
    addedBy TEXT,
    addedById TEXT
  )`);

  const tables = [
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS vehicleNumber TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customerName TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS customerType TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS material TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS brass TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS rate TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS paidAmount TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS addedBy TEXT`,
    `ALTER TABLE customers ADD COLUMN IF NOT EXISTS addedById TEXT`
  ];

  for (const query of tables) {
    try { await pool.query(query); } catch (e) {}
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS maintenance (
    id TEXT PRIMARY KEY, type TEXT, description TEXT, amount TEXT, date TEXT, addedBy TEXT, addedById TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS salaries (
    id TEXT PRIMARY KEY, workerName TEXT, role TEXT, amount TEXT, month TEXT, date TEXT, addedBy TEXT, addedById TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS khata_payments (
    id TEXT PRIMARY KEY, customerName TEXT, amount TEXT, paymentMethod TEXT, description TEXT, date TEXT, addedBy TEXT, addedById TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS khata_logs (
    id TEXT PRIMARY KEY, customerName TEXT, amount TEXT, date TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS assistants (
    id TEXT PRIMARY KEY, name TEXT, phone TEXT, password TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS system_state (
    key TEXT PRIMARY KEY, value TEXT
  )`);

  const stateCheck = await pool.query("SELECT * FROM system_state WHERE key = 'isDayStarted'");
  if (stateCheck.rows.length === 0) {
    await pool.query("INSERT INTO system_state (key, value) VALUES ('isDayStarted', 'false')");
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS owner_profile (
    id TEXT PRIMARY KEY, name TEXT, phone TEXT, password TEXT,
    enableKhataReminders BOOLEAN DEFAULT TRUE, enableMaintenanceAlerts BOOLEAN DEFAULT TRUE
  )`);

  const owner = await pool.query("SELECT * FROM owner_profile");
  if (owner.rows.length === 0) {
    await pool.query("INSERT INTO owner_profile (id, name, phone, password) VALUES ($1, $2, $3, $4)", ['owner-1', 'ADMIN OWNER', '0000000000', '123456']);
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS customer_rates (
    id TEXT PRIMARY KEY, customerName TEXT, material TEXT, rate TEXT
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS khata_clients (
    id TEXT PRIMARY KEY, name TEXT
  )`);
}

export async function safeInitDb() {
  getPool();
  await initDb();
}
