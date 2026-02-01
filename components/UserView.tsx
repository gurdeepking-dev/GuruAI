
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
  // Use in-memory Base64/Object URLs. DO NOT UPLOAD TO CLOUD.
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [genStates, setGenStates] = useState<GenerationState>({});
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [freePhotoClaimed, setFreePhotoClaimed] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    logger.info('View', 'UserView mounted');
    loadContent();
    
    // Cleanup function: revoke any object URLs if used
    return () => {
      logger.info('View', 'UserView unmounting, clearing session data');
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
      logger.info('Session', `User uploaded photo: ${file.name} (${file.size} bytes)`);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Keep strictly in state.
        setUserPhoto(base64);
        
        // Reset results when new photo is uploaded
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
      logger.warn('Session', 'Generation attempted without photo');
      uploadInputRef.current?.click();
      return;
    }

    logger.info('Session', `Starting style generation: ${style.name}`);
    setGenStates(prev => ({
      ...prev,
      [style.id]: { ...prev[style.id], isLoading: true, error: null }
    }));

    try {
      const state = genStates[style.id];
      const result = await geminiService.generateStyle(userPhoto, style.prompt, state.refinement);
      
      // Keep results in local state only.
      setGenStates(prev => ({
        ...prev,
        [style.id]: { ...prev[style.id], isLoading: false, result }
      }));
      logger.info('Session', `Generation complete for: ${style.name}`);
    } catch (err: any) {
      logger.error('Session', `Generation failed for: ${style.name}`, err);
      setGenStates(prev => ({
        ...prev,
        [style.id]: { ...prev[style.id], isLoading: false, error: err.message }
      }));
    }
  };

  const handleClaimFree = (styleId: string) => {
    if (freePhotoClaimed) return;
    logger.info('Session', 'User claiming free photo', { styleId });
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
    logger.debug('Cart', 'Item added', { styleId });
  };

  const handleDownload = (styleId: string) => {
    const state = genStates[styleId];
    if (!state.result) return;
    logger.info('Session', 'Downloading high-res image', { styleId });
    const link = document.createElement('a');
    link.href = state.result;
    link.download = `styleswap-${styleId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePaymentComplete = async (paymentId: string, paidItemIds: string[]) => {
    logger.info('Payment', 'Payment process finalizing', { paymentId, paidItemIds });
    
    // Save transaction to DB for records
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
    logger.info('Payment', 'Payment successfully processed and items unlocked');
    alert("Payment Verified! Your high-res photos are unlocked.");
  };

  if (!settings) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="font-bold">Syncing Artistic Styles...</p>
    </div>
  );

  const currencySymbol = storageService.getCurrencySymbol(settings.payment.currency);

  return (
    <div className="space-y-16 pb-24">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-10">
          <div className="relative cursor-pointer group" onClick={() => uploadInputRef.current?.click()}>
            <div className={`w-40 h-40 rounded-[3rem] flex items-center justify-center transition-all duration-700 shadow-2xl ${userPhoto ? 'bg-white ring-8 ring-indigo-50' : 'bg-indigo-600 animate-pulse hover:scale-105'}`}>
              {userPhoto ? (
                <img src={userPhoto} className="w-full h-full object-cover rounded-[3rem]" alt="Target" />
              ) : (
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter">AI Masterpiece Studio</h1>
            <p className="text-xl text-slate-500 font-medium max-w-lg mx-auto">
              Professional artistic transformations for only {currencySymbol}{settings.payment.photoPrice}. 
              All session data is deleted once you leave.
            </p>
          </div>
          {!userPhoto && (
            <button onClick={() => uploadInputRef.current?.click()} className="px-12 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black transition-all">Upload Photo</button>
          )}
          <input type="file" ref={uploadInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
      </section>

      {/* STYLE GALLERY */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
        {styles.map((s) => {
          const state = genStates[s.id] || { isLoading: false, result: null, error: null, refinement: '', isHighRes: false };
          return (
            <div key={s.id} className="bg-white rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-xl flex flex-col transition-all duration-300 hover:-translate-y-2">
              <div className="aspect-[4/5] relative bg-slate-100">
                {state.isLoading ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center gap-4 bg-indigo-50/20">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-600 animate-pulse">Generating Art...</span>
                  </div>
                ) : state.result ? (
                  <div className="w-full h-full relative">
                    <img src={state.result} className="w-full h-full object-cover animate-in fade-in duration-500" alt={s.name} />
                    {!state.isHighRes && <Watermark text="Session Limited" />}
                  </div>
                ) : (
                  <div className="w-full h-full cursor-pointer relative group" onClick={() => handleGenerate(s)}>
                    <img src={s.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={s.name} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="bg-white px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest">Apply Style</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-10 space-y-6 flex-grow flex flex-col">
                <h4 className="font-black text-2xl text-slate-800 tracking-tight">{s.name}</h4>
                {state.result && (
                  <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Refine</label>
                      <input 
                        type="text" value={state.refinement}
                        onChange={(e) => setGenStates(prev => ({...prev, [s.id]: {...prev[s.id], refinement: e.target.value}}))}
                        placeholder="Add details (e.g. smile, beard)"
                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleGenerate(s)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      {state.isHighRes ? (
                        <button onClick={() => handleDownload(s.id)} className="col-span-2 py-4 bg-green-600 text-white rounded-2xl font-black shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Download High-Res
                        </button>
                      ) : (
                        <>
                          {!freePhotoClaimed && <button onClick={() => handleClaimFree(s.id)} className="col-span-2 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">Claim 1 Free Copy</button>}
                          <button onClick={() => handleAddToCart(s.id)} className="py-4 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50">ADD TO CART</button>
                          <button onClick={() => { handleAddToCart(s.id); setShowCheckout(true); }} className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black shadow-lg">BUY NOW</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
                {!state.result && !state.isLoading && (
                  <button onClick={() => handleGenerate(s)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">Apply Style</button>
                )}
                {state.error && <p className="text-[10px] text-red-500 font-bold text-center bg-red-50 p-2 rounded-xl border border-red-100">{state.error}</p>}
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
