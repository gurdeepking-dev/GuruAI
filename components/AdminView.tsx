
import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storage';
import { logger } from '../services/logger';

// Modular Sub-components
import AdminStyles from './admin/AdminStyles';
import AdminSamples from './admin/AdminSamples';
import AdminTransactions from './admin/AdminTransactions';
import AdminCoupons from './admin/AdminCoupons';
import AdminPayment from './admin/AdminPayment';
import AdminTracking from './admin/AdminTracking';
import AdminActivity from './admin/AdminActivity';
import AdminSecurity from './admin/AdminSecurity';
import AdminKeys from './admin/AdminKeys';

const AdminView: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(storageService.isAdminLoggedIn());
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('styles');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const settings = await storageService.getAdminSettings();
    if (loginForm.username === settings.username && loginForm.password === settings.passwordHash) {
      setIsAuthenticated(true);
      storageService.setAdminLoggedIn(true);
    } else {
      setLoginError('Invalid credentials');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 sm:p-10 bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl border border-slate-100 text-center">
        <h2 className="text-2xl sm:text-3xl font-black mb-8 text-slate-800 tracking-tighter uppercase">Admin Portal</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="text" placeholder="Username" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-slate-900 transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
          <input type="password" placeholder="Password" className="w-full px-6 py-4 rounded-2xl border border-slate-100 bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-slate-900 transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
          {loginError && <p className="text-red-500 text-[10px] font-black uppercase">{loginError}</p>}
          <button className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl uppercase tracking-widest text-[11px] active:scale-95 transition-all">Unlock Panel</button>
        </form>
      </div>
    );
  }

  const tabs = [
    { id: 'styles', label: 'Styles', icon: '🎨' },
    { id: 'samples', label: 'Cinema', icon: '🎬' },
    { id: 'keys', label: 'API Keys', icon: '🔑' },
    { id: 'tx', label: 'History', icon: '📜' },
    { id: 'coupons', label: 'Coupons', icon: '🏷️' },
    { id: 'payment', label: 'Pricing', icon: '💳' },
    { id: 'tracking', label: 'Pixel', icon: '📊' },
    { id: 'activities', label: 'Logs', icon: '🔍' },
    { id: 'security', label: 'Security', icon: '🔒' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-10 pb-20 px-2 sm:px-4">
      <div className="sticky top-24 z-[60] w-full">
        <div className="flex bg-white/90 backdrop-blur-md p-1.5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl overflow-x-auto scrollbar-hide no-scrollbar touch-pan-x">
          <div className="flex gap-1 min-w-max">
            {tabs.map((t) => (
              <button 
                key={t.id} 
                onClick={() => setActiveTab(t.id)} 
                className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-2 flex-shrink-0 ${activeTab === t.id ? 'bg-slate-900 text-white shadow-lg scale-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[60vh]">
        {activeTab === 'styles' && <AdminStyles />}
        {activeTab === 'samples' && <AdminSamples />}
        {activeTab === 'keys' && <AdminKeys />}
        {activeTab === 'tx' && <AdminTransactions />}
        {activeTab === 'coupons' && <AdminCoupons />}
        {activeTab === 'payment' && <AdminPayment />}
        {activeTab === 'tracking' && <AdminTracking />}
        {activeTab === 'activities' && <AdminActivity />}
        {activeTab === 'security' && <AdminSecurity />}
      </div>
    </div>
  );
};

export default AdminView;
