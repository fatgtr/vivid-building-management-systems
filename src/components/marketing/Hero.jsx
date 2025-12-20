import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Building2, Users, FileText, Sparkles } from 'lucide-react';

export default function Hero({ onDemoClick, onLoginClick }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-blue-200 rounded-full mb-8 animate-fade-in">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-slate-700">AI-Powered Building Management</span>
          </div>

          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight">
            Simplify Building Management with{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Intelligence
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-3xl mx-auto">
            Transform your property operations with intelligent automation, real-time compliance tracking, 
            and seamless resident communication—all in one platform.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button 
              onClick={onDemoClick}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-6 text-lg"
            >
              Book a Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              onClick={onLoginClick}
              variant="outline"
              className="border-2 border-slate-300 hover:border-blue-600 px-8 py-6 text-lg"
            >
              Sign In
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Smart Maintenance</h3>
              <p className="text-sm text-slate-600">AI-powered work orders with automatic responsibility detection</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Resident Portal</h3>
              <p className="text-sm text-slate-600">Self-service platform for seamless communication</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-slate-200 hover:border-blue-300 transition-all">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Compliance Tracking</h3>
              <p className="text-sm text-slate-600">Automated reminders and asset management</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}