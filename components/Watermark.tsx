
import React from 'react';

interface WatermarkProps {
  text: string;
}

const Watermark: React.FC<WatermarkProps> = ({ text }) => {
  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-wrap gap-12 items-center justify-center p-4">
      {[...Array(12)].map((_, i) => (
        <div 
          key={i} 
          className="text-white/30 text-xl font-black uppercase tracking-widest whitespace-nowrap transform -rotate-45 mix-blend-overlay"
        >
          {text}
        </div>
      ))}
    </div>
  );
};

export default Watermark;
