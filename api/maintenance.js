import { pool, encrypt, initDb } from './_lib/db';

export default async function handler(req, res) {
  await initDb();

  if (req.method === 'POST') {
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
  } else if (req.method === 'PUT') {
    const { id } = req.query;
    const { type, description, amount, addedBy, addedById } = req.body;

    // Check if the day has ended
    const systemState = await pool.query("SELECT value FROM system_state WHERE key = 'isDayStarted'");
    const isDayStarted = systemState.rows.length > 0 && systemState.rows[0].value === 'true';

    if (!isDayStarted) {
      return res.status(403).json({ error: 'Cannot edit maintenance records after the day has ended' });
    }

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
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await pool.query(`DELETE FROM maintenance WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
