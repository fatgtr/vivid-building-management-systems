import React from 'react';

export default function VividLogo({ variant = 'full', className = '' }) {
  return (
    <div className={`${className}`}>
      <div className="flex flex-col">
        <span className="font-black text-2xl bg-gradient-to-r from-[#00529F] to-[#003d75] bg-clip-text text-transparent tracking-tight leading-none">
          VIVID
        </span>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-widest -mt-0.5 leading-none">
          Building Management Systems
        </span>
      </div>
    </div>
  );
}