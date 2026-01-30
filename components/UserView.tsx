
import React, { useState, useEffect } from 'react';
import { StyleTemplate } from '../types';
import { storageService } from '../services/storage';
import { geminiService } from '../services/geminiService';

const UserView: React.FC = () => {
  const [styles, setStyles] = useState<StyleTemplate[]>([]);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<StyleTemplate | null>(null);
  const [refinement, setRefinement] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    setStyles(storageService.getStyles());
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserPhoto(reader.result as string);
        setGeneratedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!userPhoto || !selectedStyle) return;
    setIsGenerating(true);
    setError(null);
    try {
      const result = await geminiService.generateStyle(userPhoto, selectedStyle.prompt, refinement);
      setGeneratedImage(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-12">
      <section className="bg-white rounded-3xl p-6 md:p-10 shadow-xl border border-slate-100 overflow-hidden relative">
        <div className="grid md:grid-cols-2 gap-10">
          
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Style Your Portrait</h2>
            
            <div className="space-y-4">
              <label className="block group">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">1. Upload Base Photo</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" id="photo-upload" />
                <label htmlFor="photo-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl cursor-pointer hover:bg-slate-50 transition-all bg-slate-50/50 overflow-hidden">
                  {userPhoto ? <img src={userPhoto} className="h-full w-full object-cover" /> : <span className="text-slate-400">Select Image</span>}
                </label>
              </label>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest block mb-2">2. Active Style</span>
                {selectedStyle ? (
                  <div className="flex items-center gap-3">
                    <img src={selectedStyle.imageUrl} className="w-10 h-10 rounded-lg object-cover" />
                    <span className="font-bold text-indigo-900">{selectedStyle.name}</span>
                  </div>
                ) : <p className="text-indigo-300 text-sm italic">Choose below...</p>}
              </div>

              {generatedImage && (
                <div className="space-y-2 animate-in slide-in-from-left duration-300">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">3. Refine Result (Optional)</span>
                  <textarea 
                    value={refinement}
                    onChange={e => setRefinement(e.target.value)}
                    placeholder="e.g. 'Make it more colorful', 'Add a hat'..."
                    className="w-full p-4 rounded-2xl border bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none transition-all"
                  />
                </div>
              )}

              <button
                disabled={!userPhoto || !selectedStyle || isGenerating}
                onClick={handleGenerate}
                className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-indigo-700 transition-all transform active:scale-95 disabled:bg-slate-200"
              >
                {isGenerating ? 'Gemini is Painting...' : generatedImage ? 'Regenerate with Adjustments' : 'Generate Preview'}
              </button>

              {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
            </div>
          </div>

          <div className="relative">
            <div className="aspect-[4/5] rounded-3xl bg-slate-50 border-2 border-slate-100 shadow-inner overflow-hidden flex items-center justify-center group">
              {generatedImage ? (
                <div className="relative w-full h-full">
                  <img src={generatedImage} className="w-full h-full object-cover animate-in fade-in zoom-in duration-500" />
                  {/* WATERMARK OVERLAY */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                    <div className="transform -rotate-45 text-white/40 text-4xl font-black uppercase tracking-tighter mix-blend-overlay">
                      StyleSwapAI.com
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-10 space-y-4 opacity-30">
                  <div className="text-6xl">✨</div>
                  <p className="font-bold text-slate-400 uppercase tracking-widest text-sm">Preview Area</p>
                </div>
              )}
            </div>

            {generatedImage && !isGenerating && (
              <div className="absolute bottom-6 left-6 right-6 flex gap-3">
                <button 
                  onClick={() => alert('Added to your collection!')}
                  className="flex-1 py-4 bg-white/90 backdrop-blur rounded-2xl text-slate-800 font-bold text-sm shadow-lg hover:bg-white transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  Add to Cart
                </button>
                <button 
                  onClick={() => setShowCheckout(true)}
                  className="flex-1 py-4 bg-indigo-600 rounded-2xl text-white font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all"
                >
                  Buy High-Res No Watermark
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h3 className="text-2xl font-bold text-slate-800">Choose an Artistic Style</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {styles.map((s) => (
            <div 
              key={s.id}
              onClick={() => { setSelectedStyle(s); setGeneratedImage(null); }}
              className={`group cursor-pointer rounded-2xl overflow-hidden border-4 transition-all ${selectedStyle?.id === s.id ? 'border-indigo-500 scale-105 shadow-xl' : 'border-white hover:border-slate-200'}`}
            >
              <div className="aspect-[3/4] relative">
                <img src={s.imageUrl} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white font-bold text-sm">{s.name}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowCheckout(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-2xl font-bold text-slate-900">Checkout</h4>
                  <p className="text-slate-500">Instant download after payment</p>
                </div>
                <button onClick={() => setShowCheckout(false)} className="p-2 hover:bg-slate-100 rounded-full">✕</button>
              </div>

              <div className="p-6 bg-slate-50 rounded-3xl border space-y-4">
                <div className="flex justify-between font-bold">
                  <span>Custom Styled Portrait</span>
                  <span>$9.99</span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <p>• High Resolution (4096px)</p>
                  <p>• No Watermark</p>
                  <p>• Commercial Rights Included</p>
                </div>
              </div>

              <div className="space-y-3">
                <input type="email" placeholder="Delivery Email" className="w-full px-5 py-4 rounded-2xl border outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Card Number" className="w-full px-5 py-4 rounded-2xl border outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="text" placeholder="MM/YY CVC" className="w-full px-5 py-4 rounded-2xl border outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              <button className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-bold text-lg shadow-xl hover:bg-indigo-700 transition-all">
                Pay with Stripe
              </button>
              
              <p className="text-center text-[10px] text-slate-400 uppercase font-bold tracking-widest">Secure Checkout Powered by StyleSwap</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserView;
