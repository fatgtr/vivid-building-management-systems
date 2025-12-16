import React from 'react';
import { Building2, Bell, Settings, User } from 'lucide-react';

export default function HeaderPreview({ branding }) {
  const {
    logo_url,
    primary_color = '#3b82f6',
    secondary_color = '#6366f1',
    display_name = 'PropManage',
    branding_mode = 'co_branded'
  } = branding;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {logo_url ? (
              <img 
                src={logo_url} 
                alt={display_name}
                className="h-10 object-contain"
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ 
                  background: `linear-gradient(135deg, ${primary_color}, ${secondary_color})`
                }}
              >
                <Building2 className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-slate-900">{display_name}</h1>
              {branding_mode === 'co_branded' && (
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Powered by Vivid</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Bell className="h-4 w-4 text-slate-400" />
            </div>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
              <Settings className="h-4 w-4 text-slate-400" />
            </div>
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
              style={{ backgroundColor: primary_color }}
            >
              U
            </div>
          </div>
        </div>
      </div>

      {/* Content Preview */}
      <div className="p-6 space-y-4 bg-slate-50 min-h-[300px]">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-white rounded border border-slate-200" />
            <div className="h-4 w-32 bg-white rounded border border-slate-200 mt-2" />
          </div>
          <button 
            className="px-4 py-2 rounded-lg text-white text-sm font-medium"
            style={{ backgroundColor: primary_color }}
          >
            + Add New
          </button>
        </div>

        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg p-4 border border-slate-200">
              <div className="h-5 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-50 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}