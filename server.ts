import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, 'database.sqlite');
const sqliteDb = new sqlite3.Database(dbFile);
const run = promisify(sqliteDb.run.bind(sqliteDb));
const all = promisify(sqliteDb.all.bind(sqliteDb));

const CRYPTO_SECRET = process.env.CRYPTO_SECRET || 'fallback_secret_for_dev_only';

// Encryption Helper with safety
const encrypt = (text: any) => {
  if (text === undefined || text === null) return '';
  return CryptoJS.AES.encrypt(text.toString(), CRYPTO_SECRET).toString();
};

const decrypt = (ciphertext: string) => {
  if (!ciphertext) return '0';
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, CRYPTO_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8) || '0';
  } catch (e) {
    return '0';
  }
};

async function initDb() {
  await run(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    assistantName TEXT,
    amount TEXT,
    date TEXT
  )`);
  
  await run(`CREATE TABLE IF NOT EXISTS maintenance (
    id TEXT PRIMARY KEY,
    description TEXT,
    amount TEXT,
    date TEXT
  )`);
  
  await run(`CREATE TABLE IF NOT EXISTS salaries (
    id TEXT PRIMARY KEY,
    assistantId TEXT,
    amount TEXT,
    date TEXT
  )`);
  
  await run(`CREATE TABLE IF NOT EXISTS khata_payments (
    id TEXT PRIMARY KEY,
    clientId TEXT,
    amount TEXT,
    date TEXT
  )`);
  
  await run(`CREATE TABLE IF NOT EXISTS assistants (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    password TEXT
  )`);
  
  await run(`CREATE TABLE IF NOT EXISTS owner_profile (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    password TEXT
  )`);

  // Initialize owner if not exists
  const owner = await all("SELECT * FROM owner_profile");
  if (owner.length === 0) {
    await run("INSERT INTO owner_profile (id, name, phone, password) VALUES (?, ?, ?, ?)", ['owner-1', 'Kiran Chavan', '+91 9876543210', '123456']);
  }
  
  // Safely add columns if they don't exist (handle legacy DB)
  try {
    await run(`ALTER TABLE assistants ADD COLUMN phone TEXT`);
  } catch (e) {
    // Column might already exist
  }
  try {
    await run(`ALTER TABLE assistants ADD COLUMN password TEXT`);
  } catch (e) {
    // Column might already exist
  }
  
  await run(`CREATE TABLE IF NOT EXISTS customer_rates (
    id TEXT PRIMARY KEY,
    customerId TEXT,
    rate TEXT
  )`);
  
  await run(`CREATE TABLE IF NOT EXISTS khata_clients (
    id TEXT PRIMARY KEY,
    name TEXT
  )`);
}

async function startServer() {
  try {
    await initDb();
  } catch (err) {
    console.error('Database initialization failed:', err);
  }
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get('/api/data', async (req, res) => {
    try {
      const customers = await all("SELECT * FROM customers");
      const maintenance = await all("SELECT * FROM maintenance");
      const salaries = await all("SELECT * FROM salaries");
      const khata_payments = await all("SELECT * FROM khata_payments");
      const assistants = await all("SELECT * FROM assistants");
      const customer_rates = await all("SELECT * FROM customer_rates");
      const khata_clients = await all("SELECT * FROM khata_clients");
      const owner_profile = await all("SELECT * FROM owner_profile");

      const decryptedData = {
        customers: customers.map((c: any) => ({ ...c, amount: parseFloat(decrypt(c.amount)) })),
        maintenance: maintenance.map((m: any) => ({ ...m, amount: parseFloat(decrypt(m.amount)) })),
        salaries: salaries.map((s: any) => ({ ...s, amount: parseFloat(decrypt(s.amount)) })),
        khataPayments: khata_payments.map((p: any) => ({ ...p, amount: parseFloat(decrypt(p.amount)) })),
        assistants,
        customerRates: customer_rates.map((r: any) => ({ ...r, rate: parseFloat(decrypt(r.rate)) })),
        khataClients: khata_clients.map((c: any) => c.name),
        ownerProfile: owner_profile[0]
      };
      res.json(decryptedData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/profile/update', async (req, res) => {
    const { id, name, phone, role } = req.body;
    try {
      if (role === 'OWNER') {
        await run("UPDATE owner_profile SET name = ?, phone = ? WHERE id = ?", [name, phone, id]);
      } else {
        await run("UPDATE assistants SET name = ?, phone = ? WHERE id = ?", [name, phone, id]);
      }
      res.json({ success: true, name, phone });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  app.delete('/api/:collection/:id', async (req, res) => {
    let { collection, id } = req.params;
    
    // Mapping kebab-case used in API calls to SQL table names
    const tableMap: Record<string, string> = {
      'customers': 'customers',
      'maintenance': 'maintenance',
      'salaries': 'salaries',
      'khata-payments': 'khata_payments',
      'assistants': 'assistants',
      'customer-rates': 'customer_rates',
      'khata-clients': 'khata_clients'
    };

    const tableName = tableMap[collection];
    if (!tableName) return res.status(404).json({ error: 'Collection not found' });

    try {
      // For khata-clients, we might be deleting by name if the frontend sends name as ID
      // But looking at the original code, it was filtering by name if it's a string array.
      // Let's stick to ID if provided, or name if it's khata-clients.
      if (tableName === 'khata_clients') {
        await run(`DELETE FROM khata_clients WHERE name = ?`, [id]);
      } else {
        await run(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  });

  app.post('/api/customers', async (req, res) => {
    const { customerId, assistantName, amount } = req.body;
    if (amount === undefined) return res.status(400).json({ error: 'Amount required' });
    const id = Date.now().toString();
    const date = new Date().toISOString();
    try {
      await run(
        "INSERT INTO customers (id, customerId, assistantName, amount, date) VALUES (?, ?, ?, ?, ?)",
        [id, customerId, assistantName, encrypt(amount), date]
      );
      res.json({ id, customerId, assistantName, amount: parseFloat(amount), date });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save customer' });
    }
  });

  app.post('/api/maintenance', async (req, res) => {
    const { description, amount } = req.body;
    if (amount === undefined) return res.status(400).json({ error: 'Amount required' });
    const id = Date.now().toString();
    const date = new Date().toISOString();
    try {
      await run(
        "INSERT INTO maintenance (id, description, amount, date) VALUES (?, ?, ?, ?)",
        [id, description, encrypt(amount), date]
      );
      res.json({ id, description, amount: parseFloat(amount), date });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save maintenance' });
    }
  });

  app.post('/api/salaries', async (req, res) => {
    const { assistantId, amount } = req.body;
    if (amount === undefined) return res.status(400).json({ error: 'Amount required' });
    const id = Date.now().toString();
    const date = new Date().toISOString();
    try {
      await run(
        "INSERT INTO salaries (id, assistantId, amount, date) VALUES (?, ?, ?, ?)",
        [id, assistantId, encrypt(amount), date]
      );
      res.json({ id, assistantId, amount: parseFloat(amount), date });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save salary' });
    }
  });

  app.post('/api/khata-payments', async (req, res) => {
    const { clientId, amount } = req.body;
    if (amount === undefined) return res.status(400).json({ error: 'Amount required' });
    const id = Date.now().toString();
    const date = new Date().toISOString();
    try {
      await run(
        "INSERT INTO khata_payments (id, clientId, amount, date) VALUES (?, ?, ?, ?)",
        [id, clientId, encrypt(amount), date]
      );
      res.json({ id, clientId, amount: parseFloat(amount), date });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save payment' });
    }
  });

  app.post('/api/assistants', async (req, res) => {
    const { name, phone, password } = req.body;
    const id = Date.now().toString();
    try {
      await run(
        "INSERT INTO assistants (id, name, phone, password) VALUES (?, ?, ?, ?)", 
        [id, name, phone || '', password || '123456']
      );
      res.json({ id, name, phone, password });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save assistant' });
    }
  });

  app.post('/api/customer-rates', async (req, res) => {
    const { customerId, rate } = req.body;
    if (rate === undefined) return res.status(400).json({ error: 'Rate required' });
    const id = Date.now().toString();
    try {
      await run("INSERT INTO customer_rates (id, customerId, rate) VALUES (?, ?, ?)", [id, customerId, encrypt(rate)]);
      res.json({ id, customerId, rate: parseFloat(rate) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save rate' });
    }
  });

  app.post('/api/khata-clients', async (req, res) => {
    const { name } = req.body;
    const id = Date.now().toString();
    try {
      // Check if already exists
      const existing = await all("SELECT * FROM khata_clients WHERE name = ?", [name]);
      if (existing.length === 0) {
        await run("INSERT INTO khata_clients (id, name) VALUES (?, ?)", [id, name]);
      }
      res.json({ name });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save client' });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
