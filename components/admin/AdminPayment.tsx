
import React, { useState, useEffect } from 'react';
import { AdminSettings } from '../../types';
import { storageService } from '../../services/storage';

const AdminPayment: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [form, setForm] = useState<any>(null);

  useEffect(() => {
    storageService.getAdminSettings().then(s => {
      setSettings(s);
      setForm({
        photoPrice: s.payment.photoPrice,
        videoPrice: s.payment.videoBasePrice,
        currency: s.payment.currency,
        razorpayKey: s.payment.keyId,
        razorpaySecret: s.payment.keySecret,
        klingAccess: s.klingAccessKey,
        klingSecret: s.klingSecretKey
      });
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const updated: AdminSettings = {
      ...settings,
      klingAccessKey: form.klingAccess,
      klingSecretKey: form.klingSecret,
      payment: {
        ...settings.payment,
        photoPrice: form.photoPrice,
        videoBasePrice: form.videoPrice,
        currency: form.currency,
        keyId: form.razorpayKey,
        keySecret: form.razorpaySecret
      }
    };
    await storageService.saveAdminSettings(updated);
    alert("Settings updated!");
  };

  if (!form) return null;

  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl">
        <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tighter uppercase mb-6 sm:mb-8">Payment & API Keys</h3>
        <form onSubmit={handleSave} className="space-y-8 sm:space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Photo Price</label>
              <input type="number" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all" value={form.photoPrice} onChange={e => setForm({...form, photoPrice: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Video Price</label>
              <input type="number" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all" value={form.videoPrice} onChange={e => setForm({...form, videoPrice: parseFloat(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Currency</label>
              <select className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-slate-900 transition-all" value={form.currency} onChange={e => setForm({...form, currency: e.target.value})}>
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="h-px bg-slate-50" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10">
            <div className="space-y-4 sm:space-y-6">
              <h4 className="font-black text-rose-500 uppercase text-xs tracking-widest">Razorpay Gateway</h4>
              <div className="space-y-3 sm:space-y-4">
                <input type="password" placeholder="Key ID" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs outline-none focus:ring-2 focus:ring-rose-500 transition-all" value={form.razorpayKey} onChange={e => setForm({...form, razorpayKey: e.target.value})} />
                <input type="password" placeholder="Key Secret" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs outline-none focus:ring-2 focus:ring-rose-500 transition-all" value={form.razorpaySecret} onChange={e => setForm({...form, razorpaySecret: e.target.value})} />
              </div>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <h4 className="font-black text-indigo-500 uppercase text-xs tracking-widest">Kling AI API</h4>
              <div className="space-y-3 sm:space-y-4">
                <input type="password" placeholder="Access Key" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={form.klingAccess} onChange={e => setForm({...form, klingAccess: e.target.value})} />
                <input type="password" placeholder="Secret Key" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs outline-none focus:ring-2 focus:ring-indigo-500 transition-all" value={form.klingSecret} onChange={e => setForm({...form, klingSecret: e.target.value})} />
              </div>
            </div>
          </div>

          <button type="submit" className="w-full py-5 sm:py-6 bg-slate-900 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black shadow-xl uppercase tracking-widest text-[10px] sm:text-[11px] active:scale-95 transition-all">
            Update Store Configurations
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminPayment;
