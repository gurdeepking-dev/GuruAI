
import React from 'react';

const AboutUs: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-16 px-6 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Our Vision</h2>
        <p className="text-xl text-slate-500 font-medium">Democratizing professional-grade AI art for everyone.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8 items-center bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100">
        <div className="space-y-6">
          <h3 className="text-3xl font-black text-slate-800">Who We Are</h3>
          <p className="text-slate-600 leading-relaxed">
            StyleSwap AI is a team of enthusiasts and engineers dedicated to pushing the boundaries of generative art. We believe that everyone should have access to creative tools that allow them to express themselves in styles they never thought possible.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Leveraging the latest in Large Language Models and Computer Vision, specifically Google's Gemini 2.5 architecture, we provide a seamless bridge between your reality and artistic imagination.
          </p>
        </div>
        <div className="aspect-square bg-indigo-50 rounded-[2.5rem] flex items-center justify-center">
          <div className="w-32 h-32 bg-indigo-600 rounded-3xl shadow-2xl shadow-indigo-200 flex items-center justify-center text-white text-6xl font-black italic">
            S
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <h3 className="text-center text-2xl font-black text-slate-800">Our Core Principles</h3>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { title: 'Privacy First', desc: 'Your uploaded photos are processed securely and are never stored permanently without your consent.' },
            { title: 'Artist Respect', desc: 'Our styles are inspired by the history of art and technology, aiming to celebrate creativity.' },
            { title: 'Quality Zero', desc: 'We settle for nothing less than high-resolution, hyper-realistic transformations.' }
          ].map((item, i) => (
            <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-black">
                {i + 1}
              </div>
              <h4 className="font-black text-slate-800">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
