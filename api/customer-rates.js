import { pool, encrypt, initDb } from './_lib/db';

export default async function handler(req: any, res: any) {
  await initDb();

  if (req.method === 'POST') {
    const { customerName, material, rate } = req.body;
    if (!customerName || !material) {
      return res.status(400).json({ error: 'Customer name and material required' });
    }
    const id = Date.now().toString();
    try {
      const existing = await pool.query(
        "SELECT * FROM customer_rates WHERE customerName = $1 AND material = $2",
        [customerName, material]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          "UPDATE customer_rates SET rate = $1 WHERE customerName = $2 AND material = $3",
          [rate ? encrypt(rate.toString()) : '', customerName, material]
        );
        res.json({ id: existing.rows[0].id, customerName, material, rate: rate || 0 });
      } else {
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
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await pool.query("DELETE FROM customer_rates WHERE id = $1", [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete rate' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
