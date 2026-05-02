import { pool, encrypt, initDb } from './_lib/db';

export default async function handler(req: any, res: any) {
  await initDb();

  if (req.method === 'POST') {
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
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await pool.query(`DELETE FROM salaries WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
