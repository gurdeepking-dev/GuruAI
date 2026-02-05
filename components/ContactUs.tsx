
import React, { useState } from 'react';

const ContactUs: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent("Hi, I have a query about StyleSwap AI.");
    window.open(`https://wa.me/919971778383?text=${message}`, '_blank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create mailto link to satisfy the requirement of sending message to email
    const subject = encodeURIComponent(`StyleSwap AI Query from ${formData.name}`);
    const body = encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`);
    const mailtoLink = `mailto:gurdeepking@gmail.com?subject=${subject}&body=${body}`;
    
    // Open the user's email client
    window.location.href = mailtoLink;
    
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto py-16 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black text-slate-900 tracking-tighter serif italic">Get in Touch</h2>
        <p className="text-xl text-slate-500 font-medium">We're here to help you with your creative journey.</p>
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        <div className="md:col-span-5 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-rose-100 space-y-6">
            <h3 className="text-2xl font-black text-slate-800">Contact Details</h3>
            
            <div className="space-y-6">
              {/* Email Card */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Direct Email</p>
                  <a href="mailto:gurdeepking@gmail.com" className="text-slate-800 font-bold hover:text-rose-600 transition-colors break-all">gurdeepking@gmail.com</a>
                </div>
              </div>
              
              {/* Phone Card */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Call Us</p>
                  <a href="tel:+919971778383" className="text-slate-800 font-bold hover:text-rose-600 transition-colors">+91 99717 78383</a>
                </div>
              </div>

              {/* WhatsApp Button */}
              <button 
                onClick={handleWhatsAppClick}
                className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-black shadow-lg hover:shadow-xl hover:bg-[#20ba5a] transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.319 1.592 5.548 0 10.058-4.51 10.06-10.059 0-2.689-1.046-5.217-2.946-7.117s-4.43-2.945-7.114-2.945c-5.549 0-10.059 4.51-10.061 10.059-.001 2.01.539 3.58 1.507 5.213l-1.01 3.693 3.765-.988zM17.473 14.382c-.301-.15-1.78-.879-2.056-.98-.277-.1-.478-.15-.678.15s-.777.98-.953 1.179-.351.226-.652.076c-.301-.151-1.272-.469-2.422-1.494-.894-.797-1.498-1.782-1.674-2.083-.175-.3-.019-.463.131-.612.135-.134.301-.35.451-.526.151-.176.201-.299.301-.499.1-.201.05-.376-.025-.526-.075-.15-1.678-4.045-1.678-4.045-.632-1.521-1.27-1.314-1.745-1.338-.227-.012-.487-.014-.748-.014-.26 0-.685.099-.953.376s-1.028 1.002-1.028 2.446 1.053 2.831 1.204 3.031c.15.201 2.071 3.163 5.016 4.438.7.303 1.246.484 1.671.62.703.224 1.343.193 1.85.118.563-.083 1.78-.727 2.031-1.429.25-.701.25-1.302.175-1.429-.077-.127-.278-.201-.579-.352z" />
                </svg>
                Chat on WhatsApp
              </button>
            </div>
          </div>
          
          <div className="bg-rose-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-rose-200">
            <h4 className="text-xl font-black mb-2 italic">Bangalore Studio</h4>
            <p className="text-xs font-bold text-rose-100 uppercase tracking-widest mb-4">India Headquarters</p>
            <p className="text-sm font-medium leading-relaxed opacity-90">
              StyleSwap AI Technologies Pvt Ltd<br />
              Koramangala 8th Block,<br />
              Bangalore, KA 560034
            </p>
          </div>
        </div>

        <div className="md:col-span-7">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-rose-100">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-medium" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                    <input 
                      type="email" 
                      required 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-rose-500 transition-all font-medium" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Message</label>
                  <textarea 
                    required 
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-rose-500 transition-all h-32 resize-none font-medium" 
                    placeholder="Tell us about your requirement..."
                  ></textarea>
                </div>
                <button type="submit" className="w-full py-5 bg-rose-600 text-white rounded-2xl font-black shadow-xl hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <span>Send Message to Support</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            ) : (
              <div className="py-20 text-center space-y-6 animate-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h4 className="text-2xl font-black text-slate-800 italic">Redirecting to Email...</h4>
                <p className="text-slate-500 font-medium leading-relaxed px-8">
                  We've prepared your message! If your email app didn't open automatically, please click the button below.
                </p>
                <div className="flex flex-col gap-3 max-w-xs mx-auto">
                  <button onClick={handleSubmit} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black shadow-lg hover:bg-rose-700 transition-all">
                    Re-open Email App
                  </button>
                  <button onClick={() => setSubmitted(false)} className="w-full py-3 text-rose-500 font-bold hover:text-rose-600 transition-all">
                    Back to Form
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
