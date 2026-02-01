
import React from 'react';
import { CartItem } from '../types';
import { storageService } from '../services/storage';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: string) => void;
  onComplete: () => void;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cart, onRemove, onComplete }) => {
  if (!isOpen) return null;

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const currencySymbol = storageService.getCurrencySymbol();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-2xl font-bold text-slate-900">Your Cart</h4>
              <p className="text-slate-500">Instant Access & High-Res Downloads</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">✕</button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {cart.length > 0 ? cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                <img src={item.styledImage} className="w-16 h-16 rounded-xl object-cover shadow-sm" alt={item.styleName} />
                <div className="flex-grow">
                  <p className="font-bold text-slate-800">{item.styleName}</p>
                  <p className="text-sm text-indigo-600 font-bold">{currencySymbol}{item.price.toFixed(2)}</p>
                </div>
                <button 
                  onClick={() => onRemove(item.id)} 
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )) : (
              <div className="text-center py-12 text-slate-400 italic bg-slate-50 rounded-3xl border border-dashed">
                Your cart is empty
              </div>
            )}
          </div>

          {cart.length > 0 && (
            <div className="p-5 bg-indigo-600 rounded-2xl flex justify-between items-center text-white shadow-lg shadow-indigo-200">
              <span className="font-medium opacity-90">Total Amount</span>
              <span className="text-2xl font-black">{currencySymbol}{total.toFixed(2)}</span>
            </div>
          )}

          <div className="space-y-3">
            <input type="email" placeholder="Billing Email" className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="Card Number" className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
              <input type="text" placeholder="MM/YY CVC" className="w-full px-6 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" />
            </div>
          </div>

          <button 
            onClick={onComplete}
            disabled={cart.length === 0}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all disabled:opacity-50 active:scale-95"
          >
            Confirm & Pay {currencySymbol}{total.toFixed(2)}
          </button>
          
          <p className="text-center text-[10px] text-slate-400 uppercase font-black tracking-widest">SSL Secure Transaction</p>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
