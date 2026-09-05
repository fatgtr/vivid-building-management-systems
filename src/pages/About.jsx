import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, Shield, Sparkles, ArrowLeft, CheckCircle2, Mail, Phone, MapPin } from 'lucide-react';
import VividLogo from '@/components/marketing/VividLogo';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="focus:outline-none">
              <VividLogo />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/Contact" className="text-gray-700 hover:text-[#00529F] font-medium transition-colors hidden sm:inline">
                Contact
              </Link>
              <Link to="/">
                <Button variant="outline" className="border-[#00529F] text-[#00529F] hover:bg-[#00529F] hover:text-white">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00529F]/95 via-slate-900/90 to-slate-800/95"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full mb-8 border border-white/20">
            <Sparkles className="h-4 w-4 text-[#FEBE10]" />
            <span className="text-white font-semibold text-sm tracking-wide">About Vivid BMS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
            Building management, <span className="bg-gradient-to-r from-[#FEBE10] to-white bg-clip-text text-transparent">reimagined</span>
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto font-light">
            A smart, all-in-one platform connecting residents, staff, and operations for seamless building management.
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              Vivid Building Management Systems (Vivid BMS) is an AI-first, all-in-one platform purpose-built for the strata and building management industry in Australia. It brings work orders, asset registers, compliance tracking, financial reporting, resident communications, and predictive maintenance together in a single, intuitive interface — eliminating the disconnected spreadsheets, email chains, and legacy tools that slow teams down. From automated bylaw responsibility analysis to intelligent document extraction and proactive compliance reminders, Vivid BMS transforms complex, manual operational tasks into streamlined, automated workflows that save building managers hours every week.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              The platform is designed for everyone involved in strata building life. Building managers gain full operational control with a mobile-responsive dashboard and AI-powered work order management. Strata managers oversee multiple properties effortlessly with white-label capability, consolidated reporting, and automated strata roll requests. Strata committees enjoy real-time transparency into operations, finances, and compliance. Residents and owners are empowered through a self-service portal with AI-assisted maintenance requests, lease Q&A, announcements, event RSVPs, and a comprehensive document library — all from their device.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed mb-10">
              Vivid BMS is built and maintained by the Vivid BMS team, a specialist property technology company based in Sydney, Australia. Our mission is to redefine building operations through cutting-edge AI, modern cloud infrastructure, and a relentless focus on the people who keep buildings running. We partner with property management firms through white-label solutions, and we are committed to Australian data residency, enterprise-grade security, and continuous innovation that keeps our customers ahead of the curve.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="border-2 border-gray-200 hover:border-[#00529F] transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">What we do</h3>
                <p className="text-sm text-gray-600">Unified building management software powered by AI for strata and property professionals.</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-200 hover:border-[#FEBE10] transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#FEBE10] to-[#d9a509] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Who it's for</h3>
                <p className="text-sm text-gray-600">Building managers, strata managers, committees, residents, and property partners.</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-gray-200 hover:border-[#00529F] transition-all">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Who builds it</h3>
                <p className="text-sm text-gray-600">The Vivid BMS team — Sydney-based property technology specialists.</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12 p-8 bg-gradient-to-br from-blue-50 to-gray-50 rounded-2xl border border-[#00529F]/20 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Want to learn more?</h3>
            <p className="text-gray-600 mb-6">Get in touch with our team or book a personalised demo.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/Contact">
                <Button className="bg-[#00529F] hover:bg-[#003d75] text-white px-8">
                  Contact Us
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="border-[#00529F] text-[#00529F] hover:bg-[#00529F] hover:text-white px-8">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-300 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <div className="flex items-center gap-6">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <span className="text-white font-semibold">About</span>
              <Link to="/Contact" className="hover:text-white transition-colors">Contact</Link>
            </div>
            <p>&copy; {new Date().getFullYear()} Vivid Building Management Systems. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}