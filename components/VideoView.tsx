
import React, { useState, useRef, useEffect } from 'react';
import { klingService } from '../services/klingService';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storage';
import { analytics } from '../services/analytics';
import { razorpayService } from '../services/razorpayService';
import { Coupon, SampleVideo } from '../types';
import Watermark from './Watermark';

interface VideoViewProps {
  prefill?: { photo: string, prompt: string, isVerified?: boolean } | null;
  onClearPrefill?: () => void;
}

const VideoView: React.FC<VideoViewProps> = ({ prefill, onClearPrefill }) => {
  const [photoStart, setPhotoStart] = useState<string | null>(null);
  const [photoEnd, setPhotoEnd] = useState<string | null>(null);
  const [isCoupleMode, setIsCoupleMode] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [fixPrompt, setFixPrompt] = useState('');
  const [duration, setDuration] = useState<'5' | '10'>('5');
  const [email, setEmail] = useState('');
  
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [styledKeyframe, setStyledKeyframe] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [engine, setEngine] = useState<'kling' | 'gemini'>('gemini');
  const [needsKeySelection, setNeedsKeySelection] = useState(false);

  const [videoSamples, setVideoSamples] = useState<SampleVideo[]>([]);

  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const generatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    storageService.getAdminSettings().then(s => {
      setSettings(s);
      setVideoSamples(s.videoSamples || []);
    });
  }, []);

  useEffect(() => {
    if (prefill) {
      setPhotoStart(prefill.photo);
      setPrompt(prefill.prompt);
      if (prefill.isVerified) {
        setStyledKeyframe(prefill.photo);
      } else {
        setStyledKeyframe(null);
      }
      onClearPrefill?.();
    }
  }, [prefill, onClearPrefill]);

  const calculatePrice = () => {
    if (!settings) return 0;
    const base = settings.payment.videoBasePrice || 20;
    let multiplier = 1.0;
    if (duration === '10') multiplier += 0.4;
    let subtotal = Math.ceil(base * multiplier);
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percentage') subtotal -= (subtotal * appliedCoupon.value / 100);
      else subtotal -= appliedCoupon.value;
    }
    return Math.max(0, Math.ceil(subtotal));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const code = couponCode.toUpperCase().trim();
      const coupon = settings.coupons?.find((c: any) => c.code === code && c.isActive);
      if (coupon) { setAppliedCoupon(coupon); setCouponError(null); }
      else { setAppliedCoupon(null); setCouponError("Invalid code"); }
    } catch (err) { setCouponError("Error checking coupon"); }
  };

  const handlePreviewKeyframe = async () => {
    if (!photoStart) return alert("Upload a photo first.");
    setLoading(true);
    setStatus("Matching your face...");
    setRenderError(null);
    try {
      const result = await geminiService.generateStyle(photoStart, prompt, fixPrompt);
      setStyledKeyframe(result);
    } catch (err: any) {
      setRenderError(err.message || "Could not match face. Please use a clearer photo.");
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleGenerate = async (isTest: boolean = false) => {
    if (!photoStart) return alert("Upload your photo first.");
    if (!email && !isTest) return alert("Please enter your email for video delivery.");
    
    const price = calculatePrice();
    if (engine === 'gemini' && window.aistudio) {
      if (!(await window.aistudio.hasSelectedApiKey())) {
        setNeedsKeySelection(true);
        return;
      }
    }

    if (isTest || price === 0) {
      startRender(`free_${Date.now()}`, true, price);
      return;
    }

    setLoading(true);
    setStatus("Preparing checkout...");
    try {
      const rzp = new (window as any).Razorpay({
        key: settings.payment.keyId,
        amount: price * 100,
        currency: settings.payment.currency || 'INR',
        name: "AI Cinema Studio",
        description: `High Quality Video: ${duration}s`,
        handler: async (res: any) => {
          const paymentId = res.razorpay_payment_id;
          await storageService.saveTransaction({
            razorpay_payment_id: paymentId,
            user_email: email,
            amount: price,
            items: [`Cinema Video (${engine})`],
            status: 'authorized',
            render_status: 'pending'
          });
          startRender(paymentId, false, price);
        },
        prefill: { email },
        theme: { color: "#4f46e5" },
        modal: { ondismiss: () => setLoading(false) }
      });
      rzp.open();
    } catch (e) {
      setLoading(false);
      alert("Payment failed. Please refresh and try again.");
    }
  };

  const startRender = async (paymentId: string, isFast: boolean, price: number) => {
    setLoading(true);
    setRenderError(null);
    try {
      let url = '';
      const photoEndToUse = isCoupleMode ? photoEnd : null;
      
      if (engine === 'kling') {
        url = await klingService.generateVideo(photoStart!, photoEndToUse, { prompt, duration: duration === '10' ? '10' : '5', aspect_ratio: '9:16', mode: 'std' }, setStatus);
      } else {
        url = await geminiService.generateVideo(photoStart!, prompt, setStatus, photoEndToUse || undefined, isFast, styledKeyframe || undefined);
      }
      
      if (paymentId && !paymentId.startsWith('free_')) {
        setStatus("Finalizing...");
        await razorpayService.capturePayment(paymentId, price);
      }

      setVideoUrl(url);
      await storageService.updateTransactionStatus(paymentId, { render_status: 'completed', status: 'captured' });
      analytics.track('Purchase', { value: price, currency: 'INR' });
    } catch (err: any) {
      const msg = err.message || "Our AI is currently busy.";
      setRenderError(msg);
      
      if (paymentId && !paymentId.startsWith('free_')) {
        setStatus("Returning your payment...");
        await razorpayService.refundPayment(paymentId, price);
        await storageService.updateTransactionStatus(paymentId, { render_status: 'failed', status: 'refunded' });
        alert("Something went wrong. Your payment has been sent back to you.");
      } else {
        await storageService.updateTransactionStatus(paymentId, { render_status: 'failed' });
      }
    } finally {
      setLoading(false);
      setStatus('');
    }
  };

  const handleSelectSample = (sample: SampleVideo) => {
    setPrompt(sample.prompt);
    generatorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const currencySymbol = storageService.getCurrencySymbol(settings?.payment.currency);

  return (
    <div ref={generatorRef} className="max-w-4xl mx-auto space-y-12 mb-24 px-4">
      <div className="bg-[#0a0a0a] text-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/5">
        <div className="p-8 pt-12 flex flex-col gap-6 bg-gradient-to-b from-indigo-500/5 to-transparent">
          <div className="text-center space-y-1">
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white serif">Cinema Studio</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Safe Payment: Refund if Error</p>
            </div>
          </div>
          
          <div className="flex bg-white/5 p-1 rounded-xl self-center border border-white/5">
            <button onClick={() => setEngine('kling')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${engine === 'kling' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Kling AI</button>
            <button onClick={() => setEngine('gemini')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${engine === 'gemini' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>Gemini Veo</button>
          </div>
        </div>

        <div className="px-8 space-y-8 pb-12">
          {!renderError && (
            <>
              <div className="flex items-center justify-center gap-6 py-2">
                <div className="flex items-center gap-3">
                  <input type="radio" id="single" name="mode" checked={!isCoupleMode} onChange={() => {setIsCoupleMode(false); setStyledKeyframe(null);}} className="accent-indigo-500 w-4 h-4" />
                  <label htmlFor="single" className="text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-300">Normal Video</label>
                </div>
                <div className="flex items-center gap-3">
                  <input type="radio" id="couple" name="mode" checked={isCoupleMode} onChange={() => {setIsCoupleMode(true); setStyledKeyframe(null);}} className="accent-rose-500 w-4 h-4" />
                  <label htmlFor="couple" className="text-[10px] font-black uppercase tracking-widest cursor-pointer text-slate-300">Couple / Transition</label>
                </div>
              </div>

              <div className={`grid gap-6 transition-all duration-500 items-start ${isCoupleMode ? 'sm:grid-cols-2' : 'max-w-md mx-auto'}`}>
                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">First Photo</p>
                  <div onClick={() => startInputRef.current?.click()} className="aspect-square bg-[#1a1a1a] rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden shadow-inner group transition-all hover:border-indigo-500/50">
                    {photoStart ? <img src={photoStart} className="w-full h-full object-cover" /> : (
                      <div className="text-center space-y-2">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl group-hover:scale-110 transition-transform">📸</div>
                        <p className="text-[10px] font-black uppercase text-slate-500">Add Photo</p>
                      </div>
                    )}
                  </div>
                </div>

                {isCoupleMode && (
                  <div className="space-y-4 animate-in zoom-in-95 duration-300">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Second Photo</p>
                    <div onClick={() => endInputRef.current?.click()} className="aspect-square bg-[#1a1a1a] rounded-[2.5rem] border border-white/5 flex flex-col items-center justify-center cursor-pointer overflow-hidden shadow-inner group transition-all hover:border-rose-500/50">
                      {photoEnd ? <img src={photoEnd} className="w-full h-full object-cover" /> : (
                        <div className="text-center space-y-2">
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-2 text-2xl">🏁</div>
                          <p className="text-[10px] font-black uppercase text-slate-500">Add Photo</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {styledKeyframe && (
                <div className="max-w-md mx-auto space-y-4 animate-in slide-in-from-top-6 duration-700 bg-white/5 p-6 rounded-[3rem] border-2 border-indigo-500/20 shadow-[0_0_80px_rgba(99,102,241,0.1)]">
                  <div className="flex justify-between items-center px-4">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Face Match Check</p>
                    <span className="text-[10px] bg-indigo-600 px-3 py-1 rounded-full font-black uppercase">Face Matched!</span>
                  </div>
                  <div className="aspect-square rounded-[2rem] overflow-hidden shadow-2xl relative border border-white/10" onContextMenu={(e) => e.preventDefault()}>
                    <img src={styledKeyframe} className="w-full h-full object-cover select-none pointer-events-none" />
                    <Watermark text="PREVIEW" />
                  </div>
                </div>
              )}

              {photoStart && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 border-t border-white/5 pt-8">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">1. Style & Theme</p>
                      <textarea value={prompt} onChange={e => {setPrompt(e.target.value); setStyledKeyframe(null);}} placeholder="e.g. In a flower garden, cinematic style..." className="w-full bg-[#161616] border-2 border-white/5 rounded-2xl p-4 text-xs h-28 resize-none outline-none focus:border-indigo-500 text-white transition-all placeholder:text-slate-700 font-medium" />
                    </div>
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">2. Face Refinement</p>
                      <textarea value={fixPrompt} onChange={e => {setFixPrompt(e.target.value); setStyledKeyframe(null);}} placeholder="e.g. wider smile, fix eyes..." className="w-full bg-[#161616] border-2 border-rose-500/10 rounded-2xl p-4 text-xs h-28 resize-none outline-none focus:border-rose-500 text-white transition-all placeholder:text-slate-700 font-medium" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {!styledKeyframe ? (
                      <button onClick={handlePreviewKeyframe} disabled={loading || !prompt} className="w-full py-6 bg-white text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-slate-100 disabled:opacity-20 transition-all active:scale-95 flex items-center justify-center gap-3">
                        <span className="text-xl">✨</span> Match Face to Style
                      </button>
                    ) : (
                      <div className="space-y-8 animate-in slide-in-from-top-4">
                        <div className="p-8 bg-indigo-500/10 border border-indigo-500/20 rounded-[2.5rem] text-center space-y-4">
                          <div className="w-12 h-12 bg-indigo-500 text-white rounded-full flex items-center justify-center mx-auto text-2xl shadow-lg">✅</div>
                          <div className="space-y-2">
                             <p className="text-sm font-black text-white italic">Ready to Create!</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed max-w-sm mx-auto">Payment is held safely. If the video fails, you get a full refund instantly.</p>
                          </div>
                        </div>

                        <div className="space-y-8 border-t border-white/5 pt-10">
                          <div className="grid grid-cols-2 gap-4">
                            {['5', '10'].map(sec => (
                              <button key={sec} onClick={() => setDuration(sec as any)} className={`py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${duration === sec ? 'bg-white text-black border-white shadow-xl' : 'text-slate-500 border-white/5 hover:border-white/20'}`}>{sec} SECONDS</button>
                            ))}
                          </div>
                          
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Your Email</p>
                               <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@email.com" className="w-full bg-[#161616] border border-white/5 rounded-2xl px-6 py-4 text-xs outline-none focus:border-indigo-500 text-white" />
                            </div>
                            <div className="space-y-2">
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Promo Code</p>
                               <div className="flex gap-2">
                                 <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="CODE" className="flex-grow bg-[#161616] border border-white/5 rounded-2xl px-6 py-4 text-[10px] outline-none font-bold uppercase text-white" />
                                 <button onClick={handleApplyCoupon} className="px-6 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase hover:bg-white/10 text-white">Apply</button>
                               </div>
                            </div>
                          </div>

                          <button onClick={() => handleGenerate(false)} disabled={loading} className="w-full py-7 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-[2.5rem] font-black text-2xl shadow-2xl active:scale-95 transition-all border-b-8 border-indigo-900 group">
                            {loading ? "Starting..." : (
                               <div className="flex items-center justify-center gap-4">
                                  <span>Create Video</span>
                                  <span className="text-base bg-white/20 px-3 py-1 rounded-full">{currencySymbol}{calculatePrice()}</span>
                               </div>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {renderError && (
            <div className="bg-rose-950/40 border-2 border-rose-500/50 rounded-[3rem] p-12 space-y-8 text-center animate-in zoom-in-95">
              <div className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                 <span className="text-2xl text-white">⚠️</span>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black text-rose-500 italic serif">Something went wrong</h3>
                <p className="text-xs text-rose-200/70 uppercase leading-relaxed font-bold tracking-widest">{renderError}</p>
                <p className="text-[9px] text-green-400 font-black uppercase mt-4">Full Refund Sent ✅</p>
              </div>
              <button onClick={() => setRenderError(null)} className="px-12 py-5 bg-white text-black rounded-2xl font-black text-[10px] uppercase shadow-2xl active:scale-95 transition-all">Try Again</button>
            </div>
          )}
        </div>
      </div>

      {videoSamples.length > 0 && (
        <section className="space-y-8">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-black text-slate-800 serif italic">Popular Styles</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {videoSamples.map((sample) => (
              <div key={sample.id} onClick={() => handleSelectSample(sample)} className="group relative bg-white rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-xl cursor-pointer transition-all hover:-translate-y-2">
                <div className="aspect-[9/16] relative bg-slate-900">
                   {sample.thumbnailUrl ? (
                     <img src={sample.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                   ) : (
                     <video src={sample.videoUrl} muted loop autoPlay playsInline className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                   )}
                   <div className="absolute bottom-8 left-8 right-8">
                      <p className="text-[11px] font-black text-white uppercase tracking-widest mb-2 leading-tight">{sample.title}</p>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {videoUrl && (
        <div className="fixed inset-0 z-[120] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in">
          <div className="relative w-full max-w-4xl h-full max-h-[75vh] flex flex-col items-center justify-center">
            <video src={videoUrl} controls autoPlay loop playsInline className="w-auto h-full max-w-full object-contain rounded-[2.5rem] shadow-2xl border border-white/10" />
            <button onClick={() => setVideoUrl(null)} className="absolute -top-12 sm:-top-4 sm:-right-12 w-12 h-12 bg-white/10 hover:bg-rose-600 rounded-full text-white flex items-center justify-center font-black transition-all z-[130]">✕</button>
          </div>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 w-full max-w-md">
            <a href={videoUrl} download="ai-video.mp4" className="flex-1 py-6 bg-white text-black rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] text-center shadow-2xl border-b-8 border-slate-300">Download Video 🎬</a>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[130] bg-black/98 backdrop-blur-3xl flex flex-col items-center justify-center p-12 text-center gap-12 animate-in fade-in">
          <div className="relative">
            <div className="w-32 h-32 border-[12px] border-indigo-500/10 rounded-full"></div>
            <div className="absolute inset-0 w-32 h-32 border-[12px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🎬</div>
          </div>
          <div className="space-y-4 max-w-sm">
            <div className="flex flex-col items-center gap-2">
              <p className="text-white font-black uppercase tracking-[0.5em] text-sm animate-pulse">{status || 'AI is working...'}</p>
              <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10 mt-2">
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em]">Full Refund if Error occurs</p>
              </div>
            </div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-[0.2em] leading-loose">Creating high quality cinematic motion. This takes 2-4 minutes. Payment will only be taken if the video is success.</p>
          </div>
        </div>
      )}

      {needsKeySelection && (
        <div className="fixed inset-0 z-[140] bg-black/90 backdrop-blur-md flex items-center justify-center p-8">
          <div className="bg-white p-12 rounded-[4rem] text-slate-900 text-center space-y-8 max-w-sm shadow-2xl">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto text-4xl shadow-inner">🔑</div>
            <h3 className="text-2xl font-black serif italic">Pro Engine Key</h3>
            {window.aistudio && (
              <button onClick={() => { setNeedsKeySelection(false); window.aistudio.openSelectKey(); }} className="w-full py-6 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-2xl hover:bg-indigo-700 active:scale-95 transition-all">Select Pro Key</button>
            )}
            <button onClick={() => setNeedsKeySelection(false)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-indigo-500 transition-colors">Return</button>
          </div>
        </div>
      )}

      <input type="file" ref={startInputRef} hidden accept="image/*" onChange={e => {
        const f = e.target.files?.[0];
        if (f) {
          const r = new FileReader();
          r.onloadend = () => {setPhotoStart(r.result as string); setStyledKeyframe(null);};
          r.readAsDataURL(f);
        }
      }} />
      <input type="file" ref={endInputRef} hidden accept="image/*" onChange={e => {
        const f = e.target.files?.[0];
        if (f) {
          const r = new FileReader();
          r.onloadend = () => {setPhotoEnd(r.result as string); setStyledKeyframe(null);};
          r.readAsDataURL(f);
        }
      }} />
    </div>
  );
};

export default VideoView;
