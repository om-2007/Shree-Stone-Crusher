import { pool, initDb } from '../_lib/db';

// Check if current IST time is within business hours (6 AM - 9 PM)
function isBusinessHoursIST() {
  const now = new Date();
  const istTime = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
  const istHour = istTime.getUTCHours();
  const istMinute = istTime.getUTCMinutes();
  const currentTime = istHour + istMinute / 60;
  return currentTime >= 6.0 && currentTime < 21.0;
}

async function autoUpdateDayStatus() {
  try {
    const shouldBeStarted = isBusinessHoursIST();
    const systemState = await pool.query("SELECT value FROM system_state WHERE key = 'isDayStarted'");
    const currentStatus = systemState.rows.length > 0 && systemState.rows[0].value === 'true';

    if (shouldBeStarted !== currentStatus) {
      await pool.query(
        "UPDATE system_state SET value = $1 WHERE key = 'isDayStarted'",
        [shouldBeStarted.toString()]
      );
      console.log(`Auto-updated isDayStarted to ${shouldBeStarted}`);
    }
  } catch (err) {
    console.error('Failed to auto-update day status:', err);
  }
}

export default async function handler(req, res) {
  await initDb();
  await autoUpdateDayStatus();
  res.json({ success: true });
}
