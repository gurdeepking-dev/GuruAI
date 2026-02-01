
import React, { useState, useEffect, useRef } from 'react';
import { StyleTemplate, CartItem, User } from '../types';
import { storageService } from '../services/storage';
import { geminiService } from '../services/geminiService';
import { usageService } from '../services/usageService';
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
  cart, user, addToCart, showCheckout, setShowCheckout, removeFromCart, onLoginRequired, onUserUpdate 
}) => {
  const [styles, setStyles] = useState<StyleTemplate[]>([]);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [genStates, setGenStates] = useState<GenerationState>({});
  const uploadInputRef = useRef<HTMLInputElement>(null);
  
  const [freePhotoClaimed, setFreePhotoClaimed] = useState(false);
  const currencySymbol = storageService.getCurrencySymbol();
  const settings = storageService.getAdminSettings();

  useEffect(() => {
    const loadedStyles = storageService.getStyles();
    setStyles(loadedStyles);
    
    const initialStates: GenerationState = {};
    loadedStyles.forEach(s => {
      initialStates[s.id] = { isLoading: false, result: null, error: null, refinement: '', isHighRes: false };
    });
    setGenStates(initialStates);
    setFreePhotoClaimed(usageService.hasClaimedFreePhoto());
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUserPhoto(reader.result as string);
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
      alert("Please upload your photo first!");
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
    if (freePhotoClaimed) {
      alert(`You have already claimed your free photo. New ones are only ${currencySymbol}${settings.payment.photoPrice}!`);
      return;
    }

    usageService.markFreePhotoAsUsed();
    setFreePhotoClaimed(true);
    setGenStates(prev => ({
      ...prev,
      [styleId]: { ...prev[styleId], isHighRes: true }
    }));
    alert("Success! Your free high-res photo is unlocked and ready for download.");
  };

  const handleUpdateRefinement = (id: string, val: string) => {
    setGenStates(prev => ({
      ...prev,
      [id]: { ...prev[id], refinement: val }
    }));
  };

  const handleAddToCart = (styleId: string) => {
    const state = genStates[styleId];
    const style = styles.find(s => s.id === styleId);
    if (!state.result || !style) return;

    const currentPrice = settings.payment.photoPrice || 5.00;

    const newItem: CartItem = {
      id: Date.now().toString(),
      styledImage: state.result,
      styleName: style.name,
      price: currentPrice,
    };
    addToCart(newItem);
    alert(`${style.name} added to your cart!`);
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

  return (
    <div className="space-y-16 pb-24">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-white rounded-[4rem] p-12 shadow-2xl border border-slate-100 transition-all duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl opacity-50 -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-50 rounded-full blur-3xl opacity-50 -ml-32 -mb-32" />

        <div className="max-w-4xl mx-auto flex flex-col items-center text-center gap-10 relative z-10">
          <div className="relative group cursor-pointer" onClick={() => uploadInputRef.current?.click()}>
            <div className={`w-40 h-40 rounded-[3rem] flex items-center justify-center transition-all duration-700 shadow-2xl ${userPhoto ? 'bg-white ring-8 ring-indigo-50' : 'bg-indigo-600 animate-pulse hover:scale-105'}`}>
              {userPhoto ? (
                <img src={userPhoto} className="w-full h-full object-cover rounded-[3rem]" alt="Your portrait" />
              ) : (
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              )}
            </div>
            {userPhoto && (
              <div className="absolute -bottom-4 -right-4 bg-indigo-600 text-white p-4 rounded-[1.5rem] shadow-xl border-4 border-white transition-transform group-hover:scale-110">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl font-black text-slate-900 tracking-tighter leading-tight">
              {userPhoto ? "Magic in Progress" : "Legendary AI Portraits"}
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
              Professional artistic transformations for only {currencySymbol}{settings.payment.photoPrice}.
              {!freePhotoClaimed && " Get your very first photo FREE!"}
            </p>
          </div>

          {!userPhoto && (
            <button 
              onClick={() => uploadInputRef.current?.click()}
              className="px-12 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center gap-4"
            >
              Upload Portrait
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </button>
          )}

          <input type="file" ref={uploadInputRef} accept="image/*" onChange={handleFileUpload} className="hidden" />
        </div>
      </section>

      {/* STYLE GALLERY */}
      <section className="space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-4">
          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Style Collection</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Instant transformation at your fingertips</p>
          </div>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100">
             <div className="flex -space-x-3">
               {[18,19,20].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                   <img src={`https://i.pravatar.cc/100?img=${i}`} className="w-full h-full object-cover" alt="User avatar" />
                 </div>
               ))}
             </div>
             <span className="text-xs font-bold text-slate-400">Join 15k+ artists</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {styles.map((s) => {
            const state = genStates[s.id] || { isLoading: false, result: null, error: null, refinement: '', isHighRes: false };
            return (
              <div key={s.id} className="bg-white rounded-[3.5rem] overflow-hidden border border-slate-100 shadow-xl transition-all duration-500 hover:shadow-2xl flex flex-col group">
                <div className="aspect-[4/5] relative overflow-hidden bg-slate-100">
                  {state.isLoading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center gap-6 bg-indigo-50/30">
                      <div className="w-20 h-20 relative">
                        <div className="absolute inset-0 border-8 border-indigo-100 rounded-full" />
                        <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      </div>
                      <p className="text-sm font-black text-indigo-900 uppercase tracking-widest animate-pulse">Painting Your Story...</p>
                    </div>
                  ) : state.result ? (
                    <div className="w-full h-full relative animate-in zoom-in-95 fade-in duration-700">
                      <img src={state.result} className="w-full h-full object-cover" alt={s.name} />
                      {!state.isHighRes && <Watermark text="StyleSwapAI.com" />}
                    </div>
                  ) : (
                    <div 
                      className="w-full h-full relative cursor-pointer" 
                      onClick={() => handleGenerate(s)}
                    >
                      <img src={s.imageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" alt={s.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/10 to-transparent flex items-end p-10">
                        <div className="text-white space-y-2">
                          <h4 className="font-black text-3xl tracking-tighter">{s.name}</h4>
                          <p className="text-sm opacity-60 font-medium leading-relaxed max-w-[80%]">{s.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-10 space-y-8 flex-grow flex flex-col">
                  {!state.result ? (
                    <button 
                      onClick={() => handleGenerate(s)}
                      disabled={state.isLoading}
                      className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all transform active:scale-95 disabled:opacity-50"
                    >
                      Apply Style
                    </button>
                  ) : (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Refine with AI</label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            value={state.refinement}
                            onChange={(e) => handleUpdateRefinement(s.id, e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleGenerate(s)}
                            placeholder="e.g. Blue eyes, glasses..."
                            className="flex-grow bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                          />
                          <button 
                            onClick={() => handleGenerate(s)}
                            disabled={state.isLoading}
                            className="bg-slate-900 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-black transition-all shadow-lg active:scale-90"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {state.isHighRes ? (
                          <button 
                            onClick={() => handleDownload(s.id)}
                            className="w-full py-5 bg-green-600 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-3"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Masterpiece
                          </button>
                        ) : (
                          <div className="grid grid-cols-1 gap-3">
                            {!freePhotoClaimed ? (
                               <button 
                                onClick={() => handleClaimFree(s.id)}
                                className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-[1.5rem] font-black shadow-xl hover:opacity-90 transition-all"
                              >
                                Claim My 1st Photo FREE
                              </button>
                            ) : null}
                            
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                  onClick={() => handleAddToCart(s.id)}
                                  className="py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                                >
                                  Add to Cart
                                </button>
                                <button 
                                  onClick={() => { handleAddToCart(s.id); setShowCheckout(true); }}
                                  className="py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg"
                                >
                                  Buy Now
                                </button>
                            </div>
                            <p className="text-center text-[10px] font-bold text-slate-400">Standard License: {currencySymbol}{settings.payment.photoPrice}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {state.error && <p className="text-[10px] text-red-500 font-bold text-center mt-2">{state.error}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CheckoutModal 
        isOpen={showCheckout}
        onClose={() => setShowCheckout(false)}
        cart={cart}
        onRemove={removeFromCart}
        onComplete={() => {
          alert("Payment Simulated Successful! Your high-res versions are unlocked.");
          setShowCheckout(false);
        }}
      />
    </div>
  );
};

export default UserView;
