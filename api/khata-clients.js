import { pool, initDb } from './_lib/db';

export default async function handler(req: any, res: any) {
  await initDb();

  if (req.method === 'POST') {
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
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await pool.query("DELETE FROM khata_clients WHERE name = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete client' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
