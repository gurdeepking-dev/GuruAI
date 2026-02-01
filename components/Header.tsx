
import React, { useState, useRef, useEffect } from 'react';
import { ViewType } from '../types';

interface HeaderProps {
  currentView: ViewType;
  setView: (view: ViewType) => void;
  cartCount: number;
  onOpenCheckout: () => void;
  user: any; // Keep prop to avoid breaking App.tsx but ignore
  onLoginClick: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  currentView, setView, cartCount, onOpenCheckout
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (v: ViewType) => {
    setView(v);
    setIsMenuOpen(false);
  };

  return (
    <header className="bg-white/90 backdrop-blur-xl border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer group" onClick={() => handleNav('home')}>
          <div className="relative w-12 h-12 flex items-center justify-center">
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl rotate-12 group-hover:rotate-45 transition-all duration-500 shadow-xl opacity-20"></div>
             <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-2xl rotate-6 group-hover:rotate-12 transition-all duration-500 shadow-lg"></div>
             <div className="absolute inset-0 bg-white rounded-2xl border-2 border-indigo-600 flex items-center justify-center -rotate-3 group-hover:rotate-0 transition-all duration-500">
                <svg className="w-8 h-8 text-indigo-600 transform group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                </svg>
             </div>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-2xl font-black bg-gradient-to-br from-slate-900 via-indigo-900 to-indigo-600 bg-clip-text text-transparent leading-none tracking-tight">
              StyleSwap
            </h1>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">AI Masterpiece Studio</p>
          </div>
        </div>

        <nav className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={onOpenCheckout}
            className="relative p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-600 hover:text-indigo-600 transition-all hover:shadow-md active:scale-95"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full animate-bounce ring-4 ring-white">
                {cartCount}
              </span>
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-3 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-4 w-56 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-3 space-y-1">
                  <button onClick={() => handleNav('home')} className={`w-full text-left px-5 py-3 rounded-xl text-sm font-bold transition-all ${currentView === 'home' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>Home</button>
                  <button onClick={() => handleNav('about')} className={`w-full text-left px-5 py-3 rounded-xl text-sm font-bold transition-all ${currentView === 'about' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>About Us</button>
                  <button onClick={() => handleNav('contact')} className={`w-full text-left px-5 py-3 rounded-xl text-sm font-bold transition-all ${currentView === 'contact' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}>Contact Us</button>
                  <div className="h-px bg-slate-100 mx-5 my-2" />
                  <button onClick={() => handleNav('admin')} className={`w-full text-left px-5 py-3 rounded-xl text-sm font-bold transition-all ${currentView === 'admin' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-600 hover:bg-slate-50'}`}>Admin Panel</button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
