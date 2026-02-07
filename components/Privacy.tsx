
import React from 'react';

const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 bg-white rounded-[3rem] shadow-xl border border-slate-100 animate-in fade-in duration-700">
      <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tighter text-center">Your Privacy</h2>
      <div className="prose prose-slate max-w-none space-y-6 text-slate-600 font-medium">
        <p>Your privacy is very important to us. We handle your data with care.</p>
        
        <section className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">1. Your Photos</h3>
          <p>We do not save your photos on our computers forever. We only use them for a few seconds to make your art. After that, they are gone.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">2. Your Email</h3>
          <p>We only ask for your email to send you your art. we do not share it with anyone else.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">3. Safe Payments</h3>
          <p>We use Razorpay for payments. Your credit card details are safe and we never see them.</p>
        </section>

        <section className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">4. Cookies</h3>
          <p>We use small files called cookies to remember what is in your basket.</p>
        </section>
      </div>
    </div>
  );
};

export default Privacy;
