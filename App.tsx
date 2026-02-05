
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserView from './components/UserView';
import AdminView from './components/AdminView';
import AboutUs from './components/AboutUs';
import ContactUs from './components/ContactUs';
import Terms from './components/Terms';
import Privacy from './components/Privacy';
import Refund from './components/Refund';
import Shipping from './components/Shipping';
import { CartItem, ViewType } from './types';
import { analytics } from './services/analytics';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType | 'terms' | 'privacy' | 'refund' | 'shipping'>('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  useEffect(() => {
    analytics.init();
  }, []);

  const addToCart = (item: CartItem) => {
    setCart(prev => [...prev, item]);
    analytics.track('AddToCart', { 
      content_name: item.styleName,
      value: item.price,
      currency: 'INR'
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const renderContent = () => {
    switch(currentView) {
      case 'admin':
        return <AdminView />;
      case 'about':
        return <AboutUs />;
      case 'contact':
        return <ContactUs />;
      case 'terms':
        return <Terms />;
      case 'privacy':
        return <Privacy />;
      case 'refund':
        return <Refund />;
      case 'shipping':
        return <Shipping />;
      default:
        return (
          <UserView 
            cart={cart}
            setCart={setCart}
            user={null}
            addToCart={addToCart}
            showCheckout={showCheckoutModal}
            setShowCheckout={setShowCheckoutModal}
            removeFromCart={removeFromCart}
            onLoginRequired={() => {}}
            onUserUpdate={() => {}}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header 
        currentView={currentView as ViewType}
        setView={(v) => setCurrentView(v)}
        cartCount={cart.length}
        onOpenCheckout={() => {
          setShowCheckoutModal(true);
          analytics.track('InitiateCheckout');
        }}
        user={null}
        onLoginClick={() => {}}
        onLogout={() => {}}
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {renderContent()}
      </main>

      <footer className="bg-white border-t py-12 text-center text-slate-500 text-sm">
        <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-xl rotate-12">S</div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-6 text-xs uppercase tracking-widest font-black text-slate-400">
            <button onClick={() => setCurrentView('home')} className="hover:text-indigo-600 transition-colors">Home</button>
            <button onClick={() => setCurrentView('about')} className="hover:text-indigo-600 transition-colors">About Us</button>
            <button onClick={() => setCurrentView('contact')} className="hover:text-indigo-600 transition-colors">Contact Us</button>
            <button onClick={() => setCurrentView('terms')} className="hover:text-indigo-600 transition-colors">Terms</button>
            <button onClick={() => setCurrentView('privacy')} className="hover:text-indigo-600 transition-colors">Privacy</button>
            <button onClick={() => setCurrentView('refund')} className="hover:text-indigo-600 transition-colors">Refund Policy</button>
            <button onClick={() => setCurrentView('shipping')} className="hover:text-indigo-600 transition-colors">Shipping</button>
          </div>

          <div className="h-px w-24 bg-slate-100" />
          
          <div className="space-y-2">
            <p className="font-bold text-slate-900">StyleSwap AI Studio</p>
            <p className="text-[10px] font-medium max-w-lg mx-auto leading-relaxed">
              Transforming memories through the lens of artificial intelligence. High-quality digital artistic portraits for every special occasion.
            </p>
            <p className="pt-4 text-xs font-bold text-slate-400">&copy; {new Date().getFullYear()} All Rights Reserved. Crafted with ❤️ in Bangalore, India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
