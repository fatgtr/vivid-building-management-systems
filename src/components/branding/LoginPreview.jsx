import React from 'react';
import { Building2 } from 'lucide-react';

export default function LoginPreview({ branding }) {
  const {
    logo_url,
    primary_color = '#3b82f6',
    display_name = 'PropManage',
    branding_mode = 'co_branded'
  } = branding;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="p-8 min-h-[400px] flex items-center justify-center" style={{ backgroundColor: `${primary_color}10` }}>
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
          {/* Logo and Name */}
          <div className="text-center mb-8">
            {logo_url ? (
              <img 
                src={logo_url} 
                alt={display_name}
                className="h-16 mx-auto mb-4 object-contain"
              />
            ) : (
              <div 
                className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: primary_color }}
              >
                <Building2 className="h-8 w-8 text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-900">{display_name}</h1>
            <p className="text-slate-500 text-sm mt-1">Building Management Platform</p>
          </div>

          {/* Mock Login Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="w-full h-10 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <button 
              className="w-full h-10 rounded-lg text-white font-medium shadow-lg transition-all"
              style={{ backgroundColor: primary_color }}
            >
              Sign In
            </button>
          </div>

          {/* Co-branding footer */}
          {branding_mode === 'co_branded' && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-400 text-center">
                Powered by <span className="font-medium text-slate-600">Vivid</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}