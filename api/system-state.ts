import { pool, safeInitDb } from './_lib/db';

export default async function handler(req, res) {
  try {
    await safeInitDb();

    if (req.method === 'GET') {
      const system_state = await pool.query("SELECT * FROM system_state");
      const isDayStarted = system_state.rows.find((r) => r.key === 'isDayStarted')?.value === 'true';
      return res.json({ isDayStarted });
    } else if (req.method === 'POST') {
      const { key, value } = req.body;
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

      return res.json({ success: true });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to update system state' });
  }
}
