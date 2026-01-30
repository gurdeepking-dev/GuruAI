
import React from 'react';

interface HeaderProps {
  isAdminMode: boolean;
  onToggleAdmin: () => void;
  cartCount: number;
  onOpenCheckout: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAdminMode, onToggleAdmin, cartCount, onOpenCheckout }) => {
  return (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => !isAdminMode && window.location.reload()}>
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
            S
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
            StyleSwap AI
          </h1>
        </div>

        <nav className="flex items-center gap-4">
          {!isAdminMode && (
            <button 
              onClick={onOpenCheckout}
              className="relative p-2 text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>
          )}
          <button 
            onClick={onToggleAdmin}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              isAdminMode 
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' 
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            {isAdminMode ? 'Back to Gallery' : 'Admin Panel'}
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
