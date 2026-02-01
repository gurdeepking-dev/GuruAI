
import React, { useState } from 'react';
import { CartItem } from '../types';
import { storageService } from '../services/storage';
import { logger } from '../services/logger';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: string) => void;
  onComplete: (paymentId: string, paidItemIds: string[]) => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cart, onRemove, onComplete }) => {
  const [email, setEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const handlePay = async () => {
    if (!email) {
      setError("Please enter your email for the high-res link.");
      return;
    }

    logger.info('Payment', 'Initiating Razorpay payment', { email, total, items: cart.length });

    const settings = await storageService.getAdminSettings();
    const keyId = settings.payment.keyId;

    if (!keyId) {
      logger.error('Payment', 'Razorpay KeyID missing in settings');
      setError("Payment system offline (No Key). Contact Support.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const options = {
        key: keyId,
        amount: Math.round(total * 100), // paise
        currency: settings.payment.currency,
        name: "StyleSwap AI",
        description: `High-Res Unlocks (${cart.length} items)`,
        handler: function (response: any) {
          logger.info('Payment', 'Razorpay Success Callback', { paymentId: response.razorpay_payment_id });
          onComplete(response.razorpay_payment_id, cart.map(i => i.id));
        },
        prefill: { email },
        theme: { color: "#4f46e5" },
        modal: { 
          ondismiss: () => {
            logger.info('Payment', 'User closed Razorpay modal');
            setIsProcessing(false);
          } 
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        logger.error('Payment', 'Razorpay Failure', response.error);
        setError(`Payment failed: ${response.error.description}`);
        setIsProcessing(false);
      });
      rzp.open();
    } catch (err: any) {
      logger.error('Payment', 'Checkout initialization failed', { error: err.message });
      setError("Payment connection failed.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="text-3xl font-black text-slate-900 tracking-tighter">Unlock Art</h4>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Digital High-Res Copies</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">✕</button>
        </div>
        
        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 scrollbar-hide border-y border-slate-50 py-4">
          {cart.length > 0 ? cart.map(item => (
            <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
              <img src={item.styledImage} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt={item.styleName} />
              <div className="flex-grow">
                <p className="font-bold text-sm text-slate-800">{item.styleName}</p>
                <p className="text-[10px] text-indigo-600 font-black">{storageService.getCurrencySymbol()} {item.price.toFixed(2)}</p>
              </div>
              {!isProcessing && (
                <button 
                  onClick={() => onRemove(item.id)} 
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              )}
            </div>
          )) : (
            <p className="text-center py-8 text-slate-400 italic text-sm">Cart is empty</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email for Delivery</label>
            <input 
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isProcessing}
              className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all" 
            />
          </div>
          {error && <p className="text-xs text-red-500 font-bold text-center bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>}
        </div>

        <button 
          onClick={handlePay}
          disabled={cart.length === 0 || isProcessing}
          className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-3"
        >
          {isProcessing ? (
             <>
               <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
               Processing...
             </>
          ) : `Pay ${storageService.getCurrencySymbol()} ${total.toFixed(2)}`}
        </button>
        
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Secure Payment via Official Razorpay Gateway
        </p>
      </div>
    </div>
  );
};

export default CheckoutModal;
