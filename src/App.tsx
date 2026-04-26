import { useState, useMemo, useEffect } from 'react';
import { User, AppState, UserRole, CustomerRate } from './types';
import { MOCK_OWNER, MOCK_ASSISTANTS, MOCK_CUSTOMERS, MOCK_MAINTENANCE, MOCK_SALARIES, MOCK_CUSTOMER_RATES, MOCK_KHATA_CLIENTS, MOCK_KHATA_PAYMENTS } from './mockData';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import OwnerDashboard from './components/OwnerDashboard';
import AssistantDashboard from './components/AssistantDashboard';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // App state
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS);
  const [maintenance, setMaintenance] = useState(MOCK_MAINTENANCE);
  const [salaries, setSalaries] = useState(MOCK_SALARIES);
  const [assistants, setAssistants] = useState(MOCK_ASSISTANTS);
  const [customerRates, setCustomerRates] = useState(MOCK_CUSTOMER_RATES);
  const [khataClients, setKhataClients] = useState(MOCK_KHATA_CLIENTS);
  const [khataPayments, setKhataPayments] = useState(MOCK_KHATA_PAYMENTS);
  const [isDayStarted, setIsDayStarted] = useState(false);
  const [readNotifications, setReadNotifications] = useState<string[]>([]);
  const [nativeNotifiedIds, setNativeNotifiedIds] = useState<string[]>([]);
  const [notificationSettings, setNotificationSettings] = useState({
    enableKhataReminders: true,
    enableMaintenanceAlerts: true,
  });

  // Auto-generate notifications based on data
  const notifications = useMemo(() => {
    const alerts: any[] = [];

    if (!notificationSettings.enableKhataReminders) return [];

    const today = new Date();
    
    // Check Khata Clients for 15-day rule
    khataClients.forEach(client => {
      const clientTx = customers.filter(c => c.customerName === client && c.customerType === 'REGULAR');
      if (clientTx.length === 0) return;

      // Find the oldest record that remains unpaid
      const clientPayments = khataPayments.filter(p => p.customerName === client).reduce((sum, p) => sum + p.amount, 0);
      const clientTotal = clientTx.reduce((sum, c) => sum + c.amount, 0);
      const balance = clientTotal - clientPayments;

      if (balance > 100) { // Significant balance
        const oldestTx = [...clientTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
        const txDate = new Date(oldestTx.date);
        const diffTime = Math.abs(today.getTime() - txDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 15) {
          alerts.push({
            id: `overdue-${client}`,
            title: 'Payment Overdue!',
            message: `${client}'s 15-day timeline exceeded. Collect ₹${balance.toLocaleString('en-IN')}.`,
            type: 'DANGER',
            date: new Date().toISOString(),
          });
        } else if (diffDays >= 12) {
          alerts.push({
            id: `reminder-${client}`,
            title: 'Upcoming Payment',
            message: `${client} has ${15 - diffDays} days remaining to settle ₹${balance.toLocaleString('en-IN')}.`,
            type: 'WARNING',
            date: new Date().toISOString(),
          });
        }
      }
    });

    // Maintenance Alerts
    if (notificationSettings.enableMaintenanceAlerts) {
      maintenance.forEach(m => {
        const mDate = new Date(m.date);
        const isRecent = Math.abs(today.getTime() - mDate.getTime()) < (1000 * 60 * 60 * 24 * 2); // Within 2 days
        if (isRecent) {
          alerts.push({
            id: `maint-${m.id}`,
            title: 'Maintenance Logged',
            message: `New ${m.type} service record detected. Check logs for details.`,
            type: 'INFO',
            date: m.date,
          });
        }
      });
    }

    return alerts.map(a => ({
      ...a,
      isRead: readNotifications.includes(a.id)
    }));
  }, [customers, khataClients, khataPayments, readNotifications, maintenance, notificationSettings]);

  const markNotificationAsRead = (id: string) => {
    setReadNotifications(prev => [...prev, id]);
  };

  // Native Push Notifications Logic
  useEffect(() => {
    if (currentUser?.role !== 'OWNER' || !("Notification" in window)) return;

    if (Notification.permission === 'granted') {
      const unreadAlerts = notifications.filter(n => !n.isRead && !nativeNotifiedIds.includes(n.id));
      if (unreadAlerts.length > 0) {
        unreadAlerts.forEach(alert => {
          try {
            const n = new Notification(alert.title, {
              body: alert.message,
              tag: alert.id,
              renotify: true
            });
            n.onclick = () => {
              window.focus();
              setActiveTab('dashboard');
            };
          } catch (e) {
            console.error('Notification error:', e);
          }
        });
        setNativeNotifiedIds(prev => [...prev, ...unreadAlerts.map(a => a.id)]);
      }
    }
  }, [notifications, currentUser, nativeNotifiedIds]);

  const handleLogin = (name: string, role: UserRole) => {
    if (role === 'OWNER') {
      setCurrentUser(MOCK_OWNER);
    } else {
      const assistant = MOCK_ASSISTANTS.find(a => a.name === name);
      setCurrentUser(assistant || MOCK_ASSISTANTS[0]);
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const appState: AppState = {
    currentUser,
    customers,
    maintenance,
    salaries,
    assistants,
    customerRates,
    khataClients,
    khataPayments,
    notifications,
    notificationSettings,
    isDayStarted,
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Layout 
      user={currentUser} 
      onLogout={handleLogout}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      notifications={notifications}
      markNotificationAsRead={markNotificationAsRead}
    >
      {currentUser.role === 'OWNER' ? (
        <OwnerDashboard 
          state={appState} 
          setIsDayStarted={setIsDayStarted}
          activeTab={activeTab}
          setCustomers={setCustomers}
          setMaintenance={setMaintenance}
          setSalaries={setSalaries}
          setAssistants={setAssistants}
          setCustomerRates={setCustomerRates}
          setKhataClients={setKhataClients}
          setKhataPayments={setKhataPayments}
          setNotificationSettings={setNotificationSettings}
        />
      ) : (
        <AssistantDashboard 
          state={appState} 
          activeTab={activeTab}
          setCustomers={setCustomers}
          setMaintenance={setMaintenance}
        />
      )}
    </Layout>
  );
}
