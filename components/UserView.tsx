
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

    analytics.track('StartGeneration', { style_name: style.name });
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
    setGenStates(prev => {
      const current = prev[styleId];
      if (current && current.result) {
        return { ...prev, [styleId]: { ...current, isHighRes: true } };
      }
      return prev;
    });
    handleDownload(styleId);
    analytics.track('ClaimFree', { style_id: styleId });
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
    link.download = `my-art-${styleId}.png`;
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
    analytics.track('Purchase', { value: tx.amount, currency: 'INR', transaction_id: paymentId, num_items: paidItemIds.length });
    setGenStates(prev => {
      const newState = { ...prev };
      paidItemIds.forEach(id => { if (newState[id]) newState[id].isHighRes = true; });
      return newState;
    });
    setCart([]);
    setShowCheckout(false);
    alert("Wonderful! Your payment is done. Now you can download your beautiful art.");
  };

  const renderStyleCard = (s: StyleTemplate) => {
    const state = genStates[s.id] || { isLoading: false, result: null, error: null, refinement: '', isHighRes: false };
    
    return (
      <div key={s.id} className="group relative bg-white rounded-[2.5rem] overflow-hidden border-2 border-rose-50 shadow-lg hover:shadow-2xl transition-all duration-500 flex flex-col hover:-translate-y-2">
        <div className="px-7 pt-7 pb-4 flex justify-between items-center bg-gradient-to-b from-rose-50/50 to-white">
          <h4 className="font-black text-xl sm:text-2xl text-slate-800 tracking-tight leading-tight serif italic">{s.name}</h4>
        </div>

        <div className="aspect-square relative bg-rose-50 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-10 pointer-events-none ring-1 ring-inset ring-rose-500/20 shadow-[inset_0_0_80px_rgba(244,63,94,0.1)]"></div>
          
          {state.isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-4 bg-white/60 backdrop-blur-md z-30">
              <div className="w-12 h-12 border-4 border-rose-500 border-t-rose-100 rounded-full animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 animate-pulse">Creating Magic...</p>
            </div>
          ) : state.result ? (
            <div className="w-full h-full relative z-20 animate-in zoom-in-95 duration-700 flex items-center justify-center overflow-hidden" onContextMenu={(e) => !state.isHighRes && e.preventDefault()}>
              <img src={state.result} className={`max-w-full max-h-full object-contain ${!state.isHighRes ? 'pointer-events-none' : ''}`} alt={s.name} />
              {!state.isHighRes && <Watermark text="www.chatgptdigital.store" />}
              <button onClick={() => setGenStates(prev => ({...prev, [s.id]: {...prev[s.id], result: null}}))} className="absolute top-4 right-4 p-2.5 bg-white/60 backdrop-blur-md rounded-xl text-rose-600 hover:bg-rose-600 hover:text-white transition-all z-[50]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          ) : (
            <div className="w-full h-full cursor-pointer relative z-20 group/img flex items-center justify-center" onClick={() => handleGenerate(s)}>
              <img src={s.imageUrl} className="relative z-10 max-w-full max-h-full object-contain transition-all duration-700 group-hover/img:scale-[1.03]" alt={s.name} loading="lazy" />
              <div className="absolute inset-0 z-30 bg-rose-900/20 opacity-0 group-hover/img:opacity-100 transition-all duration-500 flex items-center justify-center backdrop-blur-[2px]">
                <div className="bg-white/95 px-7 py-3.5 rounded-2xl font-black text-[10px] uppercase text-rose-600 shadow-2xl flex items-center gap-2">
                  <span>Try this style ✨</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-7 space-y-4 flex-grow flex flex-col justify-between bg-gradient-to-b from-white to-rose-50/20">
          <div className="space-y-3">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">{s.description}</p>
             {state.result && (
              <div className="space-y-2">
                  <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest ml-1 block">Change anything? (Optional)</label>
                  <div className="flex gap-2">
                      <input 
                          type="text" value={state.refinement}
                          onChange={(e) => setGenStates(prev => ({...prev, [s.id]: {...prev[s.id], refinement: e.target.value}}))}
                          placeholder="Ex: make it blue, add a smile..."
                          className="flex-grow px-4 py-2 rounded-xl bg-white border-2 border-rose-100 text-[11px] font-semibold outline-none focus:border-rose-300"
                          onKeyPress={(e) => e.key === 'Enter' && handleGenerate(s)}
                      />
                      <button onClick={() => handleGenerate(s)} className="px-4 py-2 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase">Redo</button>
                  </div>
              </div>
             )}
          </div>

          <div className="space-y-3 pt-4 border-t-2 border-rose-50">
            {state.result ? (
              <div className="flex flex-col gap-3">
                {state.isHighRes ? (
                  <button onClick={() => handleDownload(s.id)} className="w-full py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95">
                    Download My Art 📸
                  </button>
                ) : (
                  <>
                    {!freePhotoClaimed ? (
                      <button onClick={() => handleClaimFree(s.id)} className="w-full py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-xl border-b-4 border-rose-800 active:scale-95">
                        Get 1 photo for free 🎁
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleAddToCart(s.id)} className="py-3 border-2 border-rose-100 bg-white rounded-[1.25rem] font-black text-[10px] text-rose-400 uppercase tracking-widest hover:bg-rose-50 transition-all">Save</button>
                        <button onClick={() => { handleAddToCart(s.id); setShowCheckout(true); }} className="py-3 bg-slate-900 text-white rounded-[1.25rem] font-black text-[10px] uppercase shadow-xl hover:bg-black active:scale-95">Get Clear HD</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              !state.isLoading && (
                <button onClick={() => handleGenerate(s)} className="w-full py-5 bg-rose-600 text-white rounded-[1.5rem] font-black text-[12px] uppercase tracking-widest shadow-xl hover:bg-rose-700 active:scale-95 border-b-4 border-rose-800">
                  Create My Art ✨
                </button>
              )
            )}
            {state.error && <p className="text-[9px] text-rose-600 font-bold uppercase text-center">{state.error}</p>}
          </div>
        </div>
      </div>
    );
  };

  if (!settings) return <div className="py-20 flex flex-col items-center justify-center gap-4 text-rose-400"><div className="w-10 h-10 border-4 border-rose-100 border-t-rose-500 rounded-full animate-spin" /><p className="font-bold">Opening your studio...</p></div>;

  const currencySymbol = storageService.getCurrencySymbol(settings.payment.currency);

  return (
    <div className="space-y-8 sm:space-y-12 pb-24 max-w-7xl mx-auto px-4">
      <section className="bg-white rounded-[2.5rem] p-6 sm:p-10 shadow-2xl border border-rose-100 text-center space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="relative space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl animate-bounce">📽️</span>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight uppercase serif italic">See how it works</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="relative mx-auto w-full max-w-[280px] sm:max-w-xs aspect-[9/16] bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl ring-8 ring-rose-50 overflow-hidden">
              <video autoPlay muted playsInline loop controls className="w-full h-full object-contain rounded-2xl">
                <source src="https://ghdwufjkpjuidyfsgkde.supabase.co/storage/v1/object/public/media/howto.mp4" type="video/mp4" />
              </video>
            </div>
            <div className="text-left space-y-6">
              {[1, 2, 3].map(num => (
                <div key={num} className="flex gap-4 items-start group">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-black flex-shrink-0 group-hover:scale-110 transition-transform shadow-sm">{num}</div>
                  <div>
                    <h4 className="font-black text-slate-800 uppercase text-sm">{num === 1 ? 'Add Your Photo' : num === 2 ? 'Choose Your Style' : 'Get Your Art'}</h4>
                    <p className="text-slate-500 text-xs font-medium">{num === 1 ? 'Upload a clear photo of your face.' : num === 2 ? 'Pick a style and watch the magic.' : 'Save your free photo or buy more beautiful art!'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-12 shadow-2xl border border-rose-100 text-center">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-rose-50 rounded-full blur-3xl opacity-60" />
        <div className="relative max-w-4xl mx-auto flex flex-col items-center gap-6 sm:gap-8">
          <div className="relative" onClick={() => uploadInputRef.current?.click()}>
            <div className={`w-36 h-36 md:w-52 md:h-52 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 shadow-2xl cursor-pointer hover:scale-[1.03] active:scale-95 ${userPhoto ? 'bg-white ring-8 ring-rose-50' : 'bg-gradient-to-br from-rose-500 to-pink-500 shadow-rose-200'}`}>
              {userPhoto ? <img src={userPhoto} className="w-full h-full object-cover rounded-[2.5rem]" alt="Your Photo" /> : <div className="flex flex-col items-center gap-2"><span className="text-white text-3xl sm:text-4xl">📸</span><span className="text-[10px] sm:text-[11px] font-black text-rose-100 uppercase">Add Your Photo</span></div>}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100 mb-1">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Get 1 Free Photo 🎁</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tighter serif leading-tight">AI Art <span className="text-rose-500 italic">Studio</span></h1>
            <p className="text-sm md:text-base text-slate-400 font-semibold max-w-lg mx-auto leading-relaxed px-4">
              Make your photos look beautiful with AI. Get your first photo for free. Clear HD art for just <span className="text-slate-900 font-bold">{currencySymbol}{settings.payment.photoPrice}</span>.
            </p>
          </div>

          {!userPhoto && (
            <button onClick={() => uploadInputRef.current?.click()} className="px-8 py-4 bg-rose-600 text-white rounded-[1.5rem] font-black text-base shadow-2xl shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95">Choose Photo 📸</button>
          )}
          
          <input type="file" ref={uploadInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
      </section>

      <section className="space-y-8">
        <div className="flex flex-col items-center text-center gap-2">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight serif italic">Pick Your Favorite Look</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Select one to start the magic</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
          {styles.map((s) => renderStyleCard(s))}
        </div>
      </section>

      <CheckoutModal isOpen={showCheckout} onClose={() => setShowCheckout(false)} cart={cart} onRemove={removeFromCart} onComplete={handlePaymentComplete} />
    </div>
  );
};

export default UserView;
