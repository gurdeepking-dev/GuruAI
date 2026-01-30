
import React from 'react';

interface HeaderProps {
  isAdminMode: boolean;
  onToggleAdmin: () => void;
}

const Header: React.FC<HeaderProps> = ({ isAdminMode, onToggleAdmin }) => {
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
