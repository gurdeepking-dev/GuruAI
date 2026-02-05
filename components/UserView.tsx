
import React, { useState, useEffect, useRef } from 'react';
import { StyleTemplate, CartItem, User, TransactionRecord } from '../types';
import { storageService } from '../services/storage';
import { geminiService } from '../services/geminiService';
import { usageService } from '../services/usageService';
import { logger } from '../services/logger';
import { analytics } from '../services/analytics';
import Watermark from './Watermark';
import CheckoutModal from './CheckoutModal';

interface UserViewProps {
  cart: CartItem[];
  user: User | null;
  addToCart: (item: CartItem) => void;
  showCheckout: boolean;
  setShowCheckout: (val: boolean) => void;
  removeFromCart: (id: string) => void;
  onLoginRequired: () => void;
  onUserUpdate: () => void;
  setCart: (cart: CartItem[]) => void;
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

const UserView: React.FC<UserViewProps> = ({ 
  cart, user, addToCart, showCheckout, setShowCheckout, removeFromCart, setCart
}) => {
  const [styles, setStyles] = useState<StyleTemplate[]>([]);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [genStates, setGenStates] = useState<GenerationState>({});
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [freePhotoClaimed, setFreePhotoClaimed] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    logger.info('View', 'UserView mounted');
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
      
      setStyles(loadedStyles);
      setSettings(adminSettings);
      
      const initialStates: GenerationState = {};
      loadedStyles.forEach(s => {
        initialStates[s.id] = { isLoading: false, result: null, error: null, refinement: '', isHighRes: false };
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
        const isFirstUpload = !userPhoto;
        setUserPhoto(base64);
        setGenStates(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(id => {
            newState[id] = { ...newState[id], result: null, error: null, isHighRes: false };
          });
          return newState;
        });

        if (isFirstUpload) {
          analytics.track('Lead', { method: 'upload' });
        }
        storageService.logActivity('photo_uploaded', { size: file.size, type: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (style: StyleTemplate) => {
    if (!userPhoto) {
      uploadInputRef.current?.click();
      return;
    }

    analytics.track('StartGeneration', { style_name: style.name });
    setGenStates(prev => ({
      ...prev,
      [style.id]: { ...prev[style.id], isLoading: true, error: null }
    }));

    try {
      const state = genStates[style.id];
      const result = await geminiService.generateStyle(userPhoto, style.prompt, state.refinement);
      
      setGenStates(prev => ({
        ...prev,
        [style.id]: { ...prev[style.id], isLoading: false, result }
      }));
      storageService.logActivity('generation_success', { style_id: style.id });
    } catch (err: any) {
      setGenStates(prev => ({
        ...prev,
        [style.id]: { ...prev[style.id], isLoading: false, error: err.message }
      }));
      storageService.logActivity('generation_error', { style_id: style.id, error: err.message });
    }
  };

  const handleClaimFree = (styleId: string) => {
    if (freePhotoClaimed) return;
    usageService.markFreePhotoAsUsed();
    setFreePhotoClaimed(true);
    setGenStates(prev => ({
      ...prev,
      [styleId]: { ...prev[styleId], isHighRes: true }
    }));
    analytics.track('ClaimFree', { style_id: styleId });
    storageService.logActivity('free_claim', { style_id: styleId });
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
      price: settings?.payment.photoPrice || 5.00,
    };
    addToCart(newItem);
  };

  const handleDownload = (styleId: string) => {
    const state = genStates[styleId];
    if (!state.result) return;
    const link = document.createElement('a');
    link.href = state.result;
    link.download = `styleswap-${styleId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    storageService.logActivity('download', { style_id: styleId });
  };

  const handlePaymentComplete = async (paymentId: string, paidItemIds: string[]) => {
    const tx: TransactionRecord = {
      razorpay_payment_id: paymentId,
      user_email: user?.email || 'guest@anonymous.com',
      amount: cart.reduce((s, i) => s + i.price, 0),
      items: cart.map(i => i.styleName),
      status: 'success'
    };
    await storageService.saveTransaction(tx);

    analytics.track('Purchase', {
      value: tx.amount,
      currency: 'INR',
      transaction_id: paymentId,
      num_items: paidItemIds.length
    });

    setGenStates(prev => {
      const newState = { ...prev };
      paidItemIds.forEach(id => {
        if (newState[id]) newState[id].isHighRes = true;
      });
      return newState;
    });

    setCart([]);
    setShowCheckout(false);
    alert("Payment Verified! Your photos are ready.");
  };

  if (!settings) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4 text-rose-400">
      <div className="w-10 h-10 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
      <p className="font-bold tracking-tight">Sprinkling Magic Dust...</p>
    </div>
  );

  const currencySymbol = storageService.getCurrencySymbol(settings.payment.currency);

  return (
    <div className="space-y-12 sm:space-y-16 pb-24 max-w-7xl mx-auto px-4">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 shadow-2xl border border-rose-100 mt-4 text-center">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-rose-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-pink-50 rounded-full blur-3xl opacity-60" />
        
        <div className="relative max-w-4xl mx-auto flex flex-col items-center gap-6 sm:gap-8">
          <div className="relative" onClick={() => uploadInputRef.current?.click()}>
            <div className={`w-36 h-36 md:w-52 md:h-52 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 shadow-2xl cursor-pointer hover:scale-[1.03] active:scale-95 ${userPhoto ? 'bg-white ring-8 ring-rose-50' : 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-200'}`}>
              {userPhoto ? (
                <img src={userPhoto} className="w-full h-full object-cover rounded-[2.5rem]" alt="Target" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-white text-3xl sm:text-4xl">📸</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-rose-100 uppercase tracking-widest">Upload Your Photo</span>
                </div>
              )}
            </div>
            {userPhoto && (
              <div className="absolute -bottom-2 -right-2 bg-rose-600 p-2.5 rounded-2xl shadow-lg border-4 border-white text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </div>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Make first AI photo for free 🎁</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-tight serif">
              StyleSwap <span className="text-rose-500 italic">Studio</span>
            </h1>
            <p className="text-sm md:text-base text-slate-400 font-semibold max-w-lg mx-auto leading-relaxed px-4">
              Convert your photos into epic masterpieces. Claim your first high-res for <span className="text-rose-500">FREE</span>. Unlock more for just <span className="text-slate-900">{currencySymbol}{settings.payment.photoPrice}</span>.
            </p>
          </div>

          {!userPhoto && (
            <button onClick={() => uploadInputRef.current?.click()} className="group px-8 py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-base shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">
              Upload Your Photo ✨
            </button>
          )}
          
          <input type="file" ref={uploadInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
      </section>

      {/* Style Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
        {styles.map((s) => {
          const state = genStates[s.id] || { isLoading: false, result: null, error: null, refinement: '', isHighRes: false };
          const displayImage = state.result || s.imageUrl;
          
          return (
            <div key={s.id} className="group relative bg-white rounded-[2.5rem] overflow-hidden border-2 border-rose-50 shadow-lg hover:shadow-2xl hover:shadow-rose-100 transition-all duration-500 flex flex-col hover:-translate-y-2">
              {/* Card Header (Title above Frame) */}
              <div className="px-7 pt-7 pb-4 flex justify-between items-center bg-gradient-to-b from-rose-50/50 to-white">
                <h4 className="font-black text-xl sm:text-2xl text-slate-800 tracking-tight leading-tight serif italic">{s.name}</h4>
                {s.id === 'valentine-love' && (
                  <span className="text-[8px] font-black text-white bg-rose-500 px-2 py-0.5 rounded-full uppercase tracking-widest shadow-lg shadow-rose-200">Featured</span>
                )}
              </div>

              {/* Valentine Accent: Floating Heart in Corner */}
              <div className="absolute top-[4.5rem] left-4 z-40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                 <span className="text-2xl animate-bounce inline-block">💖</span>
              </div>

              {/* Square Aspect Ratio Frame (1:1) */}
              <div className="aspect-square relative bg-rose-50 flex items-center justify-center overflow-hidden">
                {/* Decorative Inner Glow */}
                <div className="absolute inset-0 z-10 pointer-events-none ring-1 ring-inset ring-rose-500/20 shadow-[inset_0_0_80px_rgba(244,63,94,0.1)]"></div>
                
                {/* Blurred Valentine Background Filler */}
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-rose-200/40 via-pink-100/30 to-rose-200/40"></div>
                <img 
                  src={displayImage} 
                  className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-110" 
                  alt="" 
                />
                
                {state.isLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4 bg-white/60 backdrop-blur-md z-30">
                    <div className="w-12 h-12 border-4 border-rose-500 border-t-rose-100 rounded-full animate-spin" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 animate-pulse">Painting with Love...</p>
                  </div>
                ) : state.result ? (
                  <div className="w-full h-full relative z-20 animate-in zoom-in-95 duration-700 flex items-center justify-center">
                    <img src={state.result} className="max-w-full max-h-full object-contain" alt={s.name} decoding="async" />
                    {!state.isHighRes && <Watermark text="Valentine Studio" />}
                    <button 
                      onClick={() => setGenStates(prev => ({...prev, [s.id]: {...prev[s.id], result: null}}))}
                      className="absolute top-4 right-4 p-2.5 bg-white/60 backdrop-blur-md rounded-xl text-rose-600 hover:bg-rose-600 hover:text-white transition-all z-30 shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full cursor-pointer relative z-20 group/img flex items-center justify-center" onClick={() => handleGenerate(s)}>
                    {/* Main Image - Fully visible via object-contain */}
                    <img 
                      src={s.imageUrl} 
                      className="relative z-10 max-w-full max-h-full object-contain transition-all duration-700 group-hover/img:scale-[1.03]" 
                      alt={s.name} 
                      loading="lazy"
                      decoding="async"
                    />
                    {/* Overlay Label with romantic style */}
                    <div className="absolute inset-0 z-30 bg-rose-900/20 opacity-0 group-hover/img:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="bg-white/95 px-7 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest text-rose-600 shadow-2xl flex items-center gap-2">
                        <span>Click to apply this style</span>
                        <span className="text-base">❤</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="p-7 space-y-4 flex-grow flex flex-col justify-between bg-gradient-to-b from-white to-rose-50/20">
                <div className="space-y-3">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{s.description}</p>
                    
                   {state.result && (
                    <div className="animate-in slide-in-from-bottom-2 duration-500">
                        <div className="relative group/input">
                            <label className="text-[8px] font-black text-rose-400 uppercase tracking-[0.2em] ml-1 mb-1.5 block">Fine Tune Artistic Result</label>
                            <input 
                                type="text" value={state.refinement}
                                onChange={(e) => setGenStates(prev => ({...prev, [s.id]: {...prev[s.id], refinement: e.target.value}}))}
                                placeholder="E.g. softer glow, more roses..."
                                className="w-full px-5 py-3 rounded-2xl bg-white border-2 border-rose-100 text-[11px] font-semibold outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 transition-all placeholder:text-slate-300"
                                onKeyPress={(e) => e.key === 'Enter' && handleGenerate(s)}
                            />
                        </div>
                    </div>
                   )}
                </div>

                <div className="space-y-3 pt-4 border-t-2 border-rose-50">
                  {state.result ? (
                    <div className="grid grid-cols-2 gap-3">
                      {state.isHighRes ? (
                        <button onClick={() => handleDownload(s.id)} className="col-span-2 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download HD Photo
                        </button>
                      ) : (
                        <>
                          {!freePhotoClaimed && (
                            <button onClick={() => handleClaimFree(s.id)} className="col-span-2 py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-rose-700 transition-all active:scale-95 border-b-4 border-rose-800">
                              Claim Free Love Photo 🎁
                            </button>
                          )}
                          <button onClick={() => handleAddToCart(s.id)} className="py-3 border-2 border-rose-100 bg-white rounded-[1.25rem] font-black text-[10px] text-rose-400 uppercase tracking-widest hover:bg-rose-50 transition-all">
                            Add Cart
                          </button>
                          <button onClick={() => { handleAddToCart(s.id); setShowCheckout(true); }} className="py-3 bg-slate-900 text-white rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest hover:bg-black shadow-xl transition-all">
                            Unlock HD
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    !state.isLoading && (
                      <button onClick={() => handleGenerate(s)} className="w-full py-5 bg-rose-600 text-white rounded-[1.5rem] font-black text-[12px] uppercase tracking-widest shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-3 group/btn active:scale-95 border-b-4 border-rose-800">
                        <span>Transform Now</span>
                        <span className="text-lg group-hover/btn:scale-125 transition-transform">❤</span>
                      </button>
                    )
                  )}
                  {state.error && (
                    <div className="p-3 rounded-2xl bg-rose-50 border-2 border-rose-100">
                      <p className="text-[9px] text-rose-600 font-bold uppercase tracking-widest leading-relaxed">{state.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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

export default UserView;
