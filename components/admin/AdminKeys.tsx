
import React, { useState, useEffect } from 'react';
import { ApiKeyRecord, AdminSettings } from '../../types';
import { storageService } from '../../services/storage';

const AdminKeys: React.FC = () => {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [newKey, setNewKey] = useState('');
  const [label, setLabel] = useState('');

  useEffect(() => { load(); }, []);
  
  const load = async () => {
    const s = await storageService.getAdminSettings();
    setSettings(s);
    setKeys(s.geminiApiKeys || []);
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings || !newKey) return;

    const record: ApiKeyRecord = {
      id: Date.now().toString(),
      key: newKey.trim(),
      label: label || `Key ${keys.length + 1}`,
      status: 'active',
      addedAt: Date.now()
    };

    const updated = [...keys, record];
    await storageService.saveAdminSettings({ ...settings, geminiApiKeys: updated });
    setNewKey('');
    setLabel('');
    load();
  };

  const toggleStatus = async (id: string) => {
    if (!settings) return;
    const updated = keys.map(k => {
      if (k.id === id) {
        return { ...k, status: k.status === 'active' ? 'exhausted' : 'active' } as ApiKeyRecord;
      }
      return k;
    });
    await storageService.saveAdminSettings({ ...settings, geminiApiKeys: updated });
    load();
  };

  const deleteKey = async (id: string) => {
    if (!settings || !confirm('Delete this key?')) return;
    const updated = keys.filter(k => k.id !== id);
    await storageService.saveAdminSettings({ ...settings, geminiApiKeys: updated });
    load();
  };

  return (
    <div className="space-y-10">
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
        <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">API Key Pool</h3>
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
          Add multiple Gemini API keys here. The system will rotate through them to avoid usage limits.
        </p>
        
        <form onSubmit={handleAddKey} className="grid sm:grid-cols-3 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Label</label>
            <input type="text" placeholder="Production Key" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-sm" value={label} onChange={e => setLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gemini API Key</label>
            <input type="password" placeholder="AIza..." className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 font-bold text-sm" value={newKey} onChange={e => setNewKey(e.target.value)} required />
          </div>
          <button type="submit" className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">
            Add to Pool
          </button>
        </form>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {keys.map(k => (
          <div key={k.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-black text-slate-800 uppercase text-xs truncate max-w-[120px]">{k.label}</p>
                <p className="text-[9px] font-mono text-slate-400 mt-1">****{k.key.slice(-4)}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${k.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {k.status}
              </span>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => toggleStatus(k.id)} className="flex-1 py-2.5 bg-slate-50 text-[9px] font-black text-slate-600 uppercase rounded-xl hover:bg-slate-100 transition-all">
                {k.status === 'active' ? 'Mark Exhausted' : 'Activate'}
              </button>
              <button onClick={() => deleteKey(k.id)} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
        {keys.length === 0 && (
          <div className="sm:col-span-3 py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem]">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No keys in pool. Using system default.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminKeys;
