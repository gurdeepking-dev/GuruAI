
import React, { useState, useEffect } from 'react';
import { StyleTemplate, ApiKeyRecord, AdminSettings } from '../types';
import { storageService } from '../services/storage';
import { imageStorage } from '../services/imageStorage';
import { isCloudEnabled } from '../services/supabase';
import { logger } from '../services/logger';

const AdminView: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(storageService.isAdminLoggedIn());
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  
  const [styles, setStyles] = useState<StyleTemplate[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [activeTab, setActiveTab] = useState<'styles' | 'keys' | 'security' | 'payment'>('styles');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // Form states
  const [styleForm, setStyleForm] = useState({ id: '', name: '', prompt: '', description: '', image: '' });
  const [keyForm, setKeyForm] = useState({ key: '', label: '' });

  useEffect(() => {
    logger.info('Admin', 'AdminView mounted');
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, k, settings] = await Promise.all([
        storageService.getStyles(),
        storageService.getApiKeys(),
        storageService.getAdminSettings()
      ]);
      setStyles(s);
      setApiKeys(k);
      setAdminSettings(settings);
    } catch (err) {
      logger.error('Admin', 'Failed to load panel data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    logger.info('Admin', `Login attempt for user: ${loginForm.username}`);
    const settings = await storageService.getAdminSettings();
    if (loginForm.username === settings.username && loginForm.password === settings.passwordHash) {
      setIsAuthenticated(true);
      storageService.setAdminLoggedIn(true);
      setLoginError('');
      logger.info('Admin', 'Login successful');
    } else {
      setLoginError('Invalid credentials');
      logger.warn('Admin', 'Invalid login attempt');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    storageService.setAdminLoggedIn(false);
    logger.info('Admin', 'Logged out');
  };

  const handleSaveStyle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!styleForm.name || !styleForm.prompt || !styleForm.image) return;

    setIsUploading(true);
    try {
      let finalImageUrl = styleForm.image;
      
      // If image is still a base64 from a new upload, push to cloud
      if (styleForm.image.startsWith('data:')) {
        const fileName = `template_${Date.now()}.png`;
        finalImageUrl = await imageStorage.uploadTemplateImage(styleForm.image, fileName);
      }

      const newStyle: StyleTemplate = {
        id: styleForm.id || Date.now().toString(),
        name: styleForm.name,
        prompt: styleForm.prompt,
        description: styleForm.description,
        imageUrl: finalImageUrl
      };

      await storageService.saveStyle(newStyle);
      await loadData();
      setStyleForm({ id: '', name: '', prompt: '', description: '', image: '' });
      showNotification('Template Synced to Cloud');
    } catch (err: any) {
      logger.error('Admin', 'Failed to save style', err);
      alert("Failed to save template: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const showNotification = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyForm.key) return;

    const newKey: ApiKeyRecord = {
      id: Date.now().toString(),
      key: keyForm.key,
      label: keyForm.label || `Cloud Key ${apiKeys.length + 1}`,
      status: 'active',
      addedAt: Date.now()
    };

    await storageService.saveApiKey(newKey);
    await loadData();
    setKeyForm({ key: '', label: '' });
    showNotification('Key Pooled');
  };

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminSettings) {
      await storageService.saveAdminSettings(adminSettings);
      showNotification('Global Config Saved');
    }
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
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isCloudEnabled ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
          <span className="text-xs font-black uppercase tracking-widest text-slate-400">
            {isCloudEnabled ? 'Cloud Database: Ready' : 'Database: Local (Check Env)'}
          </span>
        </div>
        <button onClick={handleLogout} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 hover:text-red-500 transition-all">Logout</button>
      </div>

      {saveStatus && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-2xl z-[101] animate-in slide-in-from-bottom-4">
          {saveStatus}
        </div>
      )}

      {isLoading ? (
         <div className="py-20 text-center text-slate-400 font-bold flex flex-col items-center gap-4">
           <div className="w-8 h-8 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin" />
           Syncing Control Center...
         </div>
      ) : (
        <>
          <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit mx-auto">
            {['styles', 'keys', 'payment', 'security'].map((t) => (
              <button 
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`px-8 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 'styles' && (
            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4">
                <form onSubmit={handleSaveStyle} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-5 sticky top-24">
                  <h3 className="font-black text-slate-800">{styleForm.id ? 'Update Template' : 'New Cloud Template'}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Templates are permanently stored in Supabase</p>
                  <input 
                    type="text" value={styleForm.name}
                    onChange={e => setStyleForm({...styleForm, name: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    placeholder="Style Name"
                  />
                  <textarea 
                    value={styleForm.prompt}
                    onChange={e => setStyleForm({...styleForm, prompt: e.target.value})}
                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none font-medium text-sm"
                    placeholder="AI Prompt Instructions"
                  />
                  <input type="file" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setStyleForm({...styleForm, image: reader.result as string});
                      reader.readAsDataURL(file);
                    }
                  }} className="hidden" id="admin-style-upload" />
                  <label htmlFor="admin-style-upload" className="block w-full py-10 border-2 border-dashed border-slate-200 rounded-3xl text-center cursor-pointer hover:bg-slate-50 transition-all overflow-hidden relative">
                    {styleForm.image ? (
                      <img src={styleForm.image} className="h-32 mx-auto object-cover rounded-2xl shadow-sm" alt="Preview" />
                    ) : (
                      <div className="space-y-2">
                        <svg className="w-8 h-8 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        <span className="text-slate-400 font-bold text-xs">Sample Photo</span>
                      </div>
                    )}
                  </label>
                  <button 
                    type="submit" 
                    disabled={isUploading}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isUploading ? "Uploading to Cloud..." : "Push to Master Styles"}
                  </button>
                </form>
              </div>
              <div className="lg:col-span-8 grid sm:grid-cols-2 gap-4">
                {styles.map(s => (
                  <div key={s.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 flex gap-4 group hover:shadow-md transition-shadow">
                    <img src={s.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-sm" alt={s.name} />
                    <div className="flex-grow min-w-0">
                      <h4 className="font-bold text-slate-800 truncate">{s.name}</h4>
                      <p className="text-[10px] text-slate-400 truncate opacity-60 font-mono">{s.prompt.slice(0, 40)}...</p>
                      <div className="flex gap-4 mt-3">
                        <button onClick={() => setStyleForm({ id: s.id, name: s.name, prompt: s.prompt, description: s.description, image: s.imageUrl })} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Edit</button>
                        <button onClick={async () => { if(confirm('Permanently delete this style from Cloud?')) { await storageService.deleteStyle(s.id); await loadData(); } }} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:underline">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'payment' && adminSettings && (
            <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-black text-slate-800">Razorpay Configuration</h3>
              <form onSubmit={handleSavePaymentConfig} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key ID (rzp_...)</label>
                  <input 
                    type="text" placeholder="Key ID"
                    value={adminSettings.payment.keyId}
                    onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, keyId: e.target.value}})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Secret</label>
                  <input 
                    type="password" placeholder="Key Secret"
                    value={adminSettings.payment.keySecret}
                    onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, keySecret: e.target.value}})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-sm" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Price (INR)</label>
                  <input 
                    type="number" step="0.01"
                    value={adminSettings.payment.photoPrice}
                    onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, photoPrice: parseFloat(e.target.value)}})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-2xl font-black" 
                  />
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-xl hover:bg-indigo-700 transition-all">Save Persistent Config</button>
              </form>
            </div>
          )}

          {activeTab === 'keys' && (
            <div className="max-w-2xl mx-auto bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 animate-in slide-in-from-bottom-4">
              <h3 className="text-2xl font-black text-slate-800">Gemini Key Pool</h3>
              <p className="text-sm text-slate-500 font-medium">Add multiple API keys to prevent rate limits. Keys are tried in order.</p>
              <form onSubmit={handleAddKey} className="space-y-4">
                <input 
                  type="password" placeholder="Gemini API Key" required
                  value={keyForm.key}
                  onChange={e => setKeyForm({...keyForm, key: e.target.value})}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-mono text-sm" 
                />
                <input 
                  type="text" placeholder="Key Label (e.g. Project A)"
                  value={keyForm.label}
                  onChange={e => setKeyForm({...keyForm, label: e.target.value})}
                  className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100" 
                />
                <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black shadow-xl">Add Key to Pool</button>
              </form>
              <div className="space-y-3">
                {apiKeys.length > 0 ? apiKeys.map(k => (
                  <div key={k.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-xs font-black text-slate-800 tracking-tight">{k.label}</p>
                      <span className="font-mono text-[10px] opacity-40">••••••••{k.key.slice(-6)}</span>
                    </div>
                    <button onClick={async () => { await storageService.deleteApiKey(k.id); await loadData(); }} className="text-red-400 hover:text-red-600 p-2 font-black text-sm">✕</button>
                  </div>
                )) : (
                  <div className="py-10 text-center text-slate-300 italic font-medium">No keys in database. Using system default if available.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminView;
