
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
      setLoginError('Invalid username or password');
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
    alert('API Key registered successfully');
  };

  const handleSavePaymentConfig = (e: React.FormEvent) => {
    e.preventDefault();
    storageService.saveAdminSettings(adminSettings);
    alert('Payment configuration saved!');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.old !== adminSettings.passwordHash) {
      alert('Current password incorrect');
      return;
    }
    if (passForm.new !== passForm.confirm) {
      alert('New passwords do not match');
      return;
    }
    
    const newSettings = { ...adminSettings, passwordHash: passForm.new };
    storageService.saveAdminSettings(newSettings);
    setAdminSettings(newSettings);
    setPassForm({ old: '', new: '', confirm: '' });
    alert('Password updated successfully');
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-3xl shadow-2xl border border-slate-100">
        <h2 className="text-2xl font-bold mb-6 text-center text-slate-800">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
            <input 
              type="text" 
              autoFocus
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
              value={loginForm.username}
              onChange={e => setLoginForm({...loginForm, username: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50"
              value={loginForm.password}
              onChange={e => setLoginForm({...loginForm, password: e.target.value})}
            />
          </div>
          {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
          <button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg">
            Access Panel
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-3xl font-bold text-slate-800">Admin Control Center</h2>
        <button onClick={handleLogout} className="text-sm text-slate-400 hover:text-slate-600 font-medium underline">Sign Out</button>
      </div>

      <div className="flex border-b border-slate-200 overflow-x-auto">
        {['styles', 'keys', 'security', 'payment'].map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 font-semibold transition-colors whitespace-nowrap capitalize ${activeTab === tab ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'styles' && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <form onSubmit={handleSaveStyle} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4 sticky top-24">
              <h3 className="font-bold text-lg text-slate-700">{styleForm.id ? 'Edit Style' : 'Add New Style'}</h3>
              <input 
                type="text" 
                value={styleForm.name}
                onChange={e => setStyleForm({...styleForm, name: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border outline-none"
                placeholder="Style Name"
              />
              <textarea 
                value={styleForm.prompt}
                onChange={e => setStyleForm({...styleForm, prompt: e.target.value})}
                rows={4}
                className="w-full px-4 py-2 rounded-lg border outline-none resize-none"
                placeholder="AI Prompt Instruction"
              />
              <input 
                type="text" 
                value={styleForm.description}
                onChange={e => setStyleForm({...styleForm, description: e.target.value})}
                className="w-full px-4 py-2 rounded-lg border outline-none"
                placeholder="Short Description"
              />
              <div>
                <input type="file" onChange={(e) => {
                   const file = e.target.files?.[0];
                   if (file) {
                     const reader = new FileReader();
                     reader.onloadend = () => setStyleForm({...styleForm, image: reader.result as string});
                     reader.readAsDataURL(file);
                   }
                }} className="hidden" id="admin-style-upload" />
                <label htmlFor="admin-style-upload" className="block w-full py-4 border-2 border-dashed rounded-lg text-center cursor-pointer hover:bg-slate-50 overflow-hidden">
                  {styleForm.image ? <img src={styleForm.image} className="h-20 mx-auto object-cover rounded" /> : <span className="text-slate-400 text-sm">Upload Image</span>}
                </label>
              </div>
              <div className="flex gap-2">
                {styleForm.id && <button type="button" onClick={() => setStyleForm({id: '', name:'', prompt:'', description:'', image:''})} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">Cancel</button>}
                <button className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold">{styleForm.id ? 'Update Style' : 'Create Style'}</button>
              </div>
            </form>
          </div>
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {styles.map(s => (
              <div key={s.id} className="bg-white p-4 rounded-2xl border flex gap-4">
                <img src={s.imageUrl} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-grow min-w-0">
                  <h4 className="font-bold truncate">{s.name}</h4>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => handleEditStyle(s)} className="text-xs text-indigo-600 font-bold hover:underline">Edit</button>
                    <button onClick={() => { if(confirm('Delete?')) { storageService.deleteStyle(s.id); setStyles(storageService.getStyles()); } }} className="text-xs text-red-500 font-bold hover:underline">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl border shadow-sm">
          <h3 className="text-xl font-bold mb-6">Change Admin Password</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <input type="password" placeholder="Current Password" required value={passForm.old} onChange={e => setPassForm({...passForm, old: e.target.value})} className="w-full px-4 py-3 rounded-xl border outline-none" />
            <input type="password" placeholder="New Password" required value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})} className="w-full px-4 py-3 rounded-xl border outline-none" />
            <input type="password" placeholder="Confirm New Password" required value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})} className="w-full px-4 py-3 rounded-xl border outline-none" />
            <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold">Update Password</button>
          </form>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border shadow-sm space-y-6">
          <h3 className="text-xl font-bold">Payment Gateway Settings</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Active Gateway</label>
              <select className="w-full px-4 py-3 rounded-xl border outline-none">
                <option>Stripe</option>
                <option>PayPal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Currency</label>
              <select className="w-full px-4 py-3 rounded-xl border outline-none">
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Photo Download Price ($)</label>
            <input 
              type="number" 
              step="0.01"
              value={adminSettings.payment.photoPrice}
              onChange={e => setAdminSettings({...adminSettings, payment: {...adminSettings.payment, photoPrice: parseFloat(e.target.value)}})}
              className="w-full px-4 py-3 rounded-xl border outline-none" 
            />
          </div>
          <button onClick={handleSavePaymentConfig} className="w-full py-4 bg-green-600 text-white rounded-xl font-bold">Save Configuration</button>
        </div>
      )}

      {activeTab === 'keys' && (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border shadow-sm space-y-6">
          <h3 className="text-xl font-bold">API Key Pool</h3>
          <form onSubmit={handleAddKey} className="flex gap-2">
            <input 
              type="password" 
              placeholder="Paste Gemini API Key" 
              value={keyForm.key}
              onChange={e => setKeyForm({...keyForm, key: e.target.value})}
              className="flex-grow px-4 py-3 rounded-xl border outline-none" 
            />
            <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold">Add Key</button>
          </form>
          <div className="space-y-2">
            {apiKeys.map(k => (
              <div key={k.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
                <span className="font-mono text-xs">••••••••{k.key.slice(-4)}</span>
                <button onClick={() => {
                  const updated = apiKeys.filter(item => item.id !== k.id);
                  storageService.saveApiKeys(updated);
                  setApiKeys(updated);
                }} className="text-red-500 text-xs font-bold">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
