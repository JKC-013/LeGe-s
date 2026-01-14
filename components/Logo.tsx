
import React from 'react';

const Logo: React.FC<{ className?: string }> = ({ className = "h-10 w-auto" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-10 h-10 flex items-center justify-center bg-forest rounded-lg shadow-sm" style={{ backgroundColor: '#14532d' }}>
        {/* Simple Modern '樂' Graphic */}
        <span className="text-white text-2xl font-bold select-none" style={{ fontFamily: 'Plus Jakarta Sans', lineHeight: '1' }}>樂</span>
      </div>
      <span className="text-2xl font-extrabold tracking-tight text-navy" style={{ color: '#0f172a' }}>LeGe's</span>
    </div>
  );
};

export default Logo;
