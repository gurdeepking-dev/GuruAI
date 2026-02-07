
import React from 'react';

const Terms: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 bg-white rounded-[3rem] shadow-xl border border-slate-100 animate-in fade-in duration-700">
      <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tighter text-center">Rules of Use</h2>
      <div className="prose prose-slate max-w-none space-y-6 text-slate-600 font-medium">
        <p>Welcome! By using our website, you agree to these simple rules.</p>
        
        <section className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">1. Using Our Site</h3>
          <p>Please use our website only for fun and to make art. Do not try to break the site or use it for bad things.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">2. Our Content</h3>
          <p>Everything you see on this site belongs to us. Please do not copy our styles or images without asking.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">3. AI Results</h3>
          <p>We use AI to make your art. Sometimes it is not perfect, but it is always unique and artistic. We hope you like it!</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">4. Responsibility</h3>
          <p>You are responsible for the photos you upload. Please only upload photos that you own.</p>
        </section>
      </div>
    </div>
  );
};

export default Terms;
