import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  }
});

const CRYPTO_SECRET = process.env.CRYPTO_SECRET || 'fallback_secret_for_dev_only';

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
  
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN vehicleNumber TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN customerName TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN customerType TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN material TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN brass TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN rate TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN paidAmount TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN status TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN addedBy TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customers ADD COLUMN addedById TEXT`);
  } catch (e) {}
  
  await pool.query(`CREATE TABLE IF NOT EXISTS maintenance (
    id TEXT PRIMARY KEY,
    type TEXT,
    description TEXT,
    amount TEXT,
    date TEXT,
    addedBy TEXT,
    addedById TEXT
  )`);
  
  try {
    await pool.query(`ALTER TABLE maintenance ADD COLUMN type TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE maintenance ADD COLUMN addedBy TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE maintenance ADD COLUMN addedById TEXT`);
  } catch (e) {}
  
  await pool.query(`CREATE TABLE IF NOT EXISTS salaries (
    id TEXT PRIMARY KEY,
    workerName TEXT,
    role TEXT,
    amount TEXT,
    month TEXT,
    date TEXT,
    addedBy TEXT,
    addedById TEXT
  )`);
  
  try {
    await pool.query(`ALTER TABLE salaries ADD COLUMN workerName TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE salaries ADD COLUMN role TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE salaries ADD COLUMN month TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE salaries ADD COLUMN addedBy TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE salaries ADD COLUMN addedById TEXT`);
  } catch (e) {}
  
  await pool.query(`CREATE TABLE IF NOT EXISTS khata_payments (
    id TEXT PRIMARY KEY,
    customerName TEXT,
    amount TEXT,
    paymentMethod TEXT,
    description TEXT,
    date TEXT,
    addedBy TEXT,
    addedById TEXT
  )`);
  
  try {
    await pool.query(`ALTER TABLE khata_payments ADD COLUMN customerName TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE khata_payments ADD COLUMN paymentMethod TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE khata_payments ADD COLUMN description TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE khata_payments ADD COLUMN addedBy TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE khata_payments ADD COLUMN addedById TEXT`);
  } catch (e) {}
  
  await pool.query(`CREATE TABLE IF NOT EXISTS assistants (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    password TEXT
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS system_state (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);

  const stateCheck = await pool.query("SELECT * FROM system_state WHERE key = 'isDayStarted'");
  if (stateCheck.rows.length === 0) {
    await pool.query("INSERT INTO system_state (key, value) VALUES ('isDayStarted', 'false')");
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS owner_profile (
    id TEXT PRIMARY KEY,
    name TEXT,
    phone TEXT,
    enableKhataReminders BOOLEAN DEFAULT TRUE,
    enableMaintenanceAlerts BOOLEAN DEFAULT TRUE
  )`);

  try {
    await pool.query(`ALTER TABLE owner_profile ADD COLUMN enableKhataReminders BOOLEAN DEFAULT TRUE`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE owner_profile ADD COLUMN enableMaintenanceAlerts BOOLEAN DEFAULT TRUE`);
  } catch (e) {}

  const owner = await pool.query("SELECT * FROM owner_profile");
  if (owner.rows.length === 0) {
    await pool.query("INSERT INTO owner_profile (id, name, phone, password) VALUES ($1, $2, $3, $4)", ['owner-1', 'ADMIN OWNER', '0000000000', '123456']);
  }

  try {
    await pool.query(`ALTER TABLE assistants ADD COLUMN phone TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE assistants ADD COLUMN password TEXT`);
  } catch (e) {}
  
  await pool.query(`CREATE TABLE IF NOT EXISTS customer_rates (
    id TEXT PRIMARY KEY,
    customerName TEXT,
    material TEXT,
    rate TEXT
  )`);
  
  try {
    await pool.query(`ALTER TABLE customer_rates ADD COLUMN customerName TEXT`);
  } catch (e) {}
  try {
    await pool.query(`ALTER TABLE customer_rates ADD COLUMN material TEXT`);
  } catch (e) {}
  
  await pool.query(`CREATE TABLE IF NOT EXISTS khata_clients (
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

  app.get('/api/data', async (req, res) => {
    try {
      const customers = await pool.query("SELECT * FROM customers");
      const maintenance = await pool.query("SELECT * FROM maintenance");
      const salaries = await pool.query("SELECT * FROM salaries");
      const khata_payments_result = await pool.query("SELECT * FROM khata_logs").catch(async (err) => {
        console.log('khata_logs query error:', err.message);
        await pool.query(`CREATE TABLE IF NOT EXISTS khata_logs (id TEXT PRIMARY KEY, customerName TEXT, amount TEXT, date TEXT)`);
        return { rows: [] };
      });
      console.log('Fetched khata_payments:', khata_payments_result.rows?.length || 0);
      const khata_payments = khata_payments_result.rows || [];
      const assistants = await pool.query("SELECT * FROM assistants");
      const customer_rates = await pool.query("SELECT * FROM customer_rates");
      const khata_clients = await pool.query("SELECT * FROM khata_clients");
      const owner_profile = await pool.query("SELECT * FROM owner_profile");
      const system_state = await pool.query("SELECT * FROM system_state");
      const isDayStarted = system_state.rows.find(r => r.key === 'isDayStarted')?.value === 'true';

      const decryptedData = {
        customers: customers.rows.map((c: any) => {
          // PostgreSQL returns lowercase column names
          const veh = c.vehiclenumber || c.customerid || '';
          const custName = c.customername || c.customerid || '';
          const added = c.addedby || c.assistantname || '';
          
          return {
            id: c.id,
            vehicleNumber: veh,
            customerName: custName,
            customerType: c.customertype || 'OTHER',
            material: c.material || '',
            brass: c.brass ? parseFloat(c.brass) : 0,
            rate: c.rate ? parseFloat(c.rate) : 0,
            amount: c.amount ? parseFloat(decrypt(c.amount)) : 0,
            paidAmount: c.paidamount ? parseFloat(decrypt(c.paidamount)) : 0,
            status: c.status || 'PENDING',
            date: c.date,
            addedBy: added,
            addedById: c.addedbyid || ''
          };
        }),
        maintenance: maintenance.rows.map((m: any) => ({
          id: m.id,
          type: m.type || '',
          description: m.description || '',
          amount: m.amount ? parseFloat(decrypt(m.amount)) : 0,
          date: m.date,
          addedBy: m.addedby || '',
          addedById: m.addedbyid || ''
        })),
        salaries: salaries.rows.map((s: any) => ({
          id: s.id,
          workerName: s.workername || '',
          role: s.role || '',
          amount: s.amount ? parseFloat(decrypt(s.amount)) : 0,
          month: s.month || '',
          date: s.date,
          addedBy: s.addedby || '',
          addedById: s.addedbyid || ''
        })),
        khataPayments: khata_payments.map((p: any) => ({
          id: p.id,
          customerName: p.customername || '',
          amount: p.amount ? parseFloat(decrypt(p.amount)) : 0,
          paymentMethod: p.paymentmethod || '',
          description: p.description || '',
          date: p.date,
          addedBy: p.addedby || '',
          addedById: p.addedbyid || ''
        })),
        assistants: assistants.rows,
        customerRates: customer_rates.rows.map((r: any) => ({
          id: r.id,
          customerName: r.customername || '',
          material: r.material || '',
          rate: r.rate ? parseFloat(decrypt(r.rate)) : 0
        })),
        khataClients: khata_clients.rows.map((c: any) => c.name).filter(Boolean),
        ownerProfile: owner_profile.rows[0],
        notificationSettings: {
          enableKhataReminders: owner_profile.rows[0]?.enablekhatareminders ?? true,
          enableMaintenanceAlerts: owner_profile.rows[0]?.enablemaintenancealerts ?? true
        },
        isDayStarted
      };
      res.json(decryptedData);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/system-state', async (req, res) => {
    const { key, value } = req.body;
    try {
      // First try to update the existing record
      const updateResult = await pool.query(
        "UPDATE system_state SET value = $1 WHERE key = $2",
        [value.toString(), key]
      );
      
      // If no rows were updated, insert a new record
      if (updateResult.rowCount === 0) {
        await pool.query(
          "INSERT INTO system_state (key, value) VALUES ($1, $2)",
          [key, value.toString()]
        );
      }
      
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update system state' });
    }
  });
app.post('/api/settings', async (req, res) => {
  const { id, name, phone, enableKhataReminders, enableMaintenanceAlerts } = req.body;
  try {
    if (name !== undefined && phone !== undefined) {
      await pool.query(
        "UPDATE owner_profile SET name = $1, phone = $2 WHERE id = $3",
        [name, phone, id]
      );
    }

    if (enableKhataReminders !== undefined || enableMaintenanceAlerts !== undefined) {
      // Only update owner settings
      const current = await pool.query("SELECT * FROM owner_profile WHERE id = $1", [id]);
      if (current.rows.length > 0) {
        const khata = enableKhataReminders !== undefined ? enableKhataReminders : current.rows[0].enablekhatareminders;
        const maint = enableMaintenanceAlerts !== undefined ? enableMaintenanceAlerts : current.rows[0].enablemaintenancealerts;
        await pool.query(
          "UPDATE owner_profile SET enableKhataReminders = $1, enableMaintenanceAlerts = $2 WHERE id = $3",
          [khata, maint, id]
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

  app.delete('/api/:collection/:id', async (req, res) => {
    let { collection, id } = req.params;
    
    const tableMap: Record<string, string> = {
      'customers': 'customers',
      'maintenance': 'maintenance',
      'salaries': 'salaries',
      'khata-payments': 'khata_logs',
      'khataPayments': 'khata_logs',
      'assistants': 'assistants',
      'customer-rates': 'customer_rates',
      'customerRates': 'customer_rates',
      'khata-clients': 'khata_clients'
    };

    const tableName = tableMap[collection];
    if (!tableName) return res.status(404).json({ error: 'Collection not found' });

    try {
      if (tableName === 'khata_clients') {
        await pool.query(`DELETE FROM khata_clients WHERE name = $1`, [id]);
      } else {
        await pool.query(`DELETE FROM ${tableName} WHERE id = $1`, [id]);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  });

  app.put('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    const { vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, addedBy, addedById } = req.body;
    if (!vehicleNumber || !customerName) {
      return res.status(400).json({ error: 'Vehicle and customer name required' });
    }
    const date = new Date().toISOString();
    try {
      await pool.query(
        `UPDATE customers SET vehicleNumber = $1, customerName = $2, customerType = $3, material = $4, brass = $5, rate = $6, amount = $7, paidAmount = $8, status = $9, date = $10, addedBy = $11, addedById = $12 WHERE id = $13`,
        [vehicleNumber, customerName, customerType || 'OTHER', material || '', brass || '0', rate || '0', encrypt(amount?.toString() || '0'), encrypt(paidAmount?.toString() || '0'), status || 'PENDING', date, addedBy || '', addedById || '', id]
      );
      res.json({ id, vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, date, addedBy });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  });

  app.post('/api/customers', async (req, res) => {
    const { id, vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, addedBy, addedById } = req.body;
    if (!vehicleNumber || !customerName) {
      return res.status(400).json({ error: 'Vehicle number and customer name are required' });
    }
    const date = new Date().toISOString();
    
    // Only update if explicitly passing updateFlag AND record exists
    const updateFlag = req.body.updateFlag;
    if (id && updateFlag) {
      try {
        await pool.query(
          `UPDATE customers SET vehicleNumber = $1, customerName = $2, customerType = $3, material = $4, brass = $5, rate = $6, amount = $7, paidAmount = $8, status = $9, date = $10, addedBy = $11, addedById = $12 WHERE id = $13`,
          [vehicleNumber, customerName, customerType || 'OTHER', material || '', brass || '0', rate || '0', encrypt(amount?.toString() || '0'), encrypt(paidAmount?.toString() || '0'), status || 'PENDING', date, addedBy || '', addedById || '', id]
        );
        res.json({ id, vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, date, addedBy });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update customer' });
      }
      return;
    }
    
    // Create new record (always create, ignore any id from frontend)
    const newId = Date.now().toString();
    try {
      await pool.query(
        `INSERT INTO customers (id, vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, date, addedBy, addedById) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [newId, vehicleNumber, customerName, customerType || 'OTHER', material || '', brass || '0', rate || '0', encrypt(amount?.toString() || '0'), encrypt(paidAmount?.toString() || '0'), status || 'PENDING', date, addedBy || '', addedById || '']
      );
      res.json({ id: newId, vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, date, addedBy });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save customer' });
    }
  });

   app.post('/api/maintenance', async (req, res) => {
     const { type, description, amount, addedBy, addedById } = req.body;
     if (amount === undefined) return res.status(400).json({ error: 'Amount required' });
     const id = Date.now().toString();
     const date = new Date().toISOString();
     try {
       await pool.query(
         `INSERT INTO maintenance (id, type, description, amount, date, addedBy, addedById) 
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
         [id, type || '', description || '', encrypt(amount.toString()), date, addedBy || '', addedById || '']
       );
       res.json({ id, type, description, amount: parseFloat(amount), date, addedBy, addedById });
     } catch (err) {
       console.error(err);
       res.status(500).json({ error: 'Failed to save maintenance' });
     }
   });

   app.put('/api/maintenance/:id', async (req, res) => {
     const { id } = req.params;
     const { type, description, amount, addedBy, addedById } = req.body;
     
     // Check if the day has ended
     const systemState = await pool.query("SELECT value FROM system_state WHERE key = 'isDayStarted'");
     const isDayStarted = systemState.rows.length > 0 && systemState.rows[0].value === 'true';
     
     if (!isDayStarted) {
       return res.status(403).json({ error: 'Cannot edit maintenance records after the day has ended' });
     }
     
     // Verify that the maintenance record belongs to the assistant making the request
     const maintenanceRecord = await pool.query("SELECT addedById FROM maintenance WHERE id = $1", [id]);
     if (maintenanceRecord.rows.length === 0) {
       return res.status(404).json({ error: 'Maintenance record not found' });
     }
     
     if (maintenanceRecord.rows[0].addedbyid !== addedById) {
       return res.status(403).json({ error: 'Can only edit your own maintenance records' });
     }
     
     if (amount === undefined) return res.status(400).json({ error: 'Amount required' });
     const date = new Date().toISOString();
     
     try {
       await pool.query(
         `UPDATE maintenance SET type = $1, description = $2, amount = $3, date = $4, addedBy = $5, addedById = $6 WHERE id = $7`,
         [type || '', description || '', encrypt(amount.toString()), date, addedBy || '', addedById || '', id]
       );
       res.json({ id, type, description, amount: parseFloat(amount), date, addedBy, addedById });
     } catch (err) {
       console.error(err);
       res.status(500).json({ error: 'Failed to update maintenance' });
     }
   });

   app.post('/api/salaries', async (req, res) => {
    const { workerName, role, amount, month, addedBy, addedById } = req.body;
    if (amount === undefined) return res.status(400).json({ error: 'Amount required' });
    const id = Date.now().toString();
    const date = new Date().toISOString();
    try {
      await pool.query(
        `INSERT INTO salaries (id, workerName, role, amount, month, date, addedBy, addedById) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, workerName || '', role || '', encrypt(amount.toString()), month || '', date, addedBy || '', addedById || '']
      );
      res.json({ id, workerName, role, amount: parseFloat(amount), month, date, addedBy, addedById });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save salary' });
    }
  });

  app.post('/api/khata-payments', async (req, res) => {
    const { customerName, amount } = req.body;
    if (!customerName || amount === undefined) {
      return res.status(400).json({ error: 'Customer name and amount required' });
    }
    const id = Date.now().toString();
    const date = new Date().toISOString();
    try {
      // Create new table with new name
      await pool.query(`
        CREATE TABLE IF NOT EXISTS khata_logs (
          id TEXT PRIMARY KEY,
          customerName TEXT NOT NULL,
          amount TEXT NOT NULL,
          date TEXT NOT NULL
        )
      `);
      
      // Insert data
      await pool.query(
        "INSERT INTO khata_logs (id, customerName, amount, date) VALUES ($1, $2, $3, $4)",
        [id, customerName, encrypt(String(amount)), date]
      );
      
      res.json({ id, customerName, amount: parseFloat(amount), date });
    } catch (err: any) {
      console.error('Insert error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Material Rates (customer_rates table)
  app.post('/api/customer-rates', async (req, res) => {
    const { customerName, material, rate } = req.body;
    if (!customerName || !material) {
      return res.status(400).json({ error: 'Customer name and material required' });
    }
    const id = Date.now().toString();
    try {
      // Check if rate exists for this customer + material
      const existing = await pool.query(
        "SELECT * FROM customer_rates WHERE customerName = $1 AND material = $2",
        [customerName, material]
      );
      if (existing.rows.length > 0) {
        // Update existing
        await pool.query(
          "UPDATE customer_rates SET rate = $1 WHERE customerName = $2 AND material = $3",
          [rate ? encrypt(rate.toString()) : '', customerName, material]
        );
        res.json({ id: existing.rows[0].id, customerName, material, rate: rate || 0 });
      } else {
        // Insert new
        await pool.query(
          "INSERT INTO customer_rates (id, customerName, material, rate) VALUES ($1, $2, $3, $4)",
          [id, customerName, material, rate ? encrypt(rate.toString()) : '']
        );
        res.json({ id, customerName, material, rate: rate || 0 });
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save rate' });
    }
  });

  app.delete('/api/customer-rates/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM customer_rates WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete rate' });
    }
  });

  app.post('/api/assistants', async (req, res) => {
    const { name, phone, password } = req.body;
    const id = Date.now().toString();
    try {
      await pool.query(
        "INSERT INTO assistants (id, name, phone, password) VALUES ($1, $2, $3, $4)", 
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
      await pool.query("INSERT INTO customer_rates (id, customerId, rate) VALUES ($1, $2, $3)", [id, customerId, encrypt(rate)]);
      res.json({ id, customerId, rate: parseFloat(rate) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save rate' });
    }
  });

  app.post('/api/khata-clients', async (req, res) => {
    const { name } = req.body;
    const id = Date.now().toString();
    try {
      const existing = await pool.query("SELECT * FROM khata_clients WHERE name = $1", [name]);
      if (existing.rows.length === 0) {
        await pool.query("INSERT INTO khata_clients (id, name) VALUES ($1, $2)", [id, name]);
      }
      res.json({ name });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save client' });
    }
  });

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
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();