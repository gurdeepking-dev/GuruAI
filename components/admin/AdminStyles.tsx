
import React, { useState, useEffect, useRef } from 'react';
import { StyleTemplate } from '../../types';
import { storageService } from '../../services/storage';
import { imageStorage } from '../../services/imageStorage';

const AdminStyles: React.FC = () => {
  const [styles, setStyles] = useState<StyleTemplate[]>([]);
  const [form, setForm] = useState<Partial<StyleTemplate>>({ 
    name: '', 
    prompt: '', 
    description: '', 
    imageUrl: '', 
    autoGenerate: false,
    displayOrder: 0
  });
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await storageService.getStyles(true);
    setStyles(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviewUrl(base64);
        setForm(prev => ({ ...prev, imageUrl: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // imageUrl might be a base64 string here; storageService.saveStyle handles the upload
      await storageService.saveStyle({
        ...form,
        id: form.id || Date.now().toString(),
        displayOrder: typeof form.displayOrder === 'number' ? form.displayOrder : styles.length
      } as StyleTemplate);
      
      resetForm();
      load();
    } catch (err) { 
      alert("Save failed"); 
    } finally { 
      setIsSaving(false); 
    }
  };

  const resetForm = () => {
    setForm({ name: '', prompt: '', description: '', imageUrl: '', autoGenerate: false, displayOrder: styles.length });
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newStyles = [...styles];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newStyles.length) return;

    // Swap positions
    const temp = newStyles[index];
    newStyles[index] = newStyles[targetIndex];
    newStyles[targetIndex] = temp;

    // Update display orders
    const updatedStyles = newStyles.map((s, i) => ({ ...s, displayOrder: i }));
    setStyles(updatedStyles);

    // Save all updated orders to DB
    try {
      await Promise.all(updatedStyles.map(s => storageService.saveStyle(s)));
    } catch (err) {
      alert("Failed to sync new order with database.");
      load();
    }
  };

  return (
    <div className="space-y-10">
      <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl space-y-8">
        <div className="flex justify-between items-center">
           <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Art Styles Manager</h3>
           {form.id && <button onClick={resetForm} className="text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-4 py-2 rounded-xl">Cancel Edit</button>}
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid md:grid-cols-12 gap-6 items-start">
            {/* Form Inputs */}
            <div className="md:col-span-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Style Name</label>
                  <input type="text" placeholder="e.g. Victorian Romance" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-bold" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Order Index</label>
                  <input type="number" placeholder="0" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-bold" value={form.displayOrder} onChange={e => setForm({...form, displayOrder: parseInt(e.target.value)})} required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AI Instruction Prompt</label>
                <textarea placeholder="Describe how the AI should transform the photo..." className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none h-32 text-xs font-medium leading-relaxed" value={form.prompt} onChange={e => setForm({...form, prompt: e.target.value})} required />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Catalog Description</label>
                <input type="text" placeholder="Short tagline for users..." className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none text-sm font-medium" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
              </div>
            </div>

            {/* Thumbnail Upload */}
            <div className="md:col-span-4 space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block text-center">Style Thumbnail</label>
               <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group hover:border-rose-500 transition-all shadow-inner"
               >
                  {(previewUrl || form.imageUrl) ? (
                    <img src={previewUrl || form.imageUrl} className="w-full h-full object-contain p-4" alt="Preview" />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                       <span className="text-3xl block">🖼️</span>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Upload Sample<br/>Optimized via Canvas</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Change Photo</span>
                  </div>
               </div>
               <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
               
               <div className="flex items-center gap-3 px-2">
                <input type="checkbox" id="auto" checked={form.autoGenerate} onChange={e => setForm({...form, autoGenerate: e.target.checked})} className="w-4 h-4 accent-rose-500" />
                <label htmlFor="auto" className="text-[10px] font-black uppercase text-slate-500 cursor-pointer">Auto-gen on Upload</label>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSaving} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-xl uppercase tracking-[0.2em] text-[11px] hover:bg-black transition-all active:scale-95 border-b-8 border-black">
            {isSaving ? 'Syncing Neural Assets...' : (form.id ? 'Update Style Data' : 'Deploy New Style')}
          </button>
        </form>
      </div>

      {/* Styles Catalog with Ordering controls */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {styles.map((s, index) => (
          <div key={s.id} className="bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-4 group hover:shadow-xl transition-all h-full">
            {/* Dynamic Frame: object-contain p-2 ensures photo is not cropped */}
            <div className="aspect-square bg-slate-50 rounded-[1.5rem] flex items-center justify-center overflow-hidden p-2 shadow-inner border border-slate-100">
              <img src={s.imageUrl} className="max-w-full max-h-full object-contain rounded-lg" alt={s.name} />
            </div>
            
            <div className="px-1 flex-grow">
              <div className="flex justify-between items-start gap-2 mb-1">
                <h4 className="font-black text-slate-800 uppercase text-[10px] leading-tight flex-grow">{s.name}</h4>
                <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[8px] font-black text-slate-500">#{s.displayOrder}</span>
              </div>
              <p className="text-[8px] text-slate-400 uppercase font-bold truncate">{s.description}</p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button 
                  onClick={() => handleMove(index, 'up')} 
                  disabled={index === 0}
                  className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all disabled:opacity-20"
                >
                  <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" /></svg>
                </button>
                <button 
                  onClick={() => handleMove(index, 'down')} 
                  disabled={index === styles.length - 1}
                  className="flex-1 py-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all disabled:opacity-20"
                >
                  <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => { setForm(s); setPreviewUrl(null); window.scrollTo({top: 0, behavior: 'smooth'}); }} className="flex-grow py-2.5 bg-indigo-50 text-[9px] font-black text-indigo-600 uppercase rounded-xl hover:bg-indigo-600 hover:text-white transition-all">Edit</button>
                <button onClick={async () => { if(confirm('Delete style?')) { await storageService.deleteStyle(s.id); load(); } }} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminStyles;
