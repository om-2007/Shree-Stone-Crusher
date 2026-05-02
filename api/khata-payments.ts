import { pool, encrypt, initDb } from './_lib/db';

export default async function handler(req: any, res: any) {
  await initDb();

  if (req.method === 'POST') {
    const { id, customerName, amount, paymentMethod, description, date, addedBy, addedById } = req.body;
    
    if (!customerName || amount === undefined) {
      return res.status(400).json({ error: 'Customer name and amount required' });
    }

    const newId = id || Date.now().toString();
    const finalDate = date || new Date().toISOString();
    
    try {
      // Use khata_payments table as defined in db.ts
      await pool.query(
        `INSERT INTO khata_payments (id, customerName, amount, paymentMethod, description, date, addedBy, addedById)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
         customerName = $2, amount = $3, paymentMethod = $4, description = $5, date = $6, addedBy = $7, addedById = $8`,
        [newId, customerName, encrypt(amount.toString()), paymentMethod || '', description || '', finalDate, addedBy || '', addedById || '']
      );

      res.json({ id: newId, customerName, amount, paymentMethod, description, date: finalDate, addedBy });
    } catch (err: any) {
      console.error('Insert error:', err.message);
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await pool.query(`DELETE FROM khata_payments WHERE id = $1`, [id]);
      // Also delete from khata_logs for backward compatibility during transition if needed
      await pool.query(`DELETE FROM khata_logs WHERE id = $1`).catch(() => {});
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
