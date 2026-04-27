import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, ReceiptText, Wrench, Search, IndianRupee,
  MapPin, Truck, UserCircle, Layers, CheckCircle2, Save, X, Settings, Lock, Trash2
} from 'lucide-react';
import { AppState, CustomerEntry, MaintenanceEntry, CustomerType } from '../types';
import { formatDate, cn } from '../lib/utils';
import { AnimatePresence } from 'motion/react';
import Modal from './Modal';

interface AssistantDashboardProps {
  state: AppState;
  activeTab: string;
  setCustomers: React.Dispatch<React.SetStateAction<CustomerEntry[]>>;
  setMaintenance: React.Dispatch<React.SetStateAction<MaintenanceEntry[]>>;
  deleteRecord: (collection: string, id: string) => Promise<void>;
  syncProfile: (userData: { id: string, name: string, phone: string, role: string }) => Promise<void>;
}

export default function AssistantDashboard({ 
  state, 
  activeTab, 
  setCustomers, 
  setMaintenance,
  deleteRecord,
  syncProfile
}: AssistantDashboardProps) {
  const [showEntryForm, setShowEntryForm] = useState<'NONE' | 'CUSTOMER' | 'MAINTENANCE'>('NONE');
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'ALL' | CustomerType>('ALL');

  useEffect(() => {
    setSearchTerm('');
    setCustomerTypeFilter('ALL');
  }, [activeTab]);

  const filteredCustomers = useMemo(() => {
    let result = state.customers;

    if (customerTypeFilter !== 'ALL') {
      result = result.filter(c => c.customerType === customerTypeFilter);
    }

    if (!searchTerm) return result;
    const term = searchTerm.toLowerCase();
    return result.filter(c => 
      c.vehicleNumber.toLowerCase().includes(term) ||
      c.customerName.toLowerCase().includes(term) ||
      c.material.toLowerCase().includes(term) ||
      c.date.includes(term) ||
      c.brass.toString().includes(term) ||
      c.rate.toString().includes(term) ||
      c.addedBy.toLowerCase().includes(term)
    );
  }, [state.customers, searchTerm, customerTypeFilter]);

  const filteredMaintenance = useMemo(() => {
    // Only show maintenance records added by this assistant
    const currentUserId = state.currentUser?.id;
    let result = state.maintenance.filter(m => m.addedById === currentUserId);

    if (!searchTerm) return result;
    const term = searchTerm.toLowerCase();
    return result.filter(m => 
      m.type.toLowerCase().includes(term) ||
      m.date.includes(term)
    );
  }, [state.maintenance, searchTerm, state.currentUser?.id]);

  // Form States
  const [custName, setCustName] = useState('');
  const [custType, setCustType] = useState<CustomerType>('OTHER');
  const [vehicle, setVehicle] = useState('');
  const [material, setMaterial] = useState('');
  const [brass, setBrass] = useState('');
  const [asstRate, setAsstRate] = useState('');

  const uniqueKhataCustomers = useMemo(() => 
    Array.from(new Set(state.customerRates.map(r => r.customerName))),
    [state.customerRates]
  );

  const availableKhataMaterials = useMemo(() => 
    state.customerRates
      .filter(r => r.customerName.trim().toUpperCase() === custName.trim().toUpperCase())
      .map(r => r.material),
    [custName, state.customerRates]
  );

  // Auto-detect Regular Customer
  useEffect(() => {
    const isRegular = state.customerRates.some(
      r => r.customerName.trim().toUpperCase() === custName.trim().toUpperCase()
    );
    
    if (isRegular) {
      setCustType('REGULAR');
    } else if (custName.trim().length > 0) {
      setCustType('OTHER');
    }
  }, [custName, state.customerRates]);
  
  const [mType, setMType] = useState('');
  const [mAmount, setMAmount] = useState('');

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalRate = 0;
    if (custType === 'REGULAR') {
      // Check Khata for automatic rate assignment in background
      if (custName.trim() && material.trim()) {
        const match = state.customerRates.find(
          r => r.customerName.trim().toUpperCase() === custName.trim().toUpperCase() &&
               r.material.trim().toUpperCase() === material.trim().toUpperCase()
        );
        if (match) {
          finalRate = match.rate;
        }
      }
    } else {
      // Use the rate entered by assistant for one-time clients
      finalRate = parseFloat(asstRate) || 0;
    }

    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      vehicleNumber: vehicle,
      customerName: custName,
      customerType: custType,
      material: material,
      brass: parseFloat(brass),
      rate: finalRate,
      amount: parseFloat(brass) * finalRate,
      paidAmount: 0,
      status: 'PENDING',
      addedBy: state.currentUser?.name || 'Unknown',
      addedById: state.currentUser?.id || '',
    };
    // Sync to backend
    (setCustomers as any)(newEntry);
    setShowEntryForm('NONE');
    setCustName('');
    setVehicle('');
    setMaterial('');
    setBrass('');
    setAsstRate('');
  };

  const handleAddMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      type: mType,
      amount: parseFloat(mAmount),
      description: '',
      addedBy: state.currentUser?.name || 'Unknown',
      addedById: state.currentUser?.id || '',
    };
    // Sync to backend
    (setMaintenance as any)(newEntry);
    setShowEntryForm('NONE');
    setMType('');
    setMAmount('');
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {!state.isDayStarted && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-warning/10 border border-warning/20 p-4 rounded-xl flex items-center space-x-3 mb-6"
        >
          <div className="bg-warning p-2 rounded-lg">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-text-main uppercase tracking-tight">System Status: Locked</p>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-tighter mt-0.5">Please wait for administration to signal "Day Start" to resume entries.</p>
          </div>
        </motion.div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button 
          onClick={() => state.isDayStarted && setShowEntryForm('CUSTOMER')}
          disabled={!state.isDayStarted}
          className={cn(
            "flex flex-col items-start p-8 rounded-xl text-white shadow-xl transition-all text-left group relative overflow-hidden",
            state.isDayStarted 
              ? "bg-primary shadow-primary/10 hover:scale-[1.01]" 
              : "bg-slate-400 cursor-not-allowed opacity-80"
          )}
        >
          <div className="bg-white/10 p-3 rounded-lg mb-6 group-hover:bg-white/20 transition-colors">
            <ReceiptText className="h-8 w-8" />
          </div>
          <span className="text-xl font-bold tracking-tight">New Billing Entry</span>
          <span className="text-sm opacity-60 mt-1 uppercase font-bold tracking-wider">Log Vehicle & Material Data</span>
          {!state.isDayStarted && <Lock className="absolute top-4 right-4 h-6 w-6 text-white/30" />}
        </button>

        <button 
          onClick={() => state.isDayStarted && setShowEntryForm('MAINTENANCE')}
          disabled={!state.isDayStarted}
          className={cn(
            "flex flex-col items-start p-8 rounded-xl text-white shadow-xl transition-all text-left group relative overflow-hidden",
            state.isDayStarted 
              ? "bg-[#0F172A] hover:scale-[1.01]" 
              : "bg-slate-500 cursor-not-allowed opacity-80"
          )}
        >
          <div className="bg-white/5 p-3 rounded-lg mb-6 group-hover:bg-white/10 transition-colors">
            <Wrench className="h-8 w-8 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight">Maintenance Entry</span>
          <span className="text-sm opacity-50 mt-1 uppercase font-bold tracking-wider">Record Operations & Expenses</span>
          {!state.isDayStarted && <Lock className="absolute top-4 right-4 h-6 w-6 text-white/30" />}
        </button>
      </div>

      <div className="mt-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 px-2">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">Recent Records (Non-Financial)</h3>
          <div className="flex items-center space-x-2">
            <select
              value={customerTypeFilter}
              onChange={(e) => setCustomerTypeFilter(e.target.value as any)}
              className="px-3 py-1.5 bg-white border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none cursor-pointer uppercase tracking-widest"
            >
              <option value="ALL">All</option>
              <option value="REGULAR">Regular</option>
              <option value="OTHER">Others</option>
            </select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input 
                type="text" 
                placeholder="Search records..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full sm:w-64 transition-all"
              />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-surface border-b-2 border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Vehicle Identity</th>
                  <th className="px-6 py-4">Client Entity</th>
                  <th className="px-6 py-4">Material Details</th>
                  <th className="px-6 py-4">Brass</th>
                  <th className="px-6 py-4">Logged By</th>
                  <th className="px-6 py-4 text-center">Verification</th>
                  {state.isDayStarted && <th className="px-6 py-4 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-bg-surface/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-semibold text-text-muted uppercase">{formatDate(c.date)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-bg-surface text-text-main text-[10px] font-bold rounded border border-border-subtle uppercase">
                        {c.vehicleNumber}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-text-main uppercase tracking-tight">{c.customerName}</td>
                    <td className="px-6 py-4 text-xs font-medium text-text-muted uppercase">{c.material}</td>
                    <td className="px-6 py-4 text-xs font-bold text-text-main uppercase">{c.brass} <span className="text-text-muted font-normal">BRS</span></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary border border-primary/20">
                          {(c.addedBy || '').split(' ').map(n => n[0]).join('')}
                        </div>
                        <span className="text-[9px] font-bold text-text-muted uppercase">{c.addedBy}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                    </td>
                    {state.isDayStarted && (
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => deleteRecord('customers', c.id)}
                          className="text-danger hover:text-danger/80 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 px-2">
        <div className={cn(
          "w-2 h-2 rounded-full animate-pulse",
          state.isDayStarted ? "bg-success" : "bg-danger"
        )} />
        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">
          Operational Status: {state.isDayStarted ? 'Online • Main Facility' : 'Strictly Locked • Review Mode Only'}
        </span>
      </div>
      
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {!state.isDayStarted && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-danger/5 border-2 border-dashed border-danger/20 p-8 rounded-2xl flex flex-col items-center text-center space-y-4 mb-8"
                  >
                    <div className="bg-danger p-4 rounded-full shadow-lg shadow-danger/20">
                      <Lock className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-text-main uppercase tracking-tight">Administrative Lockdown</h2>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-tighter mt-1 max-w-md mx-auto leading-relaxed">
                        The business day has not been started. All data entry and modification privileges are currently revoked. Please contact administration to resume logging.
                      </p>
                    </div>
                  </motion.div>
                )}
                {renderDashboard()}
              </div>
            )}
            
            {activeTab === 'customers' && (
              <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-8 text-center">
                <ReceiptText className="h-10 w-10 text-text-muted mx-auto mb-4" />
                <h3 className="text-base font-bold text-text-main uppercase tracking-widest">Client Records</h3>
                <p className="text-text-muted text-xs max-w-xs mx-auto mt-2 mb-6">Assistant view for billing history. Full financial records are restricted.</p>
                
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-8 max-w-lg mx-auto">
                  <select
                    value={customerTypeFilter}
                    onChange={(e) => setCustomerTypeFilter(e.target.value as any)}
                    className="px-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none cursor-pointer uppercase tracking-widest"
                  >
                    <option value="ALL">All Clients</option>
                    <option value="REGULAR">Regular</option>
                    <option value="OTHER">Others</option>
                  </select>
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Filter records..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-bg-surface border-b border-border-subtle text-text-muted text-[10px] font-bold uppercase tracking-widest">
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Vehicle</th>
                        <th className="px-6 py-4">Material</th>
                        <th className="px-6 py-4">Brass</th>
                        <th className="px-6 py-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {filteredCustomers.slice(0, 15).map(c => (
                        <tr key={c.id}>
                          <td className="px-6 py-4 text-xs font-bold text-text-muted">{formatDate(c.date)}</td>
                          <td className="px-6 py-4 text-xs font-bold text-text-main">{c.vehicleNumber}</td>
                          <td className="px-6 py-4 text-xs font-medium text-text-muted uppercase">{c.material}</td>
                          <td className="px-6 py-4 text-xs font-bold text-text-main">{c.brass} <span className="text-text-muted font-normal">BRS</span></td>
                          <td className="px-6 py-4 text-center">
                            <CheckCircle2 className="h-4 w-4 text-success mx-auto" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

              {activeTab === 'maintenance' && (
                <div className="bg-white rounded-xl border border-border-subtle shadow-sm p-8 text-center">
                  <Wrench className="h-10 w-10 text-text-muted mx-auto mb-4" />
                  <h3 className="text-base font-bold text-text-main uppercase tracking-widest">Maintenance Logs</h3>
                  <p className="text-text-muted text-xs max-w-xs mx-auto mt-2 mb-6">View local service logs. Financial expenditure is hidden.</p>
                  
                  <div className="relative max-w-sm mx-auto mb-8">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Filter logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-medium focus:ring-1 focus:ring-primary outline-none w-full"
                    />
                  </div>
  
                  <div className="space-y-3 max-w-md mx-auto">
                     {filteredMaintenance.map(m => (
                       <div key={m.id} className="p-4 bg-bg-surface border border-border-subtle rounded-lg text-left flex justify-between items-center">
                         <div>
                           <p className="text-xs font-bold text-text-main uppercase">{m.type}</p>
                           <p className="text-[10px] text-text-muted font-bold uppercase">{formatDate(m.date)}</p>
                         </div>
                         <div className="flex items-center space-x-3">
                           {state.isDayStarted && (
                             <button 
                               onClick={() => deleteRecord('maintenance', m.id)}
                               className="text-danger hover:text-danger/80 transition-colors"
                             >
                               <Trash2 className="h-4 w-4" />
                             </button>
                           )}
                           <CheckCircle2 className="h-4 w-4 text-success" />
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              )}

              
            </motion.div>
        </AnimatePresence>
      </div>

      {/* Entry Modals */}
      <Modal 
        isOpen={showEntryForm === 'CUSTOMER'} 
        onClose={() => setShowEntryForm('NONE')}
        title="New Billing Entry"
      >
        <form className="space-y-4" onSubmit={handleAddCustomer}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Customer Type</label>
              <select 
                value={custType} onChange={e => setCustType(e.target.value as CustomerType)}
                className="w-full px-4 py-2 bg-bg-surface border border-border-subtle rounded-lg text-xs font-bold text-text-main focus:ring-1 focus:ring-primary outline-none uppercase"
              >
                <option value="REGULAR">Khata Client</option>
                <option value="OTHER">One-Time Client</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Vehicle Number</label>
              <div className="relative">
                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input 
                  type="text" required value={vehicle} onChange={e => setVehicle(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-2 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold uppercase"
                  placeholder="ABC-123-XYZ"
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Customer Name</label>
            <div className="relative">
              <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input 
                type="text" required value={custName} onChange={e => setCustName(e.target.value)}
                list="asst-khata-customers"
                className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold uppercase"
                placeholder="Enter Client Name"
              />
              <datalist id="asst-khata-customers">
                {uniqueKhataCustomers.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Material</label>
              <input 
                type="text" required value={material} onChange={e => setMaterial(e.target.value)}
                list="asst-khata-materials"
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold uppercase"
                placeholder="Type"
              />
              <datalist id="asst-khata-materials">
                {availableKhataMaterials.map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Quantity (BRS)</label>
              <input 
                type="number" step="0.01" required value={brass} onChange={e => setBrass(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold"
                placeholder="0.00"
              />
            </div>
          </div>

          {custType === 'OTHER' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Manual Rate (₹ per BRS)</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input 
                  type="number" required value={asstRate} onChange={e => setAsstRate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-primary outline-none transition-all font-bold"
                  placeholder="Enter Agreed Rate"
                />
              </div>
            </motion.div>
          )}

          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-primary text-white py-3 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all"
            >
              <Save className="h-4 w-4 mr-2" /> Save Transaction
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        isOpen={showEntryForm === 'MAINTENANCE'} 
        onClose={() => setShowEntryForm('NONE')}
        title="Operations Log Entry"
      >
        <form className="space-y-4" onSubmit={handleAddMaintenance}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Entry Type</label>
            <input 
              type="text" required value={mType} onChange={e => setMType(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-[#0F172A] outline-none transition-all font-bold uppercase"
              placeholder="e.g. Fuel Refill"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Amount (₹)</label>
            <p className="text-[9px] text-text-muted font-bold uppercase tracking-tighter opacity-70 mb-1">Confidential: Only visible to administration.</p>
            <input 
              type="number" required value={mAmount} onChange={e => setMAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg-surface border border-border-subtle rounded-lg focus:ring-1 focus:ring-[#0F172A] outline-none transition-all font-bold"
              placeholder="0.00"
            />
          </div>
          <div className="pt-4">
            <button 
              type="submit"
              className="w-full bg-[#0F172A] text-white py-3 rounded-lg font-bold uppercase tracking-widest flex items-center justify-center shadow-lg transition-all"
            >
              <Save className="h-4 w-4 mr-2" /> Log Maintenance
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
