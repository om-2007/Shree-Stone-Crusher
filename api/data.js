import { pool, decrypt, initDb } from './_lib/db';

export default async function handler(req: any, res: any) {
  await initDb();

  // Auto-correct day status on each data fetch
  await autoUpdateDayStatus();

  try {
    const customers = await pool.query("SELECT * FROM customers");
    const maintenance = await pool.query("SELECT * FROM maintenance");
    const salaries = await pool.query("SELECT * FROM salaries");
    const khata_payments_result = await pool.query("SELECT * FROM khata_logs").catch(async (err) => {
      console.log('khata_logs query error:', err.message);
      await pool.query(`CREATE TABLE IF NOT EXISTS khata_logs (id TEXT PRIMARY KEY, customerName TEXT, amount TEXT, date TEXT)`);
      return { rows: [] };
    });
    const khata_payments = khata_payments_result.rows || [];
    const assistants = await pool.query("SELECT * FROM assistants");
    const customer_rates = await pool.query("SELECT * FROM customer_rates");
    const khata_clients = await pool.query("SELECT * FROM khata_clients");
    const owner_profile = await pool.query("SELECT * FROM owner_profile");
    const system_state = await pool.query("SELECT * FROM system_state");
    const isDayStarted = system_state.rows.find((r: any) => r.key === 'isDayStarted')?.value === 'true';

    const decryptedData = {
      customers: customers.rows.map((c: any) => ({
        id: c.id,
        vehicleNumber: c.vehiclenumber || '',
        customerName: c.customername || '',
        customerType: c.customertype || 'OTHER',
        material: c.material || '',
        brass: c.brass ? parseFloat(c.brass) : 0,
        rate: c.rate ? parseFloat(c.rate) : 0,
        amount: c.amount ? parseFloat(decrypt(c.amount)) : 0,
        paidAmount: c.paidamount ? parseFloat(decrypt(c.paidamount)) : 0,
        status: c.status || 'PENDING',
        date: c.date,
        addedBy: c.addedby || '',
        addedById: c.addedbyid || ''
      })),
      maintenance: maintenance.rows.map((m: any) => ({
        id: m.id,
        type: m.type || '',
        description: m.description || '',
        amount: m.amount ? parseFloat(decrypt(m.amount)) : 0,
        date: m.date,
        addedBy: m.addedby || '',
        addedById: m.addedbyid || ''
      })),
      salaries: salaries.rows.map((s: any) => ({
        id: s.id,
        workerName: s.workername || '',
        role: s.role || '',
        amount: s.amount ? parseFloat(decrypt(s.amount)) : 0,
        month: s.month || '',
        date: s.date,
        addedBy: s.addedby || '',
        addedById: s.addedbyid || ''
      })),
      khataPayments: khata_payments.map((p: any) => ({
        id: p.id,
        customerName: p.customername || '',
        amount: p.amount ? parseFloat(decrypt(p.amount)) : 0,
        paymentMethod: p.paymentmethod || '',
        description: p.description || '',
        date: p.date,
        addedBy: p.addedby || '',
        addedById: p.addedbyid || ''
      })),
      assistants: assistants.rows,
      customerRates: customer_rates.rows.map((r: any) => ({
        id: r.id,
        customerName: r.customername || '',
        material: r.material || '',
        rate: r.rate ? parseFloat(decrypt(r.rate)) : 0
      })),
      khataClients: khata_clients.rows.map((c: any) => c.name).filter(Boolean),
      ownerProfile: owner_profile.rows[0],
      notificationSettings: {
        enableKhataReminders: owner_profile.rows[0]?.enablekhatareminders ?? true,
        enableMaintenanceAlerts: owner_profile.rows[0]?.enablemaintenancealerts ?? true
      },
      isDayStarted
    };
    res.json(decryptedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
}

// Check if current IST time is within business hours (6 AM - 9 PM)
function isBusinessHoursIST(): boolean {
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
