import { pool, initDb } from './_lib/db';

export default async function handler(req, res) {
  await initDb();

  if (req.method === 'GET') {
    try {
      const system_state = await pool.query("SELECT * FROM system_state");
      const isDayStarted = system_state.rows.find((r) => r.key === 'isDayStarted')?.value === 'true';
      res.json({ isDayStarted });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  } else if (req.method === 'POST') {
    const { key, value } = req.body;
    try {
      const updateResult = await pool.query(
        "UPDATE system_state SET value = $1 WHERE key = $2",
        [value.toString(), key]
      );

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
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
