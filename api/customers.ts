import { pool, encrypt, initDb } from './_lib/db';

export default async function handler(req: any, res: any) {
  await initDb();

  if (req.method === 'POST') {
    const { id, vehicleNumber, customerName, customerType, material, brass, rate, amount, paidAmount, status, addedBy, addedById, updateFlag } = req.body;

    if (!vehicleNumber || !customerName) {
      return res.status(400).json({ error: 'Vehicle number and customer name are required' });
    }

    const date = new Date().toISOString();

    // If updateFlag is true, update existing record
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

    // Otherwise create new record
    const newId = id || Date.now().toString();
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
  } else if (req.method === 'DELETE') {
    const { id } = req.query;
    try {
      await pool.query(`DELETE FROM customers WHERE id = $1`, [id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete record' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
