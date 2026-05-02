import { pool, encrypt, initDb } from './_lib/db';

export default async function handler(req, res) {
  await initDb();

  if (req.method === 'POST') {
    const { customerName, amount } = req.body;
    if (!customerName || amount === undefined) {
      return res.status(400).json({ error: 'Customer name and amount required' });
    }
    const id = Date.now().toString();
    const date = new Date().toISOString();
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS khata_logs (
          id TEXT PRIMARY KEY, customerName TEXT NOT NULL, amount TEXT NOT NULL, date TEXT NOT NULL
        )
      `);

      await pool.query(
        "INSERT INTO khata_logs (id, customerName, amount, date) VALUES ($1, $2, $3, $4)",
        [id, customerName, encrypt(String(amount)), date]
      );

      res.json({ id, customerName, amount: parseFloat(amount), date });
    } catch (err) {
      console.error('Insert error:', err.message);
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await pool.query(`DELETE FROM khata_logs WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
