
import React, { useState, useEffect } from 'react';
import { Coupon, AdminSettings } from '../../types';
import { storageService } from '../../services/storage';

const AdminCoupons: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<Partial<Coupon>>({ code: '', type: 'percentage', value: 0, isActive: true });

  useEffect(() => { load(); }, []);
  const load = async () => {
    const s = await storageService.getAdminSettings();
    setSettings(s);
    setCoupons(s.coupons || []);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    const newCoupon = { ...form, id: form.id || Date.now().toString() } as Coupon;
    const updated = form.id ? coupons.map(c => c.id === form.id ? newCoupon : c) : [...coupons, newCoupon];
    await storageService.saveAdminSettings({ ...settings, coupons: updated });
    setForm({ code: '', type: 'percentage', value: 0, isActive: true });
    load();
  };

  return (
    <div className="space-y-10">
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Promotions & Coupons</h3>
        <form onSubmit={handleSave} className="grid sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Code</label>
            <input type="text" placeholder="LOVE20" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-sm uppercase" value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} required />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</label>
            <select className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-sm" value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Value</label>
            <input type="number" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-sm" value={form.value} onChange={e => setForm({...form, value: parseFloat(e.target.value)})} required />
          </div>
          <button type="submit" className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">
            {form.id ? 'Update' : 'Add Coupon'}
          </button>
        </form>
      </div>
      <div className="grid sm:grid-cols-3 gap-6">
        {coupons.map(c => (
          <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex justify-between items-center group">
            <div>
              <p className="text-lg font-black text-slate-900">{c.code}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {c.type === 'percentage' ? `${c.value}% OFF` : `${storageService.getCurrencySymbol()} ${c.value} OFF`}
              </p>
            </div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => setForm(c)} className="text-xs font-black text-indigo-600 uppercase">Edit</button>
              <button onClick={async () => {
                const updated = coupons.filter(x => x.id !== c.id);
                await storageService.saveAdminSettings({ ...settings!, coupons: updated });
                load();
              }} className="text-xs font-black text-rose-500 uppercase">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminCoupons;
