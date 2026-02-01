import React from 'react';
import { Building2, Layers, Box } from 'lucide-react';

export default function VividLogo({ variant = 'full', className = '' }) {
  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`}>
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 bg-gradient-to-br from-[#FEBE10] to-[#d9a509] rounded-2xl blur-md opacity-40"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-2xl transform rotate-3 shadow-xl"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white relative z-10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FEBE10] to-[#d9a509] rounded-2xl blur-md opacity-40"></div>
        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-[#00529F] to-[#003d75] flex items-center justify-center shadow-xl transform rotate-3">
          <Building2 className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <span className="font-black text-2xl bg-gradient-to-r from-[#00529F] to-[#003d75] bg-clip-text text-transparent tracking-tight leading-none">VIVID</span>
          <div className="w-1.5 h-1.5 rounded-full bg-[#FEBE10] animate-pulse"></div>
        </div>
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest -mt-0.5 leading-none">Building Management</span>
      </div>
    </div>
  );
}