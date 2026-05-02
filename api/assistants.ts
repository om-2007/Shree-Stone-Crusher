import { pool, initDb } from './_lib/db.js';

export default async function handler(req, res) {
  await initDb();

  if (req.method === 'POST') {
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
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await pool.query("DELETE FROM assistants WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete assistant' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
