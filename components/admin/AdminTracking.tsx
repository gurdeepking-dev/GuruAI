
import React, { useState, useEffect } from 'react';
import { AdminSettings } from '../../types';
import { storageService } from '../../services/storage';

const AdminTracking: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [pixelId, setPixelId] = useState('');

  useEffect(() => {
    storageService.getAdminSettings().then(s => {
      setSettings(s);
      setPixelId(s.tracking?.metaPixelId || '');
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    await storageService.saveAdminSettings({
      ...settings,
      tracking: { ...settings.tracking, metaPixelId: pixelId }
    });
    alert("Tracking updated. Page will reload to apply changes.");
    window.location.reload();
  };

  return (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl">🎯</div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Marketing Pixels</h3>
      </div>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Meta Pixel ID</label>
          <input type="text" placeholder="1234567890" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold" value={pixelId} onChange={e => setPixelId(e.target.value)} />
        </div>
        <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed italic">
          Enter your Meta Pixel ID to track PageViews, AddToCart, and Purchases. Make sure your pixel is active in Events Manager.
        </p>
        <button onClick={handleSave} className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all">
          Deploy Tracking Code
        </button>
      </div>
    </div>
  );
};

export default AdminTracking;
