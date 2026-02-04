
import React, { useState, useEffect, useRef } from 'react';
import { StyleTemplate, CartItem, User, TransactionRecord } from '../types';
import { storageService } from '../services/storage';
import { geminiService } from '../services/geminiService';
import { usageService } from '../services/usageService';
import { logger } from '../services/logger';
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
        setUserPhoto(base64);
        setGenStates(prev => {
          const newState = { ...prev };
          Object.keys(newState).forEach(id => {
            newState[id] = { ...newState[id], result: null, error: null, isHighRes: false };
          });
          return newState;
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (style: StyleTemplate) => {
    if (!userPhoto) {
      uploadInputRef.current?.click();
      return;
    }

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
    setGenStates(prev => ({
      ...prev,
      [styleId]: { ...prev[styleId], isHighRes: true }
    }));
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

    setGenStates(prev => {
      const newState = { ...prev };
      paidItemIds.forEach(id => {
        if (newState[id]) newState[id].isHighRes = true;
      });
      return newState;
    });

    setCart([]);
    setShowCheckout(false);
    alert("Payment Verified! Your romantic photo are ready.");
  };

  if (!settings) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4 text-rose-400">
      <div className="w-10 h-10 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
      <p className="font-bold tracking-tight">Sprinkling Magic Dust...</p>
    </div>
  );

  const currencySymbol = storageService.getCurrencySymbol(settings.payment.currency);

  return (
    <div className="space-y-16 sm:space-y-20 pb-24 max-w-7xl mx-auto px-4">
      {/* Valentine Hero Section */}
      <section className="relative overflow-hidden bg-white rounded-[2.5rem] md:rounded-[5rem] p-6 md:p-16 shadow-2xl border border-rose-100 mt-6 text-center">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-rose-50 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-pink-50 rounded-full blur-3xl opacity-60" />
        
        <div className="relative max-w-4xl mx-auto flex flex-col items-center gap-6 sm:gap-10">
          <div className="relative" onClick={() => uploadInputRef.current?.click()}>
            <div className={`w-32 h-32 md:w-56 md:h-56 rounded-[3rem] flex items-center justify-center transition-all duration-500 shadow-2xl cursor-pointer hover:scale-[1.03] active:scale-95 ${userPhoto ? 'bg-white ring-6 sm:ring-8 ring-rose-50' : 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-200'}`}>
              {userPhoto ? (
                <img src={userPhoto} className="w-full h-full object-cover rounded-[3rem]" alt="Target" />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-white text-3xl sm:text-4xl">❤️</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-rose-100 uppercase tracking-widest">Upload Your Photo</span>
                </div>
              )}
            </div>
            {userPhoto && (
              <div className="absolute -bottom-2 -right-2 bg-rose-600 p-2.5 sm:p-3 rounded-2xl shadow-lg border-2 sm:border-4 border-white text-white scale-110">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-rose-100 mb-1 sm:mb-2">
              <span className="flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-[8px] sm:text-[10px] font-black text-rose-600 uppercase tracking-widest">Gift a Masterpiece starting at {currencySymbol}0 🌹</span>
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-tight serif">
              Spread the <span className="text-rose-500 italic">Love</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-slate-400 font-semibold max-w-lg mx-auto leading-relaxed px-4">
              Turn your magic moments into art. Claim your first high-res photo for <span className="text-rose-500">FREE</span>. Love it? Unlock more for just <span className="text-slate-900">{currencySymbol}{settings.payment.photoPrice}</span>.
            </p>
          </div>

          {!userPhoto && (
            <button onClick={() => uploadInputRef.current?.click()} className="group px-8 sm:px-10 py-4 sm:py-5 bg-rose-600 text-white rounded-[1.5rem] sm:rounded-[2rem] font-black text-base sm:text-lg shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all hover:-translate-y-1">
              Start Your Magic ✨
            </button>
          )}
          
          <input type="file" ref={uploadInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
      </section>

      {/* Romantic Style Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {styles.map((s) => {
          const state = genStates[s.id] || { isLoading: false, result: null, error: null, refinement: '', isHighRes: false };
          return (
            <div key={s.id} className="group bg-white rounded-[2.5rem] overflow-hidden border border-rose-50 shadow-xl hover:shadow-2xl transition-all duration-500 flex flex-col hover:-translate-y-2">
              {/* Photo Area - Using 3:2 landscape aspect ratio to fit wide photos perfectly */}
              <div className="aspect-[3/2] relative bg-rose-50 flex items-center justify-center overflow-hidden">
                {state.isLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4 bg-white/95 backdrop-blur-md z-10">
                    <div className="w-10 h-10 border-4 border-rose-100 border-t-rose-600 rounded-full animate-spin" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-600">Creating Romance</p>
                  </div>
                ) : state.result ? (
                  <div className="w-full h-full relative animate-in zoom-in-95 duration-700">
                    <img src={state.result} className="w-full h-full object-cover" alt={s.name} decoding="async" />
                    {!state.isHighRes && <Watermark text="Valentine Limited" />}
                    <button 
                      onClick={() => setGenStates(prev => ({...prev, [s.id]: {...prev[s.id], result: null}}))}
                      className="absolute top-3 right-3 p-2 bg-white/30 backdrop-blur-md rounded-xl text-white hover:bg-white hover:text-rose-600 transition-all z-20"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-full cursor-pointer relative group/img flex items-center justify-center bg-white p-2" onClick={() => handleGenerate(s)}>
                    {/* Background Soft Glow */}
                    <img src={s.imageUrl} className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-20" alt="" />
                    {/* Contained Preview Image */}
                    <img 
                      src={s.imageUrl} 
                      className="relative z-10 w-full h-full object-contain rounded-2xl shadow-xl transition-all duration-700 group-hover/img:scale-[1.03] border-2 border-white" 
                      alt={s.name} 
                      loading="lazy"
                      decoding="async"
                    />
                    {/* Apply Label */}
                    <div className="absolute inset-0 z-20 bg-rose-900/10 opacity-0 group-hover/img:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-[1px]">
                      <div className="bg-white px-5 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-widest text-rose-600 shadow-xl">
                        Apply This Look
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="p-6 md:p-8 space-y-4 flex-grow flex flex-col justify-between">
                <div className="space-y-3">
                    <h4 className="font-black text-xl text-slate-800 tracking-tight leading-tight serif">{s.name}</h4>
                    
                   {state.result && (
                    <div className="animate-in slide-in-from-bottom-2 duration-500">
                        <div className="relative group/input">
                            <label className="text-[8px] font-black text-rose-400 uppercase tracking-[0.2em] ml-1.5 mb-1 block">Personalize</label>
                            <input 
                                type="text" value={state.refinement}
                                onChange={(e) => setGenStates(prev => ({...prev, [s.id]: {...prev[s.id], refinement: e.target.value}}))}
                                placeholder="E.g. Add red roses..."
                                className="w-full px-4 py-2.5 rounded-xl bg-rose-50/50 border border-rose-100 text-[10px] font-semibold outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-300 transition-all"
                                onKeyPress={(e) => e.key === 'Enter' && handleGenerate(s)}
                            />
                        </div>
                    </div>
                   )}
                </div>

                <div className="space-y-3 pt-3 border-t border-rose-50">
                  {state.result ? (
                    <div className="grid grid-cols-2 gap-3">
                      {state.isHighRes ? (
                        <button onClick={() => handleDownload(s.id)} className="col-span-2 py-3.5 bg-rose-600 text-white rounded-2xl font-black text-[11px] shadow-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-2 active:scale-95">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download High-Res
                        </button>
                      ) : (
                        <>
                          {!freePhotoClaimed && (
                            <button onClick={() => handleClaimFree(s.id)} className="col-span-2 py-3.5 bg-rose-500 text-white rounded-2xl font-black text-[11px] shadow-xl hover:bg-rose-600 transition-all active:scale-95">
                              Claim 1 Free Surprise
                            </button>
                          )}
                          <button onClick={() => handleAddToCart(s.id)} className="py-2.5 border-2 border-rose-100 rounded-2xl font-black text-[9px] text-rose-400 uppercase tracking-widest hover:bg-rose-50 transition-all">
                            TO CART
                          </button>
                          <button onClick={() => { handleAddToCart(s.id); setShowCheckout(true); }} className="py-2.5 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:bg-black shadow-xl transition-all">
                            GET NOW
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    !state.isLoading && (
                      <button onClick={() => handleGenerate(s)} className="w-full py-3.5 bg-rose-600 text-white rounded-2xl font-black text-[11px] shadow-2xl shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-3 group/btn active:scale-95">
                        <span>Transform Now</span>
                        <span className="group-hover/btn:scale-125 transition-transform">💝</span>
                      </button>
                    )
                  )}
                  {state.error && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-2">
                      <p className="text-[8px] text-rose-600 font-bold leading-tight uppercase tracking-widest">{state.error}</p>
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
