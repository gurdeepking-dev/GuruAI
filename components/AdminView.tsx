
import React, { useState, useEffect } from 'react';
import { StyleTemplate, ApiKeyRecord, AdminSettings } from '../types';
import { storageService } from '../services/storage';

const AdminView: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(storageService.isAdminLoggedIn());
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const [styles, setStyles] = useState<StyleTemplate[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(storageService.getAdminSettings());
  const [activeTab, setActiveTab] = useState<'styles' | 'keys' | 'security' | 'payment'>('styles');

  // Form states
  const [styleForm, setStyleForm] = useState({ id: '', name: '', prompt: '', description: '', image: '' });
  const [keyForm, setKeyForm] = useState({ key: '', label: '' });
  const [passForm, setPassForm] = useState({ old: '', new: '', confirm: '' });

  useEffect(() => {
    if (isAuthenticated) {
      setStyles(storageService.getStyles());
      setApiKeys(storageService.getApiKeys());
      setAdminSettings(storageService.getAdminSettings());
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const settings = storageService.getAdminSettings();
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

  const handleSaveStyle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleForm.name || !styleForm.prompt || !styleForm.image) return;

    if (styleForm.id) {
      storageService.updateStyle({
        id: styleForm.id,
        name: styleForm.name,
        prompt: styleForm.prompt,
        description: styleForm.description,
        imageUrl: styleForm.image
      } as StyleTemplate);
    } else {
      storageService.addStyle({
        id: Date.now().toString(),
        name: styleForm.name,
        prompt: styleForm.prompt,
        description: styleForm.description,
        imageUrl: styleForm.image
      });
    }
    
    setStyles(storageService.getStyles());
    setStyleForm({ id: '', name: '', prompt: '', description: '', image: '' });
    alert('Style template saved successfully.');
  };

  const handleEditStyle = (style: StyleTemplate) => {
    setStyleForm({
      id: style.id,
      name: style.name,
      prompt: style.prompt,
      description: style.description,
      image: style.imageUrl
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyForm.key) return;

    const newKey: ApiKeyRecord = {
      id: Date.now().toString(),
      key: keyForm.key,
      label: keyForm.label || `Key ${apiKeys.length + 1}`,
      status: 'active',
      addedAt: Date.now()
    };

    const updatedKeys = [...apiKeys, newKey];
    storageService.saveApiKeys(updatedKeys);
    setApiKeys(updatedKeys);
    setKeyForm({ key: '', label: '' });
    alert('API Key registered in the pool.');
  };

  const handleSavePaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveAdminSettings(adminSettings);
    alert('Razorpay payment configuration updated.');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const settings = storageService.getAdminSettings();
    
    if (passForm.old !== settings.passwordHash) {
      alert('Incorrect current password');
      return;
    }
    if (passForm.new !== passForm.confirm) {
      alert('New passwords do not match');
      return;
    }
    if (passForm.new.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    const updated = { ...settings, passwordHash: passForm.new };
    storageService.saveAdminSettings(updated);
    setAdminSettings(updated);
    setPassForm({ old: '', new: '', confirm: '' });
    alert('Security credentials updated.');
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 text-center animate-in zoom-in duration-300">
        <h2 className="text-3xl font-black mb-8 text-slate-800 tracking-tighter">Admin Access</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="text" placeholder="Username"
            className="w-full px-6 py-4 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all font-medium"
            value={loginForm.username}
            onChange={e => setLoginForm({...loginForm, username: e.target.value})}
          />
          <input 
            type="password" placeholder="Password"
            className="w-full px-6 py-4 rounded-2xl border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all font-medium"
            value={loginForm.password}
            onChange={e => setLoginForm({...loginForm, password: e.target.value})}
          />
          {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
          <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95">
            Open Control Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-4xl font-black text-slate-900 tracking-tighter">Control Center</h2>
        <div className="flex gap-4">
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
            {['styles', 'keys', 'payment', 'security'].map((t) => (
              <button 
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <button onClick={handleLogout} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all">Logout</button>
        </div>
      </div>

      {activeTab === 'styles' && (
        <div className="grid lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4">
            <form onSubmit={handleSaveStyle} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-5 sticky top-24">
              <h3 className="font-black text-slate-800">{styleForm.id ? 'Edit Template' : 'Add New Style'}</h3>
              <input 
                type="text" value={styleForm.name}
                onChange={e => setStyleForm({...styleForm, name: e.target.value})}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                placeholder="Template Name"
              />
              <textarea 
                value={styleForm.prompt}
                onChange={e => setStyleForm({...styleForm, prompt: e.target.value})}
                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none font-medium text-sm"
                placeholder="AI Instructions Prompt"
              />
              <input type="file" onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const reader = new FileReader();
                   reader.onloadend = () => setStyleForm({...styleForm, image: reader.result as string});
                   reader.readAsDataURL(file);
                 }
              }} className="hidden" id="admin-style-upload" />
              <label htmlFor="admin-style-upload" className="block w-full py-10 border-2 border-dashed border-slate-200 rounded-3xl text-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden">
                {styleForm.image ? <img src={styleForm.image} className="h-32 mx-auto object-cover rounded-2xl shadow-md" /> : <span className="text-slate-400 font-bold text-sm">Upload Face Preview</span>}
              </label>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-all">Save Template</button>
            </form>
          </div>
          <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4 h-fit">
            {styles.map(s => (
              <div key={s.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex gap-4 group hover:shadow-xl transition-all">
                <img src={s.imageUrl} className="w-24 h-24 rounded-2xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                <div className="flex-grow min-w-0 flex flex-col justify-center">
                  <h4 className="font-bold text-slate-800 truncate">{s.name}</h4>
                  <div className="flex gap-4 mt-3">
                    <button onClick={() => handleEditStyle(s)} className="text-xs font-black text-indigo-600 hover:underline uppercase tracking-widest">Edit</button>
                    <button onClick={() => { if(confirm('Remove this style?')) { storageService.deleteStyle(s.id); setStyles(storageService.getStyles()); } }} className="text-xs font-black text-red-400 hover:text-red-600 uppercase tracking-widest">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-2xl text-green-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800">Razorpay Gateway</h3>
          </div>
          <form onSubmit={handleSavePaymentConfig} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key ID</label>
              <input 
                type="text" placeholder="rzp_live_..."
                value={adminSettings.payment.keyId}
                onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, keyId: e.target.value}})}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Secret</label>
              <input 
                type="password" placeholder="••••••••••••••••••••"
                value={adminSettings.payment.keySecret}
                onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, keySecret: e.target.value}})}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price per Transformation ({adminSettings.payment.currency})</label>
              <input 
                type="number" step="0.01"
                value={adminSettings.payment.photoPrice}
                onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, photoPrice: parseFloat(e.target.value)}})}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 text-2xl font-black text-indigo-600" 
              />
            </div>
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all active:scale-95 shadow-indigo-100">Update Razorpay Config</button>
          </form>
        </div>
      )}

      {activeTab === 'keys' && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800">Gemini Key Pool</h3>
          </div>
          <form onSubmit={handleAddKey} className="space-y-4">
            <input 
              type="password" placeholder="Gemini API Key" required
              value={keyForm.key}
              onChange={e => setKeyForm({...keyForm, key: e.target.value})}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm" 
            />
            <input 
              type="text" placeholder="Project Name/Label"
              value={keyForm.label}
              onChange={e => setKeyForm({...keyForm, label: e.target.value})}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 font-medium" 
            />
            <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-95">Add Active Key</button>
          </form>
          <div className="space-y-3 pt-4 border-t border-slate-100">
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{k.label || 'Unnamed Key'}</span>
                  <span className="font-mono text-xs opacity-60">••••••••{k.key.slice(-6)}</span>
                </div>
                <button onClick={() => {
                  const updated = apiKeys.filter(item => item.id !== k.id);
                  storageService.saveApiKeys(updated);
                  setApiKeys(updated);
                }} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom-4">
           <div className="flex items-center gap-4">
            <div className="p-3 bg-red-50 rounded-2xl text-red-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800">Admin Security</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
              <input 
                type="password" required
                value={passForm.old}
                onChange={e => setPassForm({...passForm, old: e.target.value})}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
              <input 
                type="password" required
                value={passForm.new}
                onChange={e => setPassForm({...passForm, new: e.target.value})}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Confirm New Password</label>
              <input 
                type="password" required
                value={passForm.confirm}
                onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
              />
            </div>
            <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl hover:bg-black transition-all active:scale-95 mt-4">Update Admin Credentials</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AdminView;
