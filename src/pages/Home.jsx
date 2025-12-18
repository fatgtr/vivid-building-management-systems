import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, ClipboardCheck, MessageSquare, Shield, FileText, BarChart3, Layers, CheckCircle, Home as HomeIcon, UserCog, FolderOpen, Smartphone, X, Menu, ArrowUp, LogIn, Zap, Target, UsersRound, AlertCircle, Repeat, LayoutGrid, ChevronDown } from 'lucide-react';
import DemoRequestModal from '@/components/marketing/DemoRequestModal';
import VividLogo from '@/components/marketing/VividLogo';

export default function Home() {
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        html {
          scroll-behavior: smooth;
        }
      `}</style>

      {/* Top Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <button onClick={() => scrollToTop()} className="focus:outline-none">
              <VividLogo />
            </button>

            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('benefits')} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Benefits
              </button>
              <button onClick={() => scrollToSection('for-teams')} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                For Teams
              </button>
              <button onClick={() => scrollToSection('features')} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection('demo')} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Demo
              </button>
              <button onClick={() => scrollToSection('login')} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Login
              </button>
              <Button 
                onClick={() => setShowDemoModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:scale-105 transition-all duration-200 font-semibold"
              >
                Get Started
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-blue-600"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('benefits')} className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium">
                Benefits
              </button>
              <button onClick={() => scrollToSection('for-teams')} className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium">
                For Teams
              </button>
              <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium">
                Features
              </button>
              <button onClick={() => scrollToSection('demo')} className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium">
                Demo
              </button>
              <button onClick={() => scrollToSection('login')} className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium">
                Login
              </button>
              <Button 
                onClick={() => setShowDemoModal(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
              >
                Get Started
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1486718448742-163732cd1544?q=80&w=2070')] opacity-20 bg-cover bg-center"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/85 via-indigo-600/85 to-purple-700/85"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
          <div className="max-w-4xl mx-auto text-center">
            <div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.2] mb-6">
                Our software solutions provide all your property, tenant, and community management in one single platform
              </h1>
              <p className="text-xl lg:text-2xl mb-10 text-white/90 leading-relaxed">
                Streamline operations, reduce administrative burden, and focus on what matters—your building and your people.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button 
                  size="lg" 
                  onClick={() => setShowDemoModal(true)}
                  className="bg-white text-blue-600 hover:bg-white hover:scale-105 text-xl px-14 py-8 font-bold shadow-2xl transition-all duration-200"
                >
                  Let's get started
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => setShowDemoModal(true)}
                  className="border-3 border-white text-white hover:bg-white hover:text-blue-600 hover:scale-105 text-xl px-14 py-8 font-bold backdrop-blur-sm transition-all duration-200"
                >
                  Watch Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
      </section>



      {/* Benefits / Value Proposition */}
      <section id="benefits" className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">
              Less time at your desk. More time on site.
            </h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              Building managers add value by being present—inspecting, meeting contractors, working with residents. Vivid handles the repetitive admin so you can stay active and effective.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <img 
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop" 
                alt="Building operations" 
                className="rounded-2xl shadow-xl w-full object-cover h-[500px]"
              />
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                    <X className="w-6 h-6 text-red-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Stop wasting time on repetitive admin</h3>
                  <p className="text-gray-600">No more endless data entry, duplicate systems, or being stuck at a desk</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Automate routine tasks</h3>
                  <p className="text-gray-600">Log issues, track progress, and communicate updates—all in one place</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Stay organized without complexity</h3>
                  <p className="text-gray-600">All records, documents, and actions accessible when you need them</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-gray-900">Focus on what matters</h3>
                  <p className="text-gray-600">More time walking buildings, meeting contractors, engaging with residents</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* For Teams */}
      <section id="for-teams" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">Built for your entire team</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From on-site managers to residents—everyone benefits
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-white border-2 border-blue-100 hover:border-blue-300 hover:shadow-2xl transition-all">
              <CardContent className="p-10">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <UserCog className="w-9 h-9 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Building Managers</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  For strata and BMC managers who need to stay organized, responsive, and on top of everything—without being buried in admin.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    On-site or portfolio-based
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Small to large buildings
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Mobile-first workflow
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-green-100 hover:border-green-300 hover:shadow-2xl transition-all">
              <CardContent className="p-10">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-9 h-9 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Committees</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Strata and owners committees get clear visibility into operations, decisions, and spending—without overwhelming the manager.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Real-time updates
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Transparent records
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Easy communication
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white border-2 border-purple-100 hover:border-purple-300 hover:shadow-2xl transition-all">
              <CardContent className="p-10">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6">
                  <HomeIcon className="w-9 h-9 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">Residents</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Simple, straightforward tools to report issues, view announcements, and stay informed—no training required.
                </p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Self-service portal
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Track requests
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Book amenities
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-4 text-gray-900">Everything you need to manage buildings effectively</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed specifically for strata and BMC building managers
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ClipboardCheck className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Work Order Management</h3>
                <p className="text-gray-600 leading-relaxed">
                  Create, track, and close work orders with ease. Assign to contractors, add photos, and keep everyone updated.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-green-200 hover:shadow-xl transition-all group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Resident Portal</h3>
                <p className="text-gray-600 leading-relaxed">
                  Simple communication hub for residents to report issues, view announcements, and book amenities.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Document Management</h3>
                <p className="text-gray-600 leading-relaxed">
                  Store bylaws, plans, certificates, and records in one secure location. Easy search and access.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Smart Communications</h3>
                <p className="text-gray-600 leading-relaxed">
                  Send targeted announcements, create templates, and track message delivery. No more email chaos.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Reports & Analytics</h3>
                <p className="text-gray-600 leading-relaxed">
                  Generate compliance reports, maintenance summaries, and track key metrics automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-gray-100 hover:border-indigo-200 hover:shadow-xl transition-all group">
              <CardContent className="p-8">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Smartphone className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-gray-900">Mobile-First Design</h3>
                <p className="text-gray-600 leading-relaxed">
                  Work from anywhere. Update work orders, respond to residents, and manage on the go.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Demo Request Section */}
      <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=2070')] opacity-5 bg-cover bg-center"></div>
        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Ready to spend less time at your desk?
          </h2>
          <p className="text-xl mb-10 text-white/90 leading-relaxed max-w-2xl mx-auto">
            Join hundreds of building managers who've reclaimed their time with Vivid BMS
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => setShowDemoModal(true)}
              className="bg-white text-blue-600 hover:bg-white hover:scale-105 text-xl px-14 py-8 font-bold shadow-2xl transition-all duration-200"
            >
              Request a Demo
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              onClick={() => setShowDemoModal(true)}
              className="border-3 border-white text-white hover:bg-white hover:text-blue-600 hover:scale-105 text-xl px-14 py-8 font-bold backdrop-blur-sm transition-all duration-200"
            >
              Schedule Demo
            </Button>
          </div>
          <p className="mt-8 text-white/70 text-sm">No credit card required • 14-day free trial</p>
        </div>
      </section>

      {/* White Label Partnership Section */}
      <section id="partners" className="py-24 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-6">
            <Layers className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 text-gray-900">White Label & Partnerships</h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto">
            Building management firms can offer Vivid under their own brand with white-label and co-branded options.
          </p>
          <Button 
            size="lg" 
            onClick={() => setShowDemoModal(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:scale-105 text-xl px-12 py-7 font-bold shadow-2xl transition-all duration-200"
          >
            Explore Partnership Options
          </Button>
        </div>
        </section>

        {/* Login Section */}
        <section id="login" className="py-24 px-4 sm:px-6 lg:px-8 bg-white border-t border-gray-200">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <VividLogo />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">Access Your Dashboard</h2>
          <p className="text-lg text-gray-600 mb-8 max-w-xl mx-auto">
            Already a Vivid BMS user? Access your building management platform
          </p>
          <Link to={createPageUrl('Dashboard')}>
            <Button 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:scale-105 text-lg px-12 py-6 font-semibold shadow-lg transition-all duration-200"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Login to Dashboard
            </Button>
          </Link>
          <p className="mt-6 text-sm text-gray-500">
            Need help? Contact <a href="mailto:support@vividbms.com" className="text-blue-600 hover:underline">support@vividbms.com</a>
          </p>
        </div>
        </section>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="mb-4">
                <VividLogo className="opacity-80" />
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">Building management made simple for strata and BMC managers.</p>
              <Button 
                onClick={() => setShowDemoModal(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:scale-105 transition-all duration-200 font-semibold"
              >
                Get Started
              </Button>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Product</h4>
              <ul className="space-y-3 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('for-teams')} className="hover:text-white transition-colors">For Teams</button></li>
                <li><button onClick={() => scrollToSection('demo')} className="hover:text-white transition-colors">Demo</button></li>
                <li><button onClick={() => scrollToSection('login')} className="hover:text-white transition-colors">Login</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><button onClick={() => scrollToSection('benefits')} className="hover:text-white transition-colors">About</button></li>
                <li><button onClick={() => scrollToSection('partners')} className="hover:text-white transition-colors">Partners</button></li>
                <li><a href="mailto:careers@vividbms.com" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="mailto:contact@vividbms.com" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Resources</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>&copy; {new Date().getFullYear()} Vivid Building Management Systems. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-200 z-40"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      <DemoRequestModal open={showDemoModal} onOpenChange={setShowDemoModal} />
      </div>
      );
      }