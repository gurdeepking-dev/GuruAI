
import React, { useState, useEffect, useRef } from 'react';
import { SampleVideo, AdminSettings } from '../../types';
import { storageService } from '../../services/storage';
import { imageStorage } from '../../services/imageStorage';

const AdminSamples: React.FC = () => {
  const [samples, setSamples] = useState<SampleVideo[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [form, setForm] = useState<Partial<SampleVideo>>({ title: '', videoUrl: '', thumbnailUrl: '', prompt: '' });
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLInputElement>(null);
  const thumbRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const s = await storageService.getAdminSettings();
    setSettings(s);
    setSamples(s.videoSamples || []);
  };

  const showStatus = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsUploading(true);

    try {
      let vUrl = form.videoUrl || '';
      let tUrl = form.thumbnailUrl || '';

      if (videoRef.current?.files?.[0]) {
        vUrl = await imageStorage.uploadMedia(videoRef.current.files[0], 'templates', 'video-samples');
      }
      if (thumbRef.current?.files?.[0]) {
        tUrl = await imageStorage.uploadMedia(thumbRef.current.files[0], 'templates', 'thumbnails');
      }

      const newSample = { 
        ...form, 
        videoUrl: vUrl, 
        thumbnailUrl: tUrl, 
        id: form.id || Date.now().toString(),
        displayOrder: form.displayOrder || samples.length
      } as SampleVideo;

      const updated = form.id 
        ? samples.map(s => s.id === form.id ? newSample : s)
        : [...samples, newSample];

      await storageService.saveAdminSettings({ ...settings, videoSamples: updated });
      showStatus("Sample saved successfully");
      reset();
      load();
    } catch (err) {
      alert("Failed to save sample");
    } finally {
      setIsUploading(false);
    }
  };

  const reset = () => {
    setForm({ title: '', videoUrl: '', thumbnailUrl: '', prompt: '' });
    setVideoPreview(null);
    setThumbPreview(null);
    if (videoRef.current) videoRef.current.value = '';
    if (thumbRef.current) thumbRef.current.value = '';
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      <div className="bg-white p-6 sm:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 shadow-xl space-y-8 sm:space-y-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tighter uppercase leading-tight">Cinema Preset Builder</h3>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Create styles that users can click to load</p>
          </div>
          {form.id && <button onClick={reset} className="text-[9px] sm:text-[10px] font-black uppercase text-rose-500 bg-rose-50 px-4 py-2 rounded-xl hover:bg-rose-100 w-full sm:w-auto">Cancel Edit</button>}
        </div>

        <form onSubmit={handleSave} className="space-y-8 sm:space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10">
            {/* Left: Metadata */}
            <div className="md:col-span-7 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                <input type="text" placeholder="e.g. Victorian Romance" className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none font-bold text-sm" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">AI Motion & Style Prompt</label>
                <textarea placeholder="Describe the visual style..." className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none h-32 sm:h-44 font-medium text-xs resize-none leading-relaxed" value={form.prompt} onChange={e => setForm({...form, prompt: e.target.value})} required />
              </div>
            </div>

            {/* Right: Media Uploads */}
            <div className="md:col-span-5 flex flex-row sm:flex-row md:flex-col lg:flex-row gap-4 sm:gap-6 items-center justify-center">
              <div className="space-y-2 flex-grow sm:flex-grow-0">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Sample Video</label>
                <div onClick={() => videoRef.current?.click()} className="w-full sm:w-[140px] aspect-[3/4] sm:h-[200px] bg-slate-900 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative hover:border-indigo-500 transition-all shadow-lg group">
                  {videoPreview ? (
                    <video src={videoPreview} className="w-full h-full object-contain" muted autoPlay loop playsInline />
                  ) : (
                    <div className="text-center p-2 sm:p-4">
                      <span className="text-2xl sm:text-3xl mb-1 sm:2 block">🎬</span>
                      <p className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase leading-tight">Upload MP4</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Change</span>
                  </div>
                </div>
                <input type="file" ref={videoRef} accept="video/*" hidden onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setVideoPreview(URL.createObjectURL(f));
                }} />
              </div>

              <div className="space-y-2 flex-grow sm:flex-grow-0">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Thumbnail</label>
                <div onClick={() => thumbRef.current?.click()} className="w-full sm:w-[140px] aspect-[3/4] sm:h-[200px] bg-slate-50 rounded-[1.5rem] sm:rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative hover:border-rose-500 transition-all shadow-lg group">
                  {thumbPreview ? (
                    <img src={thumbPreview} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center p-2 sm:p-4">
                      <span className="text-2xl sm:text-3xl mb-1 sm:2 block">🖼️</span>
                      <p className="text-[7px] sm:text-[8px] font-black text-slate-500 uppercase leading-tight">Upload JPG</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Change</span>
                  </div>
                </div>
                <input type="file" ref={thumbRef} accept="image/*" hidden onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) setThumbPreview(URL.createObjectURL(f));
                }} />
              </div>
            </div>
          </div>

          <button disabled={isUploading} type="submit" className="w-full py-5 sm:py-6 bg-slate-900 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black shadow-2xl uppercase tracking-[0.1em] sm:tracking-[0.2em] text-[10px] sm:text-[11px] disabled:opacity-50 transition-all hover:bg-black active:scale-95 border-b-4 sm:border-b-8 border-black">
            {isUploading ? 'Optimizing Media...' : (form.id ? 'Update Cinema Preset' : 'Publish New Cinema Preset')}
          </button>
        </form>
      </div>

      {/* Samples Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {samples.map(v => (
          <div key={v.id} className="bg-white p-3 sm:p-4 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-3 sm:gap-4 group hover:shadow-xl transition-all h-full">
            <div className="aspect-[3/4] bg-slate-900 rounded-[1rem] sm:rounded-[1.5rem] overflow-hidden relative">
               <img src={v.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover group-hover:opacity-0 transition-opacity z-10" />
               <video src={v.videoUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
            </div>
            <div className="space-y-1 flex-grow">
              <h4 className="font-black text-slate-800 uppercase text-[9px] sm:text-[10px] truncate tracking-tight">{v.title}</h4>
              <p className="text-[7px] sm:text-[8px] font-medium text-slate-400 line-clamp-2 leading-tight sm:leading-relaxed">{v.prompt}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                setForm(v);
                setVideoPreview(v.videoUrl);
                setThumbPreview(v.thumbnailUrl);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} className="flex-1 py-2 sm:py-2.5 bg-slate-50 text-[8px] sm:text-[9px] font-black uppercase text-slate-600 rounded-lg sm:rounded-xl hover:bg-slate-900 hover:text-white transition-all">Edit</button>
              <button onClick={async () => {
                if(confirm('Permanently remove this preset?')) {
                  const updated = samples.filter(x => x.id !== v.id);
                  await storageService.saveAdminSettings({...settings!, videoSamples: updated});
                  load();
                }
              }} className="p-2 sm:p-2.5 bg-rose-50 text-rose-500 rounded-lg sm:rounded-xl hover:bg-rose-500 hover:text-white transition-all">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {saveStatus && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full text-[9px] sm:text-[10px] font-black shadow-2xl z-[100] animate-in slide-in-from-bottom-4 flex items-center gap-2 sm:gap-3">
          <span className="text-base sm:text-lg">✅</span>
          {saveStatus}
        </div>
      )}
    </div>
  );
};

export default AdminSamples;
