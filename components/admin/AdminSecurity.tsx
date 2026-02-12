
import React, { useState, useEffect } from 'react';
import { AdminSettings } from '../../types';
import { storageService } from '../../services/storage';

const AdminSecurity: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });

  useEffect(() => {
    storageService.getAdminSettings().then(s => {
      setSettings(s);
      setForm({ ...form, username: s.username });
    });
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    if (form.password && form.password !== form.confirm) return alert("Passwords do not match");

    const updated = {
      ...settings,
      username: form.username,
      passwordHash: form.password || settings.passwordHash
    };

    await storageService.saveAdminSettings(updated);
    alert("Security updated. Please login again.");
    storageService.setAdminLoggedIn(false);
    window.location.reload();
  };

  return (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 max-w-md mx-auto">
      <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase text-center">Security Settings</h3>
      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Admin Username</label>
          <input type="text" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
          <input type="password" placeholder="••••••••" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold" value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
          <input type="password" placeholder="••••••••" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold" value={form.confirm} onChange={e => setForm({...form, confirm: e.target.value})} />
        </div>
        <button type="submit" className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
          Update Credentials
        </button>
      </form>
    </div>
  );
};

export default AdminSecurity;
