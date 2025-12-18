import React from 'react';
import { Building2, Layers, Box } from 'lucide-react';

export default function VividLogo({ variant = 'full', className = '' }) {
  if (variant === 'icon') {
    return (
      <div className={`relative ${className}`}>
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl transform rotate-6"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl transform -rotate-6 opacity-70"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Layers className="h-5 w-5 text-white relative z-10" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl transform rotate-6"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl transform -rotate-6 opacity-70"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Layers className="h-5 w-5 text-white relative z-10" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent leading-none">
          VIVID
        </span>
        <span className="text-[10px] text-gray-600 uppercase tracking-wider leading-none mt-0.5">
          Building Management
        </span>
      </div>
    </div>
  );
}