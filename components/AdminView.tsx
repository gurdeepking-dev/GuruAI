
import React, { useState, useEffect, useRef } from 'react';
import { StyleTemplate, AdminSettings, ApiKeyRecord, Coupon } from '../types';
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
  const [activeTab, setActiveTab] = useState<'styles' | 'keys' | 'payment' | 'tracking' | 'activities' | 'security' | 'coupons' | 'optimizer'>('styles');
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
  
  const [keyForm, setKeyForm] = useState({ label: '', key: '' });
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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, settings] = await Promise.all([
        storageService.getStyles(true),
        storageService.getAdminSettings()
      ]);
      setStyles([...s]);
      setAdminSettings(settings);
      setSecurityForm(prev => ({ ...prev, newUsername: settings.username }));
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
      await loadData(); 
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
          await loadData();
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
      alert("Missing required fields (Name, Prompt, and Image are mandatory)");
      return;
    }

    setIsLoading(true);
    const newStyle: StyleTemplate = {
      id: styleForm.id || Date.now().toString(),
      name: styleForm.name,
      prompt: styleForm.prompt,
      description: styleForm.description,
      imageUrl: styleForm.image,
      autoGenerate: styleForm.autoGenerate,
      displayOrder: styleForm.displayOrder ?? styles.length
    };

    try {
      await storageService.saveStyle(newStyle);
      await loadData();
      setStyleForm({ id: '', name: '', prompt: '', description: '', image: '', autoGenerate: false, displayOrder: 0 });
      showNotification('Style Template Saved');
    } catch (err) {
      alert("Failed to save style. Check your Supabase connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteStyle = (id: string) => {
    openConfirm('Delete Style', 'Are you sure you want to permanently remove this style?', async () => {
      setIsDeleting(id);
      try {
        await storageService.deleteStyle(id);
        await loadData();
        showNotification('Style Deleted');
      } finally {
        setIsDeleting(null);
      }
    });
  };

  const handleMoveStyle = async (id: string, direction: 'up' | 'down') => {
    const index = styles.findIndex(s => s.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === styles.length - 1) return;

    const newStyles = [...styles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newStyles[index], newStyles[targetIndex]] = [newStyles[targetIndex], newStyles[index]];

    setIsLoading(true);
    try {
      // Re-assign display orders sequentially
      await Promise.all(newStyles.map((s, idx) => 
        storageService.saveStyle({ ...s, displayOrder: idx })
      ));
      await loadData();
      showNotification('Style Reordered');
    } catch (err) {
      alert("Failed to reorder styles. Ensure 'displayOrder' column exists in Supabase.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyForm.key || !keyForm.label || !adminSettings) return;
    const newKey: ApiKeyRecord = {
      id: Date.now().toString(),
      key: keyForm.key,
      label: keyForm.label,
      status: 'active',
      addedAt: Date.now()
    };
    const updatedSettings = { ...adminSettings, geminiApiKeys: [...(adminSettings.geminiApiKeys || []), newKey] };
    try {
      await storageService.saveAdminSettings(updatedSettings);
      setAdminSettings(updatedSettings);
      setKeyForm({ key: '', label: '' });
      showNotification('API Key Added');
    } catch (err) { alert("Failed to add key."); }
  };

  const handleDeleteKey = (id: string) => {
    openConfirm('Remove Key', 'Are you sure?', async () => {
      if (!adminSettings) return;
      const updatedKeys = adminSettings.geminiApiKeys?.filter(k => k.id !== id) || [];
      const updatedSettings = { ...adminSettings, geminiApiKeys: updatedKeys };
      try {
        await storageService.saveAdminSettings(updatedSettings);
        setAdminSettings(updatedSettings);
        showNotification('API Key Removed');
      } catch (err) { alert("Failed to remove key."); }
    });
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
    const updatedSettings = { ...adminSettings, coupons: [...(adminSettings.coupons || []), newCoupon] };
    try {
      await storageService.saveAdminSettings(updatedSettings);
      setAdminSettings(updatedSettings);
      setCouponForm({ code: '', type: 'percentage', value: 0 });
      showNotification('Coupon Created');
    } catch (err) { alert("Failed to create coupon."); }
  };

  const handleDeleteCoupon = (id: string) => {
    openConfirm('Delete Coupon', 'Are you sure?', async () => {
      if (!adminSettings) return;
      const updatedCoupons = adminSettings.coupons?.filter(c => c.id !== id) || [];
      const updatedSettings = { ...adminSettings, coupons: updatedCoupons };
      try {
        await storageService.saveAdminSettings(updatedSettings);
        setAdminSettings(updatedSettings);
        showNotification('Coupon Deleted');
      } catch (err) { alert("Failed to delete coupon."); }
    });
  };

  const showNotification = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSettings) {
      try {
        await storageService.saveAdminSettings(adminSettings);
        showNotification('Settings Saved');
      } catch (err) { alert("Failed to save settings. Razorpay keys might be invalid."); }
    }
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
    } catch (err) { alert("Failed to update credentials."); }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 text-center">
        <h2 className="text-3xl font-black mb-8 text-slate-800 tracking-tighter">Admin Login</h2>
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
          <button className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all">Unlock Panel</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6">
            <div className="text-center">
              <h4 className="text-xl font-black">{confirmState.title}</h4>
              <p className="text-sm text-slate-500">{confirmState.message}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmState(prev => ({...prev, isOpen: false}))} className="flex-1 py-3 bg-slate-100 rounded-2xl font-black">Cancel</button>
              <button onClick={confirmState.onConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black">Confirm</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-[10px] font-black uppercase text-slate-400">System Live</span></div>
          <span className="text-[10px] font-black uppercase text-slate-400">Admin Controls</span>
        </div>
        <button onClick={handleLogout} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black hover:bg-red-50">Logout</button>
      </div>

      <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto overflow-x-auto">
        {['styles', 'keys', 'coupons', 'optimizer', 'payment', 'tracking', 'activities', 'security'].map((t) => (
          <button 
            key={t} onClick={() => setActiveTab(t as any)}
            className={`px-8 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest whitespace-nowrap ${activeTab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {t === 'keys' ? 'API Pool' : t === 'tracking' ? 'Analytics' : t === 'activities' ? 'Logs' : t === 'coupons' ? 'Coupons' : t === 'optimizer' ? 'Storage Fix' : t}
          </button>
        ))}
      </div>

      {saveStatus && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full text-xs font-black z-[60] shadow-xl">{saveStatus}</div>}

      {activeTab === 'styles' && (
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleSaveStyle} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-5 sticky top-24">
              <h3 className="font-black text-slate-800 uppercase text-xl">Manage Styles</h3>
              <input type="text" value={styleForm.name} onChange={e => setStyleForm({...styleForm, name: e.target.value})} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-500 font-bold" placeholder="Style Name" />
              <textarea value={styleForm.prompt} onChange={e => setStyleForm({...styleForm, prompt: e.target.value})} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-500 h-24 resize-none font-medium text-sm" placeholder="AI Prompt (Instructions)" />
              <textarea value={styleForm.description} onChange={e => setStyleForm({...styleForm, description: e.target.value})} className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-rose-500 h-16 resize-none font-medium text-sm" placeholder="Short description for card" />
              
              <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <input 
                  type="checkbox" 
                  id="auto-gen-check"
                  checked={styleForm.autoGenerate}
                  onChange={e => setStyleForm({...styleForm, autoGenerate: e.target.checked})}
                  className="w-5 h-5 rounded accent-rose-600 cursor-pointer"
                />
                <label htmlFor="auto-gen-check" className="text-xs font-black text-rose-600 uppercase tracking-widest cursor-pointer select-none">Auto-generate on upload</label>
              </div>

              <input type="file" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => setStyleForm({...styleForm, image: reader.result as string});
                  reader.readAsDataURL(file);
                }
              }} className="hidden" id="admin-style-upload" />
              <label htmlFor="admin-style-upload" className="block w-full py-6 border-2 border-dashed border-slate-200 rounded-3xl text-center cursor-pointer hover:bg-slate-50 overflow-hidden">
                {styleForm.image ? <img src={styleForm.image} className="h-24 mx-auto object-cover rounded-2xl" /> : <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Upload Sample Image</span>}
              </label>
              <button type="submit" className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all">Save Style</button>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                <button type="button" onClick={handleExport} className="py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200">Export</button>
                <button type="button" onClick={() => importInputRef.current?.click()} className="py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200">Import</button>
                <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" />
              </div>
            </form>
          </div>
          <div className="lg:col-span-7 space-y-4">
            {styles.map((s, idx) => (
              <div key={s.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex gap-4 hover:shadow-md transition-all items-center">
                <div className="flex flex-col gap-1 pr-2 border-r border-slate-100">
                  <button onClick={() => handleMoveStyle(s.id, 'up')} disabled={idx === 0} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/></svg>
                  </button>
                  <button onClick={() => handleMoveStyle(s.id, 'down')} disabled={idx === styles.length - 1} className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 disabled:opacity-20 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
                  </button>
                </div>
                <img src={s.imageUrl} className="w-16 h-16 rounded-2xl object-cover shadow-sm" />
                <div className="flex-grow min-w-0">
                  <h4 className="font-bold text-slate-800 truncate text-sm">{s.name}</h4>
                  <div className="flex gap-2 mt-2 items-center">
                    {s.autoGenerate && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded-md text-[8px] font-black uppercase tracking-widest">Auto Gen</span>}
                    <button onClick={() => setStyleForm({ id: s.id, name: s.name, prompt: s.prompt, description: s.description, image: s.imageUrl, autoGenerate: !!s.autoGenerate, displayOrder: s.displayOrder ?? idx })} className="text-[10px] font-black text-rose-600 uppercase hover:underline">Edit</button>
                    <button onClick={() => handleDeleteStyle(s.id)} className="text-[10px] font-black text-red-400 uppercase hover:underline">Delete</button>
                  </div>
                </div>
                <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest px-4">#{idx + 1}</div>
              </div>
            ))}
            {styles.length === 0 && !isLoading && <div className="py-20 text-center text-slate-400 font-medium">No styles found. Add your first style!</div>}
          </div>
        </div>
      )}

      {activeTab === 'optimizer' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Storage Optimizer</h3>
                <p className="text-xs text-slate-500 font-medium">Converts your library images to optimized WebP format to save space.</p>
              </div>
              <button onClick={handleRunOptimizer} disabled={isOptimizing} className={`px-8 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all ${isOptimizing ? 'bg-slate-200 text-slate-400' : optConfirming ? 'bg-orange-500 text-white animate-pulse' : 'bg-rose-600 text-white hover:bg-rose-700'}`}>
                {isOptimizing ? 'Working...' : optConfirming ? 'Click Again' : 'Start Optimizer'}
              </button>
            </div>
            <div className="bg-slate-900 rounded-[2rem] p-6 h-64 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1 shadow-inner border-4 border-slate-800">
              {optLogs.map((log, i) => <div key={i} className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : ''}>{log.message}</div>)}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && adminSettings && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Coupon Codes</h3>
            <form onSubmit={handleAddCoupon} className="grid sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-4 space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1">CODE</label><input type="text" value={couponForm.code} onChange={e => setCouponForm({...couponForm, code: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 uppercase font-bold outline-none focus:ring-2 focus:ring-rose-500" placeholder="e.g. LOVE20" /></div>
              <div className="sm:col-span-3 space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1">TYPE</label><select value={couponForm.type} onChange={e => setCouponForm({...couponForm, type: e.target.value as any})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold outline-none"><option value="percentage"> Percentage (%) </option><option value="fixed"> Fixed Amount </option></select></div>
              <div className="sm:col-span-3 space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1">VALUE</label><input type="number" value={couponForm.value || ''} onChange={e => setCouponForm({...couponForm, value: parseFloat(e.target.value) || 0})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold outline-none" /></div>
              <div className="sm:col-span-2"><button type="submit" className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 transition-all shadow-lg">Create</button></div>
            </form>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(adminSettings.coupons || []).map(c => (
              <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                <div><h4 className="font-black text-slate-800 uppercase">{c.code}</h4><p className="text-[10px] text-slate-400 uppercase font-black">{c.type === 'percentage' ? `${c.value}% OFF` : `${storageService.getCurrencySymbol()} ${c.value} OFF`}</p></div>
                <button onClick={() => handleDeleteCoupon(c.id)} className="text-red-400 font-black text-[10px] hover:underline">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'activities' && <ActivityLogView />}

      {activeTab === 'tracking' && adminSettings && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Meta Pixel Tracking</h3>
          <form onSubmit={handleSavePaymentConfig} className="space-y-6">
            <input type="text" value={adminSettings.tracking.metaPixelId || ''} onChange={e => setAdminSettings({...adminSettings, tracking: {...adminSettings.tracking, metaPixelId: e.target.value}})} placeholder="Pixel ID" className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-mono text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all">Save Tracking Settings</button>
          </form>
        </div>
      )}

      {activeTab === 'keys' && adminSettings && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">API Key Pool</h3>
            <form onSubmit={handleAddKey} className="grid sm:grid-cols-12 gap-4 items-end">
              <div className="sm:col-span-4 space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1">Label</label><input type="text" value={keyForm.label} onChange={e => setKeyForm({...keyForm, label: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-rose-500 font-bold" placeholder="Key Label" /></div>
              <div className="sm:col-span-6 space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1">Key</label><input type="password" value={keyForm.key} onChange={e => setKeyForm({...keyForm, key: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-mono outline-none focus:ring-2 focus:ring-rose-500" placeholder="AIzaSy..." /></div>
              <div className="sm:col-span-2"><button type="submit" className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all">Add Key</button></div>
            </form>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(adminSettings.geminiApiKeys || []).map(k => (
              <div key={k.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center shadow-sm">
                <div><h4 className="font-bold text-slate-800">{k.label}</h4><p className="text-[10px] text-slate-400 font-mono uppercase">••••{k.key.slice(-4)}</p></div>
                <button onClick={() => handleDeleteKey(k.id)} className="text-red-400 font-black text-[10px] hover:underline">Delete</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payment' && adminSettings && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Razorpay Gateway</h3>
          <form onSubmit={handleSavePaymentConfig} className="space-y-6">
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Razorpay Key ID</label><input type="text" value={adminSettings.payment.keyId} onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, keyId: e.target.value}})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-mono text-sm outline-none focus:ring-2 focus:ring-rose-500" placeholder="rzp_live_..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Currency</label><input type="text" value={adminSettings.payment.currency} onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, currency: e.target.value}})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-black uppercase outline-none focus:ring-2 focus:ring-rose-500" /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Photo Price</label><input type="number" step="0.01" value={adminSettings.payment.photoPrice || ''} onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, photoPrice: parseFloat(e.target.value) || 0}})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 text-xl font-black outline-none focus:ring-2 focus:ring-rose-500" /></div>
            </div>
            <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all">Save Razorpay Config</button>
          </form>
        </div>
      )}

      {activeTab === 'security' && adminSettings && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Admin Credentials</h3>
          <form onSubmit={handleUpdateSecurity} className="space-y-6">
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Username</label><input type="text" value={securityForm.newUsername} onChange={e => setSecurityForm({...securityForm, newUsername: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 font-bold outline-none focus:ring-2 focus:ring-rose-500" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">Current Password</label><input type="password" required value={securityForm.currentPassword} onChange={e => setSecurityForm({...securityForm, currentPassword: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-rose-500" placeholder="Type current password to confirm" /></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-widest">New Password</label><input type="password" placeholder="Leave blank to keep current" value={securityForm.newPassword} onChange={e => setSecurityForm({...securityForm, newPassword: e.target.value})} className="w-full px-6 py-4 rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-rose-500" /></div>
            <button type="submit" className="w-full py-5 bg-red-600 text-white rounded-2xl font-black shadow-xl hover:bg-red-700 transition-all">Update Security</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminView;
