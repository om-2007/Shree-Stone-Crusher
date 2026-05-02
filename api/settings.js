import { pool, initDb } from './_lib/db';

export default async function handler(req: any, res: any) {
  await initDb();

  if (req.method === 'POST') {
    const { id, name, phone, enableKhataReminders, enableMaintenanceAlerts } = req.body;
    try {
      if (name !== undefined && phone !== undefined) {
        await pool.query(
          "UPDATE owner_profile SET name = $1, phone = $2 WHERE id = $3",
          [name, phone, id]
        );
      }

      if (enableKhataReminders !== undefined || enableMaintenanceAlerts !== undefined) {
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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
