import React, { useState, useEffect } from 'react';
import { User as UserIcon, Bell, ShieldCheck, ToggleLeft, ToggleRight, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { NotificationSettings, User } from '../types';

interface SettingsContentProps {
  user: User;
  settings: NotificationSettings;
  onSettingsChange: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  onProfileUpdate: (userData: { id: string, name: string, phone: string, role: string }) => Promise<void>;
}

export default function SettingsContent({ user, settings, onSettingsChange, onProfileUpdate }: SettingsContentProps) {
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'notifications'>('profile');
  const [profileName, setProfileName] = useState(user.name);
  const [profilePhone, setProfilePhone] = useState(user.phone || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setProfileName(user.name);
    setProfilePhone(user.phone || '');
  }, [user]);

  const toggleSetting = async (key: keyof NotificationSettings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key]
    };
    onSettingsChange(newSettings);
    // Auto-sync notification toggles if you want immediate persistence, 
    // or keep it in handleSave. Usually immediate is better for toggles.
    await onProfileUpdate({
      id: user.id,
      name: profileName,
      phone: profilePhone,
      role: user.role,
      ...newSettings
    } as any);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeSubTab === 'profile') {
        await onProfileUpdate({
          id: user.id,
          name: profileName,
          phone: profilePhone,
          role: user.role,
          ...settings
        } as any);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-text-main">System Settings</h2>
        <p className="text-sm text-text-muted mt-1">Configure your personal and organizational preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-2">
          {[
            { id: 'profile', label: 'Identity & Profile', icon: UserIcon },
            ...(user.role === 'OWNER' ? [{ id: 'notifications', label: 'Push Notifications', icon: Bell }] : []),
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id as any)}
              className={cn(
                "w-full flex items-center px-4 py-3 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                activeSubTab === item.id 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-text-muted hover:bg-bg-surface hover:text-text-main border border-transparent hover:border-border-subtle"
              )}
            >
              <item.icon className="h-4 w-4 mr-3" />
              {item.label}
            </button>
          ))}
        </div>

        <div className="md:col-span-2 space-y-6">
          {activeSubTab === 'profile' ? (
            <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-6">
              <h3 className="text-sm font-bold text-text-main uppercase tracking-widest mb-6 flex items-center">
                <UserIcon className="h-4 w-4 mr-2 text-primary" /> Personal Identity
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Full Name</label>
                    <input 
                      type="text" value={profileName} onChange={e => setProfileName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-text-muted uppercase">Primary Contact</label>
                    <input 
                      type="text" value={profilePhone} onChange={e => setProfilePhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-text-muted uppercase">Designation Role</label>
                  <div className="px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-primary uppercase tracking-widest">
                    {user.role === 'OWNER' ? 'Administrative Owner' : 'Assistant Staff'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            user.role === 'OWNER' && (
            <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-6">
              <h3 className="text-sm font-bold text-text-main uppercase tracking-widest mb-6 flex items-center">
                <Bell className="h-4 w-4 mr-2 text-primary" /> Notification Triggers
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-bg-surface rounded-xl border border-border-subtle flex items-center justify-between group cursor-pointer"
                  onClick={() => toggleSetting('enableKhataReminders')}>
                  <div className="flex-1">
                    <p className="text-xs font-black text-text-main uppercase tracking-tight">Khata Payment Collection</p>
                    <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                      Reminders for 15-day timeline limits and upcoming collections (3-day buffers).
                    </p>
                  </div>
                  <button className="ml-4 transition-colors">
                    {settings.enableKhataReminders ? (
                      <ToggleRight className="h-8 w-8 text-primary" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-text-muted" />
                    )}
                  </button>
                </div>

                <div className="p-4 bg-bg-surface rounded-xl border border-border-subtle flex items-center justify-between group cursor-pointer"
                  onClick={() => toggleSetting('enableMaintenanceAlerts')}>
                  <div className="flex-1">
                    <p className="text-xs font-black text-text-main uppercase tracking-tight">Maintenance Schedule logs</p>
                    <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
                      Alerts when new maintenance tasks are logged by assistants.
                    </p>
                  </div>
                  <button className="ml-4 transition-colors">
                    {settings.enableMaintenanceAlerts ? (
                      <ToggleRight className="h-8 w-8 text-primary" />
                    ) : (
                      <ToggleLeft className="h-8 w-8 text-text-muted" />
                    )}
                  </button>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 flex items-start space-x-3">
                  <ShieldCheck className="h-4 w-4 text-primary mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Security Note</p>
                    <p className="text-[10px] text-text-muted mt-1 leading-normal italic">
                      Notifications are processed securely. Financial amounts are only visible in owner-tier alerts.
                    </p>
                  </div>
                  {("Notification" in window) && Notification.permission !== 'granted' && (
                    <button 
                      onClick={() => Notification.requestPermission().then(r => window.location.reload())}
                      className="px-3 py-1 bg-primary text-white text-[9px] font-black uppercase rounded-lg shadow-md"
                    >
                      Enable Browser Alerts
                    </button>
                  )}
                </div>
              </div>
            </div>
            )
          )}

          <div className="flex justify-end pt-4">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-primary text-white font-bold uppercase tracking-[0.2em] text-[10px] rounded-lg shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
