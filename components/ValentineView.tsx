
import React, { useState, useEffect, useRef } from 'react';
import { StyleTemplate, CartItem, User, TransactionRecord } from '../types';
import { storageService } from '../services/storage';
import { geminiService } from '../services/geminiService';
import { usageService } from '../services/usageService';
import { logger } from '../services/logger';
import { analytics } from '../services/analytics';
import Watermark from './Watermark';
import CheckoutModal from './CheckoutModal';

interface ValentineViewProps {
  cart: CartItem[];
  user: User | null;
  addToCart: (item: CartItem) => void;
  showCheckout: boolean;
  setShowCheckout: (val: boolean) => void;
  removeFromCart: (id: string) => void;
  onLoginRequired: () => void;
  onUserUpdate: () => void;
  setCart: (cart: CartItem[]) => void;
  onAnimate?: (photo: string, prompt: string, isVerified: boolean) => void;
}

interface GenerationState {
  [styleId: string]: {
    isLoading: boolean;
    result: string | null;
    error: string | null;
    refinement: string;
    isHighRes: boolean;
  }
}

const ValentineView: React.FC<ValentineViewProps> = ({ 
  cart, user, addToCart, showCheckout, setShowCheckout, removeFromCart, setCart, onAnimate
}) => {
  const [styles, setStyles] = useState<StyleTemplate[]>([]);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [genStates, setGenStates] = useState<GenerationState>({});
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [freePhotoClaimed, setFreePhotoClaimed] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    loadContent();
    return () => {
      if (userPhoto && userPhoto.startsWith('blob:')) {
        URL.revokeObjectURL(userPhoto);
      }
    };
  }, []);

  const loadContent = async () => {
    try {
      const [loadedStyles, adminSettings] = await Promise.all([
        storageService.getStyles(),
        storageService.getAdminSettings()
      ]);
      
      // Removed restricted keyword filter so all styles added via Admin are visible in this primary gallery
      setStyles(loadedStyles);
      setSettings(adminSettings);
      
      const initialStates: GenerationState = {};
      loadedStyles.forEach(s => {
        initialStates[s.id] = { 
          isLoading: false, 
          result: null, 
          error: null, 
          refinement: '', 
          isHighRes: false 
        };
      });
      setGenStates(initialStates);
      setFreePhotoClaimed(usageService.hasClaimedFreePhoto());
    } catch (err) {
      logger.error('View', 'Failed to load content', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setUserPhoto(base64);
        
        setGenStates(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(id => {
            newState[id] = { ...newState[id], result: null, error: null, isHighRes: false };
          });
          return newState;
        });

        analytics.track('Lead', { method: 'upload' });
        storageService.logActivity('photo_uploaded', { filename: file.name });
        
        styles.forEach(s => {
          if (s.autoGenerate) {
            handleGenerate(s, base64);
          }
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (style: StyleTemplate, overridePhoto?: string) => {
    const photoToUse = overridePhoto || userPhoto;
    if (!photoToUse) {
      uploadInputRef.current?.click();
      return;
    }

    setGenStates(prev => ({
      ...prev,
      [style.id]: { ...prev[style.id], isLoading: true, error: null }
    }));

    try {
      const state = genStates[style.id] || { refinement: '' };
      const result = await geminiService.generateStyle(photoToUse, style.prompt, state.refinement);
      setGenStates(prev => ({
        ...prev,
        [style.id]: { ...prev[style.id], isLoading: false, result }
      }));
      storageService.logActivity('style_generated', { style_name: style.name });
    } catch (err: any) {
      setGenStates(prev => ({
        ...prev,
        [style.id]: { ...prev[style.id], isLoading: false, error: err.message }
      }));
    }
  };

  const handleClaimFree = (styleId: string) => {
    if (freePhotoClaimed) return;
    usageService.markFreePhotoAsUsed();
    setFreePhotoClaimed(true);
    setGenStates(prev => {
      const current = prev[styleId];
      if (current && current.result) {
        return { ...prev, [styleId]: { ...current, isHighRes: true } };
      }
      return prev;
    });
    handleDownload(styleId);
    storageService.logActivity('free_photo_claimed', { style_id: styleId });
  };

  const handleAddToCart = (styleId: string) => {
    const state = genStates[styleId];
    const style = styles.find(s => s.id === styleId);
    if (!state.result || !style) return;
    if (cart.find(item => item.id === styleId)) {
      setShowCheckout(true);
      return;
    }
    const newItem: CartItem = {
      id: style.id, 
      styledImage: state.result,
      styleName: style.name,
      price: settings?.payment.photoPrice || 8.00,
    };
    addToCart(newItem);
  };

  const handleDownload = (styleId: string) => {
    const state = genStates[styleId];
    if (!state.result) return;
    const link = document.createElement('a');
    link.href = state.result;
    link.download = `art-${styleId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaymentComplete = async (paymentId: string, paidItemIds: string[]) => {
    setGenStates(prev => {
      const newState = { ...prev };
      paidItemIds.forEach(id => {
        if (newState[id]) newState[id].isHighRes = true;
      });
      return newState;
    });
    setCart([]);
    setShowCheckout(false);
    alert("Payment successful! High-quality downloads enabled.");
  };

  const renderStyleCard = (s: StyleTemplate) => {
    const state = genStates[s.id] || { isLoading: false, result: null, error: null, refinement: '', isHighRes: false };
    return (
      <div key={s.id} className="group bg-white rounded-[2.5rem] overflow-hidden border-2 border-rose-50 shadow-lg hover:shadow-2xl transition-all duration-500 flex flex-col hover:-translate-y-2">
        <div className="px-7 pt-7 pb-4 bg-gradient-to-b from-rose-50/50 to-white flex justify-between items-center">
          <h4 className="font-black text-xl text-slate-800 serif italic">{s.name}</h4>
          {s.autoGenerate && !state.result && !state.isLoading && (
            <span className="text-[8px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase">Auto-Gen</span>
          )}
        </div>
        <div className="aspect-square relative bg-rose-50 flex items-center justify-center overflow-hidden">
          {state.isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4 bg-white/60 backdrop-blur-md z-30">
              <div className="w-12 h-12 border-4 border-rose-500 border-t-rose-100 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 animate-pulse">Neural Magic in Progress...</p>
            </div>
          ) : state.result ? (
            <div className="w-full h-full relative z-20 flex items-center justify-center">
              <img src={state.result} className={`max-w-full max-h-full object-contain ${!state.isHighRes ? 'pointer-events-none select-none' : ''}`} alt={s.name} />
              {!state.isHighRes && <Watermark text="www.chatgptdigital.store" />}
              <button 
                onClick={() => setGenStates(prev => ({...prev, [s.id]: {...prev[s.id], result: null}}))}
                className="absolute top-4 right-4 p-2.5 bg-white/60 backdrop-blur-md rounded-xl text-rose-600 hover:bg-rose-600 hover:text-white transition-all z-40"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="w-full h-full cursor-pointer relative z-20 flex items-center justify-center group/img" onClick={() => handleGenerate(s)}>
              <img src={s.imageUrl} className="max-w-full max-h-full object-contain transition-all duration-700 group-hover/img:scale-105" alt={s.name} />
              <div className="absolute inset-0 bg-rose-900/10 opacity-0 group-hover/img:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                <span className="bg-white/95 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-rose-600">Try Style ✨</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-7 space-y-4 flex-grow flex flex-col justify-between">
          <div className="space-y-3">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{s.description}</p>
            
            {state.result && (
              <div className="animate-in slide-in-from-bottom-2 duration-500 space-y-2">
                <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest ml-1 block">Want to change anything?</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={state.refinement}
                    onChange={(e) => setGenStates(prev => ({...prev, [s.id]: {...prev[s.id], refinement: e.target.value}}))}
                    placeholder="e.g. more red, add flowers..."
                    className="flex-grow px-4 py-2.5 rounded-xl bg-slate-50 border border-rose-100 text-[11px] font-semibold outline-none focus:border-rose-300 transition-all"
                    onKeyPress={(e) => e.key === 'Enter' && handleGenerate(s)}
                  />
                  <button 
                    onClick={() => handleGenerate(s)}
                    className="px-4 py-2.5 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 active:scale-95"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3 pt-4 border-t-2 border-rose-50">
            {state.result ? (
              <div className="flex flex-col gap-3">
                {state.isHighRes ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => handleDownload(s.id)} className="py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all">Download 🎬</button>
                    <button onClick={() => onAnimate?.(state.result!, s.prompt, true)} className="py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl border-b-4 border-rose-800 hover:bg-rose-700 transition-all">Make Video of this photo ✨</button>
                  </div>
                ) : (
                  <>
                    {!freePhotoClaimed ? (
                      <button onClick={() => handleClaimFree(s.id)} className="w-full py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl border-b-4 border-rose-800">Claim Free Photo 🎁</button>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleAddToCart(s.id)} className="py-3 border-2 border-rose-100 bg-white rounded-[1.25rem] font-black text-[10px] text-rose-400 uppercase tracking-widest">Save</button>
                        <button onClick={() => { handleAddToCart(s.id); setShowCheckout(true); }} className="py-3 bg-slate-900 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest shadow-xl">Buy HD</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              !state.isLoading && (
                <button onClick={() => handleGenerate(s)} className="w-full py-5 bg-rose-600 text-white rounded-[1.5rem] font-black text-xl uppercase tracking-widest shadow-xl hover:bg-rose-700 transition-all active:scale-95 border-b-4 border-rose-800">
                  Transform Now ✨
                </button>
              )
            )}
            {state.error && <p className="text-[9px] text-rose-600 font-bold uppercase text-center">{state.error}</p>}
          </div>
        </div>
      </div>
    );
  };

  const currencySymbol = storageService.getCurrencySymbol(settings?.payment.currency);

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-7xl mx-auto px-4">
      {/* Tutorial Video Section */}
      <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-2xl border border-rose-100 text-center space-y-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="relative space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl animate-bounce">📽️</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight uppercase tracking-widest serif italic">Watch to see the magic</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="relative mx-auto w-full max-w-[280px] sm:max-w-xs aspect-[9/16] bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl ring-8 ring-rose-50 overflow-hidden">
              <video autoPlay muted playsInline loop controls className="w-full h-full object-contain rounded-2xl">
                <source src="https://ghdwufjkpjuidyfsgkde.supabase.co/storage/v1/object/public/media/howto.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="text-left space-y-6">
              <div className="space-y-4">
                {[1, 2, 3].map(num => (
                  <div key={num} className="flex gap-4 items-start group">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">{num}</div>
                    <div>
                      <h4 className="font-black text-slate-800 uppercase tracking-wide text-sm">{num === 1 ? 'Upload Photo' : num === 2 ? 'Choose Style' : 'Get Your Art'}</h4>
                      <p className="text-slate-500 text-xs font-medium">{num === 1 ? 'Pick a clear photo from your gallery.' : num === 2 ? 'Click "Transform" or wait for Auto-Gen.' : 'Claim your 1 Free photo or buy more in HD!'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 shadow-inner">
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest text-center">Neural Engine Active • 30s Delivery ✨</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white rounded-[3rem] p-8 sm:p-12 shadow-2xl border border-rose-100 text-center">
        <div className="relative max-w-4xl mx-auto flex flex-col items-center gap-8">
          <div className="w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-rose-50 cursor-pointer hover:scale-105 transition-all" onClick={() => uploadInputRef.current?.click()}>
            {userPhoto ? <img src={userPhoto} className="w-full h-full object-cover" alt="User" /> : <div className="w-full h-full bg-gradient-to-br from-rose-500 to-pink-500 flex flex-col items-center justify-center text-white"><span className="text-4xl">📸</span><span className="text-[10px] font-black uppercase mt-2">Upload</span></div>}
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 serif italic">AI Magic <span className="text-rose-500">Studio</span></h1>
            <p className="text-slate-400 font-semibold max-w-lg mx-auto">Create beautiful artistic masterpieces from your photos. Get your first photo for FREE.</p>
          </div>
          <button onClick={() => uploadInputRef.current?.click()} className="px-10 py-5 bg-rose-600 text-white rounded-[2rem] font-black text-lg shadow-xl hover:bg-rose-700 transition-all active:scale-95 border-b-8 border-rose-800">Choose Your Photo 📸</button>
          <input type="file" ref={uploadInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
        {styles.map(s => renderStyleCard(s))}
      </div>

      <CheckoutModal 
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        onRemove={removeFromCart}
        onComplete={handlePaymentComplete}
      />
    </div>
  );
};

export default ValentineView;
