import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  FileText, 
  MessageSquare, 
  Shield, 
  Wrench,
  Clock,
  ThumbsUp,
  Brain,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Calendar,
  LogIn,
  FileCheck,
  Zap,
  Home as HomeIcon,
  LayoutDashboard,
  UsersRound
} from 'lucide-react';
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

  const aiFeatures = [
    {
      icon: Brain,
      title: "Bylaw Responsibility Analysis",
      subtitle: "Industry-First Innovation",
      description: "Automatic determination of maintenance responsibility based on building-specific bylaws with lot-specific analysis.",
      highlights: [
        "Analyzes building-specific bylaws",
        "Lot-specific analysis for each unit",
        "References relevant bylaw clauses",
        "Confidence scoring for accuracy"
      ],
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: FileCheck,
      title: "Document Intelligence",
      description: "Advanced OCR and extraction capabilities that transform documents into actionable data.",
      highlights: [
        "OCR text extraction from PDFs",
        "Automatic lease term extraction",
        "AFSS document asset parsing",
        "Strata roll data import"
      ],
      color: "from-blue-500 to-indigo-600"
    },
    {
      icon: MessageSquare,
      title: "Smart Communications",
      description: "Intelligent message handling that categorizes, prioritizes, and suggests responses automatically.",
      highlights: [
        "Auto-categorize resident messages",
        "Priority detection",
        "Response template suggestions",
        "Invoice & quote summarization"
      ],
      color: "from-teal-500 to-emerald-600"
    },
    {
      icon: Zap,
      title: "AI-Powered Maintenance",
      description: "Intelligent work order management with automatic categorization and smart responsibility determination.",
      highlights: [
        "AI issue analysis",
        "Smart assignment",
        "Kanban board",
        "Cost tracking"
      ],
      color: "from-teal-500 to-cyan-600"
    }
  ];

  const userPersonas = [
    {
      icon: Building2,
      title: "Building Managers",
      subtitle: "Full operational control",
      description: "Complete building oversight with work order management, resident communication, contractor coordination, compliance tracking, and automated report generation.",
      highlights: [
        "Multi-property dashboard",
        "Mobile-responsive workflow",
        "Automated compliance reminders",
        "Contractor performance tracking",
        "Custom report generation",
        "Real-time analytics"
      ],
      color: "border-blue-200 hover:border-blue-400"
    },
    {
      icon: UsersRound,
      title: "Strata Managers",
      subtitle: "Portfolio management made easy",
      description: "Multi-property oversight with building manager coordination, compliance monitoring, document repository access, and seamless partner integration.",
      highlights: [
        "Multi-building dashboard",
        "Resident data access",
        "Work order visibility",
        "Automated strata roll requests",
        "White-label capability",
        "Invoice processing"
      ],
      color: "border-teal-200 hover:border-teal-400"
    },
    {
      icon: HomeIcon,
      title: "Residents & Owners",
      subtitle: "Empowered self-service",
      description: "Self-service portal with smart maintenance requests, lease information, document access, announcement viewing, and real-time request tracking.",
      highlights: [
        "AI-powered responsibility checker",
        "Lease Q&A chat assistant",
        "Photo upload support",
        "Building announcements",
        "Document library access",
        "Request history tracking"
      ],
      color: "border-slate-200 hover:border-slate-400"
    },
    {
      icon: UsersRound,
      title: "Strata Committees",
      subtitle: "Complete transparency at your fingertips",
      description: "Real-time visibility into building operations with automated reports, compliance tracking, and transparent decision-making support.",
      highlights: [
        "Real-time operational visibility",
        "Transparent financial tracking",
        "Maintenance history access",
        "Automated compliance reports"
      ],
      color: "border-purple-200 hover:border-purple-400"
    }
  ];

  const coreModules = [
    {
      icon: Shield,
      title: "Asset Register & Compliance",
      description: "Comprehensive asset tracking with automated extraction from AFSS documents. Service scheduling, compliance monitoring, and sinking fund calculations.",
      features: ["Auto asset extraction", "Compliance alerts", "Lifecycle tracking", "Lift registration"]
    },
    {
      icon: HomeIcon,
      title: "Resident Portal",
      description: "Self-service portal with smart maintenance requests, lease management with AI extraction, announcements, and document access.",
      features: ["Responsibility checker", "Lease Q&A chat", "Request tracking", "Document access"]
    },
    {
      icon: LayoutDashboard,
      title: "Dashboard & Analytics",
      description: "Real-time overview with calendar integration, work order statistics, compliance alerts, and visual analytics. Switch between properties seamlessly with multi-building management.",
      features: ["Real-time metrics", "Visual charts", "Quick actions", "Multi-property view"]
    },
    {
      icon: Wrench,
      title: "AI-Powered Maintenance",
      description: "Intelligent work order management with automatic categorization, priority assignment, and smart responsibility determination based on strata bylaws.",
      features: ["AI issue analysis", "Smart assignment", "Kanban board", "Cost tracking"]
    }
  ];

  const stats = [
    { icon: Building2, value: "16", label: "Core Modules" },
    { icon: Clock, value: "90%", label: "Time Saved on Admin" },
    { icon: FileText, value: "15+", label: "Document Categories" },
    { icon: ThumbsUp, value: "24/7", label: "Support Available" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        html { scroll-behavior: smooth; }
        .gradient-text {
          background: linear-gradient(to right, #3b82f6, #06b6d4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Navigation */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <button onClick={scrollToTop} className="focus:outline-none">
              <VividLogo />
            </button>

            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection('for-whom')} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                For Teams
              </button>
              <button onClick={() => scrollToSection('ai-capabilities')} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                AI Features
              </button>
              <button onClick={() => scrollToSection('login')} className="text-gray-700 hover:text-blue-600 font-medium transition-colors">
                Login
              </button>
              <Button 
                onClick={() => setShowDemoModal(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
              >
                Book a Demo
              </Button>
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-blue-600"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium">
                Features
              </button>
              <button onClick={() => scrollToSection('for-whom')} className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium">
                For Teams
              </button>
              <button onClick={() => scrollToSection('ai-capabilities')} className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium">
                AI Features
              </button>
              <button onClick={() => scrollToSection('login')} className="block w-full text-left py-2 text-gray-700 hover:text-blue-600 font-medium">
                Login
              </button>
              <Button 
                onClick={() => setShowDemoModal(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
              >
                Book a Demo
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-blue-50 via-white to-white overflow-hidden py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-full mb-8">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span className="text-blue-600 font-medium text-sm">Building Management Software for Strata & BMC Professionals</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              AI-powered building management <span className="gradient-text">for the modern era</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              Vivid BMS streamlines maintenance operations, compliance tracking, document management, and resident communications. Designed for strata managers, building managers, owners corporations, residents, and contractors.
            </p>

            <div className="flex flex-wrap gap-4 justify-center mb-12">
              <Button 
                size="lg" 
                onClick={() => setShowDemoModal(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 text-lg px-10 py-6"
              >
                Book a Demo <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => scrollToSection('features')}
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-lg px-10 py-6"
              >
                Explore Platform
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <span>Multi-property management</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                <span>Resident engagement</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Platform Badge */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span className="text-cyan-400 font-medium text-sm">AI-Powered Platform</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Intelligence built into <span className="gradient-text">every feature</span>
          </h2>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Vivid BMS harnesses the power of AI to automate complex tasks, extract insights from documents, and help you make smarter decisions faster.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-2xl mb-4">
                  <stat.icon className="h-8 w-8 text-cyan-400" />
                </div>
                <div className="text-4xl font-bold mb-2">{stat.value}</div>
                <div className="text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Modules */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white rounded-full border border-gray-200 mb-6">
              <span className="text-gray-900 font-semibold">16</span>
              <span className="text-gray-400">|</span>
              <span className="text-gray-900 font-semibold">MODULES</span>
              <span className="text-gray-400">|</span>
              <span className="text-blue-600 font-semibold">AI POWERED</span>
              <span className="text-gray-400">|</span>
              <span className="text-cyan-600 font-semibold flex items-center gap-1">
                <Sparkles className="h-4 w-4" /> POSSIBILITIES
              </span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need to manage buildings <span className="gradient-text">effectively</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From AI-powered maintenance to compliance tracking, Vivid BMS provides all the tools modern building managers need in one unified platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coreModules.map((module, idx) => (
              <Card key={idx} className="border-2 border-gray-200 hover:border-blue-300 hover:shadow-xl transition-all">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <module.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{module.title}</h3>
                      <p className="text-gray-600 mb-4">{module.description}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {module.features.map((feature, fidx) => (
                      <div key={fidx} className="flex items-center gap-2 text-sm text-blue-600">
                        <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Whom Section */}
      <section id="for-whom" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for <span className="gradient-text">everyone in your building</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              From property managers to committees to residents, Vivid BMS creates a connected experience for everyone in your building community.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {userPersonas.map((persona, idx) => (
              <Card key={idx} className={`border-2 ${persona.color} transition-all hover:shadow-xl`}>
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${idx === 0 ? 'from-blue-500 to-indigo-600' : idx === 1 ? 'from-teal-500 to-emerald-600' : idx === 2 ? 'from-slate-600 to-slate-700' : 'from-purple-500 to-pink-600'} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <persona.icon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{persona.title}</h3>
                      <p className={`text-sm font-semibold ${idx === 0 ? 'text-blue-600' : idx === 1 ? 'text-teal-600' : idx === 2 ? 'text-slate-600' : 'text-purple-600'}`}>{persona.subtitle}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6">{persona.description}</p>
                  
                  <div className="space-y-2">
                    {persona.highlights.map((highlight, hidx) => (
                      <div key={hidx} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <span className="text-gray-700">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Capabilities */}
      <section id="ai-capabilities" className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-cyan-400" />
              <span className="text-cyan-400 font-medium text-sm">Unique Selling Points</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Innovation that sets us <span className="gradient-text">apart</span>
            </h2>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Industry-first features and intelligent automation that solve real problems faced by building managers, strata managers, and residents every day.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {aiFeatures.map((feature, idx) => (
              <Card key={idx} className="bg-slate-800 border-slate-700 hover:border-cyan-500 transition-all">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center flex-shrink-0`}>
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1 text-white">{feature.title}</h3>
                      {feature.subtitle && (
                        <p className="text-sm font-semibold text-cyan-400">{feature.subtitle}</p>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6">{feature.description}</p>
                  
                  <div className="space-y-2">
                    {feature.highlights.map((highlight, hidx) => (
                      <div key={hidx} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />
                        <span className="text-gray-300">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              What our customers <span className="gradient-text">are saying</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Hear from property managers and committees who have transformed their building management with Vivid BMS.
            </p>
          </div>

          <Card className="max-w-4xl mx-auto border-2 border-gray-200">
            <CardContent className="p-12">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl text-blue-600">"</span>
                </div>
                <div className="text-sm text-gray-500 px-3 py-1 bg-gray-100 rounded">Placeholder</div>
              </div>
              
              <p className="text-xl text-gray-700 mb-8 leading-relaxed">
                "This platform has transformed how we manage our portfolio. The time savings alone have been remarkable, and our committees love the transparency."
              </p>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Building Manager</p>
                  <p className="text-sm text-gray-500">Strata Management Company</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section - Get Started */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to <span className="gradient-text">get started?</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-8">
            See Vivid BMS in action. Request a personalized demo and discover how we can transform your building management operations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="flex items-start gap-3 bg-white p-6 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Personalized demo tailored to your needs</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-6 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">30-minute session with a product specialist</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white p-6 rounded-xl">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">No commitment required</p>
              </div>
            </div>
          </div>

          <Button 
            size="lg"
            onClick={() => setShowDemoModal(true)}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 text-lg px-12 py-7"
          >
            Request Demo
          </Button>

          <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200 inline-block">
            <p className="text-sm text-gray-600 mb-2">Questions? Contact us directly:</p>
            <a href="mailto:demo@vividbms.com" className="text-blue-600 font-semibold text-lg hover:underline">
              demo@vividbms.com
            </a>
          </div>
        </div>
      </section>

      {/* Partnership Section */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full mb-6">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <span className="text-cyan-400 font-medium text-sm">Partnership Program</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">
                White Label Solutions for <span className="gradient-text">Growing Firms</span>
              </h2>
              
              <p className="text-xl text-gray-300 mb-8">
                Offer a comprehensive building management platform under your own brand. Vivid BMS powers white-label solutions for property management companies, allowing you to deliver cutting-edge technology with your company's identity front and center.
              </p>

              <Button 
                size="lg"
                onClick={() => setShowDemoModal(true)}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
              >
                Explore Partnership Options <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Partnership Benefits</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Full platform customization with your branding</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Dedicated account management and support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Custom integrations and API access</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Revenue sharing opportunities</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-cyan-400 flex-shrink-0" />
                    <span className="text-gray-300">Co-marketing and lead generation</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700">
                  <p className="text-gray-400 text-sm mb-2">Interested in becoming a partner?</p>
                  <a href="mailto:partners@vividbms.com" className="text-cyan-400 font-semibold hover:underline">
                    partners@vividbms.com
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section id="login" className="py-20 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="border-2 border-blue-200 shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="mb-6 flex justify-center">
                <VividLogo />
              </div>
              
              <h2 className="text-3xl font-bold mb-4">Access Your Dashboard</h2>
              
              <p className="text-gray-600 mb-8 max-w-xl mx-auto">
                Already a Vivid BMS user? Sign in to manage your properties, track work orders, and connect with your building community.
              </p>

              <Button 
                size="lg"
                onClick={async () => {
                  const { base44 } = await import('@/api/base44Client');
                  base44.auth.redirectToLogin(createPageUrl('Dashboard'));
                }}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700 text-lg px-12 py-6"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Login to Dashboard
              </Button>

              <p className="mt-6 text-sm text-gray-500">
                Need help? Contact <a href="mailto:support@vividbms.com" className="text-blue-600 hover:underline">support@vividbms.com</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="mb-4">
                <VividLogo />
              </div>
              <p className="text-sm text-gray-400 mb-6">
                Comprehensive building management software for strata managers and BMC professionals. Streamline operations, engage residents, and grow your portfolio.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                    <Mail className="h-4 w-4 text-cyan-400" />
                  </div>
                  <span className="text-sm">hello@vividbms.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                    <Phone className="h-4 w-4 text-cyan-400" />
                  </div>
                  <span className="text-sm">1300 VIVID BMS</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-cyan-400" />
                  </div>
                  <span className="text-sm">Sydney, Australia</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Platform</h4>
              <ul className="space-y-3 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors">Features</button></li>
                <li><button onClick={() => scrollToSection('for-whom')} className="hover:text-white transition-colors">For Teams</button></li>
                <li><button onClick={() => scrollToSection('ai-capabilities')} className="hover:text-white transition-colors">AI Capabilities</button></li>
                <li><button onClick={() => setShowDemoModal(true)} className="hover:text-white transition-colors">Request Demo</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Company</h4>
              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Partnerships</a></li>
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
                <li><button onClick={() => scrollToSection('login')} className="hover:text-white transition-colors">Login</button></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <p>&copy; {new Date().getFullYear()} Vivid Building Management Systems. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-200 z-40"
          aria-label="Scroll to top"
        >
          <ChevronDown className="h-5 w-5 transform rotate-180" />
        </button>
      )}

      <DemoRequestModal open={showDemoModal} onOpenChange={setShowDemoModal} />
    </div>
  );
}