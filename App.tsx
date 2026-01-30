
import React, { useState } from 'react';
import Header from './components/Header';
import UserView from './components/UserView';
import AdminView from './components/AdminView';

const App: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header 
        isAdminMode={isAdmin} 
        onToggleAdmin={() => setIsAdmin(!isAdmin)} 
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {isAdmin ? (
          <AdminView />
        ) : (
          <UserView />
        )}
      </main>

      <footer className="bg-white border-t py-6 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} StyleSwap AI. Powered by Google Gemini 2.5.</p>
      </footer>
    </div>
  );
};

export default App;
