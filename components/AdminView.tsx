
import React, { useState, useEffect, useRef } from 'react';
import { StyleTemplate, AdminSettings, Coupon } from '../types';
import { storageService } from '../services/storage';
import { logger } from '../services/logger';
import ActivityLogView from './ActivityLogView';
import { optimizationService, OptimizationLog } from '../services/optimizationService';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

const AdminView: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(storageService.isAdminLoggedIn());
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const [styles, setStyles] = useState<StyleTemplate[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'styles' | 'payment' | 'tracking' | 'activities' | 'security' | 'coupons' | 'optimizer'>('styles');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const [optLogs, setOptLogs] = useState<OptimizationLog[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optConfirming, setOptConfirming] = useState(false);
  const [optStats, setOptStats] = useState({ saved: 0, count: 0 });
  const logEndRef = useRef<HTMLDivElement>(null);

  const [styleForm, setStyleForm] = useState({ 
    id: '', 
    name: '', 
    prompt: '', 
    description: '', 
    image: '', 
    autoGenerate: false,
    displayOrder: 0
  });

  const [securityForm, setSecurityForm] = useState({ newUsername: '', currentPassword: '', newPassword: '' });
  const [couponForm, setCouponForm] = useState({ code: '', type: 'percentage' as 'percentage' | 'fixed', value: 0 });
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [optLogs]);

  const loadData = async (force = false) => {
    setIsLoading(true);
    try {
      const [s, settings] = await Promise.all([
        storageService.getStyles(force),
        storageService.getAdminSettings()
      ]);
      setStyles([...s]);
      setAdminSettings(settings);
      setSecurityForm(prev => ({ ...prev, newUsername: settings.username }));
      if (force) showNotification('Database Refreshed');
    } catch (err) {
      logger.error('Admin', 'Failed to load data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRunOptimizer = async () => {
    if (isOptimizing) return;
    if (!optConfirming) {
      setOptConfirming(true);
      setTimeout(() => setOptConfirming(false), 3000);
      return;
    }
    setOptConfirming(false);
    setIsOptimizing(true);
    setOptLogs([]);
    try {
      const result = await optimizationService.processStyles((newLog) => {
        setOptLogs(prev => [...prev, newLog]);
      });
      setOptStats(result);
      showNotification('Optimization Complete');
      await loadData(true); 
    } catch (err) {
      setOptLogs(prev => [...prev, { message: 'Optimization failed.', type: 'error', timestamp: Date.now() }]);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleExport = async () => {
    const json = await storageService.exportStyles();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `styleswap-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup Downloaded');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          await storageService.importStyles(event.target?.result as string);
          await loadData(true);
          showNotification('Backup Restored');
        } catch (err) {
          alert("Import failed: Invalid file");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const settings = await storageService.getAdminSettings();
    if (loginForm.username === settings.username && loginForm.password === settings.passwordHash) {
      setIsAuthenticated(true);
      storageService.setAdminLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    storageService.setAdminLoggedIn(false);
  };

  const handleSaveStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleForm.name || !styleForm.prompt || !styleForm.image) {
      alert("Please enter Name, Prompt and Image.");
      return;
    }

    setIsLoading(true);
    const isEdit = !!styleForm.id;
    const newStyle: StyleTemplate = {
      id: isEdit ? styleForm.id : Date.now().toString(),
      name: styleForm.name,
      prompt: styleForm.prompt,
      description: styleForm.description,
      imageUrl: styleForm.image,
      autoGenerate: styleForm.autoGenerate,
      displayOrder: isEdit ? styleForm.displayOrder : styles.length
    };

    try {
      await storageService.saveStyle(newStyle);
      await loadData(true);
      setStyleForm({ 
        id: '', 
        name: '', 
        prompt: '', 
        description: '', 
        image: '', 
        autoGenerate: false, 
        displayOrder: 0 
      });
      showNotification('Style Template Saved');
    } catch (err) {
      alert("Failed to save style.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStyle = (id: string) => {
    openConfirm(
      'Delete Style',
      'Are you sure you want to delete this style template?',
      async () => {
        setIsDeleting(id);
        try {
          await storageService.deleteStyle(id);
          await loadData(true);
          showNotification('Style Deleted');
        } catch (err: any) {
          alert(`Delete failed: ${err.message}`);
        } finally {
          setIsDeleting(null);
        }
      }
    );
  };

  const moveStyle = async (index: number, direction: 'up' | 'down') => {
    const newStyles = [...styles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= styles.length) return;

    // Swap items in the local array
    const temp = newStyles[index];
    newStyles[index] = newStyles[targetIndex];
    newStyles[targetIndex] = temp;

    // Fix the displayOrder of all styles based on their new index
    const updatedStyles = newStyles.map((s, idx) => ({ 
      ...s, 
      displayOrder: idx 
    }));

    setStyles(updatedStyles);

    try {
      // Upsert all modified orders
      await Promise.all(updatedStyles.map(s => storageService.saveStyle(s)));
      showNotification('Order Updated');
    } catch (err) {
      logger.error('Admin', 'Failed to move style', err);
      alert("Failed to save new order.");
      await loadData(true);
    }
  };

  const showNotification = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSettings) return;
    if (securityForm.currentPassword !== adminSettings.passwordHash) {
      alert("Current password incorrect");
      return;
    }
    const updatedSettings: AdminSettings = {
      ...adminSettings,
      username: securityForm.newUsername || adminSettings.username,
      passwordHash: securityForm.newPassword || adminSettings.passwordHash
    };
    try {
      await storageService.saveAdminSettings(updatedSettings);
      setAdminSettings(updatedSettings);
      setSecurityForm(prev => ({ ...prev, currentPassword: '', newPassword: '' }));
      showNotification('Security Updated');
    } catch (err) {
      alert("Failed to update credentials.");
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponForm.code || !adminSettings) return;
    const newCoupon: Coupon = {
      id: Date.now().toString(),
      code: couponForm.code.toUpperCase().trim(),
      type: couponForm.type,
      value: couponForm.value || 0,
      isActive: true
    };
    const updatedSettings = {
      ...adminSettings,
      coupons: [...(adminSettings.coupons || []), newCoupon]
    };
    try {
      await storageService.saveAdminSettings(updatedSettings);
      setAdminSettings(updatedSettings);
      setCouponForm({ code: '', type: 'percentage', value: 0 });
      showNotification('Coupon Created');
    } catch (err) {
      alert("Failed to create coupon.");
    }
  };

  const handleDeleteCoupon = (id: string) => {
    openConfirm(
      'Delete Coupon',
      'Are you sure you want to delete this coupon code?',
      async () => {
        if (!adminSettings) return;
        const updatedCoupons = adminSettings.coupons?.filter(c => c.id !== id) || [];
        const updatedSettings = { ...adminSettings, coupons: updatedCoupons };
        try {
          await storageService.saveAdminSettings(updatedSettings);
          setAdminSettings(updatedSettings);
          showNotification('Coupon Deleted');
        } catch (err) {
          alert("Failed to delete coupon.");
        }
      }
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSettings) {
      try {
        await storageService.saveAdminSettings(adminSettings);
        showNotification('Settings Saved');
      } catch (err) {
        alert("Failed to save settings.");
      }
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 text-center">
        <h2 className="text-3xl font-black mb-8 text-slate-800 tracking-tighter uppercase">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="text" placeholder="Username"
            className="w-full px-6 py-4 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 transition-all font-medium"
            value={loginForm.username}
            onChange={e => setLoginForm({...loginForm, username: e.target.value})}
          />
          <input 
            type="password" placeholder="Password"
            className="w-full px-6 py-4 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 transition-all font-medium"
            value={loginForm.password}
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
          />
          {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
          <button className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all">
            Unlock Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6">
            <div className="space-y-2 text-center">
              <h4 className="text-xl font-black text-slate-800 tracking-tight">{confirmState.title}</h4>
              <p className="text-sm text-slate-500 font-medium">{confirmState.message}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
              <button onClick={confirmState.onConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Live</span>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Admin Controls</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => loadData(true)} 
            className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl text-xs font-black hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh Data
          </button>
          <button onClick={handleLogout} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black hover:bg-red-50 hover:text-red-500 transition-all">Logout</button>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto overflow-x-auto">
        {['styles', 'coupons', 'optimizer', 'payment', 'tracking', 'activities', 'security'].map((t) => (
          <button key={t} onClick={() => setActiveTab(t as any)} className={`px-8 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap ${activeTab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            {t === 'tracking' ? 'Analytics' : t === 'activities' ? 'Logs' : t === 'coupons' ? 'Coupons' : t === 'optimizer' ? 'Storage Fix' : t}
          </button>
        ))}
      </div>

      {saveStatus && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full text-xs font-black shadow-2xl z-[60] animate-in slide-in-from-top-4">
          {saveStatus}
        </div>
      )}

      {activeTab === 'styles' && (
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-5 sticky top-24">
              <form onSubmit={handleSaveStyle} className="space-y-5">
                <h3 className="font-black text-slate-800 uppercase tracking-tighter text-xl">Manage Styles</h3>
                <input 
                  type="text" value={styleForm.name}
                  onChange={e => setStyleForm({...styleForm, name: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  placeholder="Style Name"
                />
                <textarea 
                  value={styleForm.prompt}
                  onChange={e => setStyleForm({...styleForm, prompt: e.target.value})}
                  className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-500 h-32 resize-none font-medium text-sm"
                  placeholder="AI Prompt"
                />
                <div className="flex items-center gap-3 px-2">
                  <input 
                    type="checkbox" id="auto-gen"
                    checked={styleForm.autoGenerate}
                    onChange={e => setStyleForm({...styleForm, autoGenerate: e.target.checked})}
                    className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <label htmlFor="auto-gen" className="text-xs font-black text-slate-500 uppercase tracking-widest cursor-pointer">Auto-generate on upload</label>
                </div>
                <input type="file" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setStyleForm({...styleForm, image: reader.result as string});
                    reader.readAsDataURL(file);
                  }
                }} className="hidden" id="admin-style-upload" />
                <label htmlFor="admin-style-upload" className="block w-full py-10 border-2 border-dashed border-slate-200 rounded-3xl text-center cursor-pointer hover:bg-slate-50 overflow-hidden">
                  {styleForm.image ? (
                    <img src={styleForm.image} className="h-32 mx-auto object-cover rounded-2xl" alt="Preview" />
                  ) : (
                    <span className="text-slate-400 font-bold text-xs uppercase tracking-widest">Upload Sample Image</span>
                  )}
                </label>
                <button type="submit" className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all">Save Style</button>
              </form>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={handleExport} className="py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200">Export JSON</button>
                <button type="button" onClick={() => importInputRef.current?.click()} className="py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200">Import JSON</button>
                <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
            {styles.map((s, idx) => (
              <div key={s.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex gap-4 hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="flex flex-col gap-1 items-center justify-center border-r pr-3 border-slate-50">
                   <button disabled={idx === 0} onClick={() => moveStyle(idx, 'up')} className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 disabled:opacity-20">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                   </button>
                   <span className="text-[9px] font-black text-slate-300">{idx + 1}</span>
                   <button disabled={idx === styles.length - 1} onClick={() => moveStyle(idx, 'down')} className="p-1.5 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-800 disabled:opacity-20">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                   </button>
                </div>
                <img src={s.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-sm bg-slate-100" alt={s.name} />
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 truncate">{s.name}</h4>
                    {s.autoGenerate && <span className="bg-green-100 text-green-600 text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">Auto</span>}
                  </div>
                  <div className="flex gap-4 mt-3">
                    <button onClick={() => setStyleForm({ 
                      id: s.id, name: s.name, prompt: s.prompt, description: s.description, image: s.imageUrl, autoGenerate: !!s.autoGenerate, displayOrder: s.displayOrder ?? idx 
                    })} className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline">Edit</button>
                    <button onClick={() => handleDeleteStyle(s.id)} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:underline">Delete</button>
                  </div>
                  {!s.imageUrl.toLowerCase().includes('.webp') && (
                    <div className="mt-1 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
                      <span className="text-[8px] font-black text-yellow-600 uppercase tracking-widest">Needs Opt.</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'optimizer' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Storage Optimizer</h3>
                <p className="text-xs text-slate-500 font-medium">This tool scans your Supabase library and optimizes images to WebP (80% quality, max 1000px).</p>
              </div>
              <button 
                onClick={handleRunOptimizer}
                disabled={isOptimizing}
                className={`px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 ${
                  isOptimizing ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 
                  optConfirming ? 'bg-orange-500 text-white animate-pulse' : 
                  'bg-rose-600 text-white hover:bg-rose-700 active:scale-95'
                }`}
              >
                {isOptimizing ? "Optimizing..." : optConfirming ? 'Confirm Run ✨' : 'Bulk Optimize Storage'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Styles Found</p>
                <p className="text-2xl font-black text-slate-800">{styles.length}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimized This Run</p>
                <p className="text-2xl font-black text-green-600">{optStats.count}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Space Saved</p>
                <p className="text-2xl font-black text-rose-600">{(optStats.saved / 1024).toFixed(1)} KB</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Live Process Log</h4>
              <div className="bg-slate-900 rounded-[2rem] p-6 h-64 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-hide border-4 border-slate-800 shadow-inner">
                {optLogs.length === 0 ? (
                  <p className="text-slate-500 italic">Logs will appear here once you start the process...</p>
                ) : (
                  optLogs.map((log, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="text-slate-600">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                      <span className={`${
                        log.type === 'error' ? 'text-red-400' : 
                        log.type === 'success' ? 'text-green-400' : 
                        log.type === 'warn' ? 'text-yellow-400' : 
                        'text-slate-300'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Payment, Tracking, Security, Coupons - Implementation continues using handleSaveSettings */}
      {activeTab === 'payment' && adminSettings && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
          <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Razorpay Configuration</h3>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key ID</label>
              <input type="text" value={adminSettings.payment.keyId} onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, keyId: e.target.value}})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency</label>
                <input type="text" value={adminSettings.payment.currency} onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, currency: e.target.value}})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-black uppercase" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price</label>
                <input type="number" step="0.01" value={adminSettings.payment.photoPrice || ''} onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, photoPrice: parseFloat(e.target.value) || 0}})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-xl font-black" />
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black shadow-xl">Save Changes</button>
          </form>
        </div>
      )}

      {activeTab === 'activities' && <ActivityLogView />}
      
      {activeTab === 'tracking' && adminSettings && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
          <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Analytics Tracking</h3>
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meta Pixel ID</label>
              <input type="text" value={adminSettings.tracking.metaPixelId || ''} onChange={e => setAdminSettings({...adminSettings, tracking: {...adminSettings.tracking, metaPixelId: e.target.value}})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-sm" />
            </div>
            <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black shadow-xl">Save Analytics</button>
          </form>
        </div>
      )}

      {activeTab === 'security' && adminSettings && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
          <h3 className="text-2xl font-black text-slate-800 tracking-tighter">Admin Credentials</h3>
          <form onSubmit={handleUpdateSecurity} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
              <input type="text" value={securityForm.newUsername} onChange={e => setSecurityForm({...securityForm, newUsername: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
              <input type="password" required value={securityForm.currentPassword} onChange={e => setSecurityForm({...securityForm, currentPassword: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
              <input type="password" placeholder="Leave blank to keep same" value={securityForm.newPassword} onChange={e => setSecurityForm({...securityForm, newPassword: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-medium" />
            </div>
            <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-2xl font-black shadow-xl">Update Security</button>
          </form>
        </div>
      )}
      
      {activeTab === 'coupons' && adminSettings && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Coupon codes</h3>
            <form onSubmit={handleAddCoupon} className="grid sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-4 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Coupon Code</label>
                <input type="text" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} placeholder="e.g. SAVE20" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold uppercase" />
              </div>
              <div className="sm:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
                <select value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value as any})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-medium">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount</option>
                </select>
              </div>
              <div className="sm:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value</label>
                <input type="number" value={couponForm.value || ''} onChange={e => setCouponForm({...couponForm, value: parseFloat(e.target.value) || 0})} placeholder="e.g. 20" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold" />
              </div>
              <div className="sm:col-span-2">
                <button type="submit" className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg">Create</button>
              </div>
            </form>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(adminSettings.coupons || []).map(c => (
              <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-black text-lg text-slate-800 tracking-tight">{c.code}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.type === 'percentage' ? `${c.value}% OFF` : `${storageService.getCurrencySymbol()}${c.value} OFF`}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${c.isActive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>Active</span>
                </div>
                <button onClick={() => handleDeleteCoupon(c.id)} className="w-full py-2 text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest bg-red-50 rounded-xl transition-colors">Delete Coupon</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
