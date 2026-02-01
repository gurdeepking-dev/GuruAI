
import React, { useState } from 'react';
import { CartItem } from '../types';
import { storageService } from '../services/storage';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: string) => void;
  onComplete: (paidItemIds: string[]) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cart, onRemove, onComplete }) => {
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const currencySymbol = storageService.getCurrencySymbol();
  const settings = storageService.getAdminSettings();

  const handlePay = async () => {
    if (!email) {
      setError("Please provide a valid email for the receipt.");
      return;
    }

    const keyId = settings.payment.keyId;
    if (!keyId) {
      setError("Razorpay is not configured in the Admin Panel.");
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const options = {
        key: keyId,
        amount: Math.round(total * 100), // Razorpay expects amount in subunits (paise for INR)
        currency: settings.payment.currency || "INR",
        name: "StyleSwap AI Studio",
        description: `Purchase of ${cart.length} Art Masterpieces`,
        image: "https://indigo-600-rounded-2xl-placeholder.com/logo.png",
        handler: function (response: any) {
          // Payment Successful
          setIsProcessing(false);
          onComplete(cart.map(item => item.id));
          setEmail('');
        },
        prefill: {
          email: email,
        },
        notes: {
          items: cart.map(i => i.styleName).join(', ')
        },
        theme: {
          color: "#4f46e5"
        },
        modal: {
          ondismiss: function() {
            setIsProcessing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        setError(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      setError("Could not initialize Razorpay. Please check your connection.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-2xl font-black text-slate-900 tracking-tighter">Secure Checkout</h4>
              <p className="text-sm text-slate-500 font-medium">Get your unwatermarked high-res copies</p>
            </div>
            {!isProcessing && (
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">✕</button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
            {cart.length > 0 ? cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                <img src={item.styledImage} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt={item.styleName} />
                <div className="flex-grow">
                  <p className="font-black text-slate-800 text-sm">{item.styleName}</p>
                  <p className="text-xs text-indigo-600 font-black">{currencySymbol}{item.price.toFixed(2)}</p>
                </div>
                {!isProcessing && (
                  <button 
                    onClick={() => onRemove(item.id)} 
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            )) : (
              <div className="text-center py-12 text-slate-400 italic bg-slate-50 rounded-3xl border border-dashed font-bold">
                Your cart is empty
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email for Receipt</label>
              <input 
                type="email" 
                disabled={isProcessing}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com" 
                className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium text-sm disabled:opacity-50" 
              />
            </div>
            {error && <p className="text-red-500 text-[10px] font-bold text-center bg-red-50 p-2 rounded-xl">{error}</p>}
          </div>

          <div className="p-5 bg-indigo-600 rounded-2xl flex justify-between items-center text-white shadow-xl shadow-indigo-100">
            <span className="font-bold opacity-80 text-sm">Total Payable</span>
            <span className="text-2xl font-black">{currencySymbol}{total.toFixed(2)}</span>
          </div>

          <button 
            onClick={handlePay}
            disabled={cart.length === 0 || isProcessing}
            className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-lg shadow-xl hover:bg-black transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Launching Gateway...
              </>
            ) : (
              `Pay ${currencySymbol}${total.toFixed(2)} with Razorpay`
            )}
          </button>
          
          <div className="flex items-center justify-center gap-2">
            <svg className="w-3 h-3 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Powered by Official Razorpay Checkout</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
