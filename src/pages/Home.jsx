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
  UsersRound,
  TrendingUp
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
      description: "Automatic determination of maintenance responsibility based on building-specific bylaws with lot-specific analysis, drastically reducing disputes.",
      highlights: [
        "Analyses building-specific by-laws in seconds",
        "Provides lot-specific responsibility for each unit",
        "References relevant by-law clauses for transparency",
        "High confidence scoring for unparalleled accuracy"
      ],
      color: "from-[#00529F] to-[#003d75]"
    },
    {
      icon: FileCheck,
      title: "Document Intelligence",
      description: "Advanced OCR and extraction capabilities that transform unstructured documents into actionable data, eliminating manual data entry.",
      highlights: [
        "Accurate OCR text extraction from any PDF",
        "Automatic lease term and clause extraction",
        "AFSS document asset parsing and registration",
        "Seamless strata roll data import and updates"
      ],
      color: "from-[#00529F] to-[#003d75]"
    },
    {
      icon: MessageSquare,
      title: "Smart Communications",
      description: "Intelligent message handling that categorizes, prioritizes, and suggests responses automatically, improving response times and resident satisfaction.",
      highlights: [
        "Auto-categorize resident messages (e.g., maintenance, noise)",
        "Priority detection for urgent issues",
        "AI-driven response template suggestions",
        "Automatic invoice & quote summarization"
      ],
      color: "from-[#FEBE10] to-[#d9a509]"
    },
    {
      icon: Zap,
      title: "AI-Powered Maintenance",
      description: "Intelligent work order management with automatic categorization and smart responsibility determination.",
      highlights: [
        "AI issue analysis and routing",
        "Smart contractor assignment and scheduling",
        "Interactive Kanban board for visual workflow",
        "Automated cost tracking and budget alerts"
      ],
      color: "from-[#00529F] to-[#003d75]"
    },
    {
      icon: TrendingUp,
      title: "AI-Powered Energy Management",
      description: "Predictive analytics for energy consumption and costs, identifying patterns and recommending efficiency improvements.",
      highlights: [
        "Forecasts future energy costs",
        "Identifies usage patterns and anomalies",
        "Recommends energy-saving strategies",
        "Analyzes building-wide and unit-level consumption"
      ],
      color: "from-[#00529F] to-[#003d75]"
    }
  ];

  const userPersonas = [
    {
      icon: Building2,
      title: "Building Managers",
      subtitle: "Full operational control, simplified",
      description: "Complete building oversight with AI-powered work order management, seamless resident communication, intelligent contractor coordination, proactive compliance tracking, and automated report generation.",
      highlights: [
        "Intuitive multi-property dashboard",
        "Mobile-responsive workflow for on-the-go management",
        "Automated compliance reminders & alerts",
        "Transparent contractor performance tracking",
        "Customizable report generation for stakeholders",
        "Real-time analytics and insights"
      ],
      color: "border-[#00529F]/20 hover:border-[#00529F]"
    },
    {
      icon: UsersRound,
      title: "Strata Managers",
      subtitle: "Effortless portfolio management & growth",
      description: "Multi-property oversight with streamlined building manager coordination, comprehensive compliance monitoring, centralized document repository access, and seamless partner integration, all under your brand.",
      highlights: [
        "Consolidated multi-building dashboard",
        "Secure resident data access & management",
        "Full work order visibility across portfolio",
        "Automated strata roll requests for efficiency",
        "White-label capability for brand consistency",
        "Automated invoice processing & tracking"
      ],
      color: "border-[#FEBE10]/20 hover:border-[#FEBE10]"
    },
    {
      icon: HomeIcon,
      title: "Residents & Owners",
      subtitle: "Empowered self-service, enhanced living",
      description: "Intuitive self-service portal empowering residents with AI-assisted maintenance requests, transparent lease information, easy document access, real-time announcement viewing, and instant request tracking, all from their device.",
      highlights: [
        "AI-powered responsibility checker for clarity",
        "Lease Q&A chat assistant for instant answers",
        "Easy photo upload support for requests",
        "Real-time building announcements & event RSVPs",
        "Centralized document library access",
        "Comprehensive request history tracking"
      ],
      color: "border-slate-200 hover:border-slate-400"
    },
    {
      icon: UsersRound,
      title: "Strata Committees",
      subtitle: "Complete transparency, informed decisions",
      description: "Real-time visibility into building operations with automated reports, proactive compliance tracking, transparent financial data, and robust decision-making support, fostering community trust.",
      highlights: [
        "Real-time operational visibility & progress tracking",
        "Transparent financial tracking and reporting",
        "Full maintenance history access & insights",
        "Automated compliance reports & alerts",
        "Secure document access for governance",
        "Event management and poll voting"
      ],
      color: "border-[#00529F]/20 hover:border-[#00529F]"
    }
  ];

  const coreModules = [
    {
      icon: Shield,
      title: "Asset Register & Compliance",
      description: "The most comprehensive asset tracking solution with automated data extraction from documents like AFSS. Includes smart service scheduling, real-time compliance monitoring, and future-proof sinking fund calculations.",
      features: ["AI-powered asset extraction", "Automated compliance alerts", "Full lifecycle tracking & planning", "Automated lift registration & checks"]
    },
    {
      icon: HomeIcon,
      title: "Resident & Owner Portal",
      description: "An intuitive self-service portal empowering residents with AI-assisted maintenance requests, lease management with smart extraction, real-time announcements, event RSVPs, and a comprehensive document library.",
      features: ["AI responsibility checker", "Lease Q&A chat assistant", "Instant request tracking", "Document & policy access", "Event RSVP & calendars"]
    },
    {
      icon: LayoutDashboard,
      title: "Unified Dashboard & Analytics",
      description: "Gain 360-degree real-time operational overview with integrated calendars, rich work order statistics, critical compliance alerts, and dynamic visual analytics. Effortlessly manage multiple properties with a single click.",
      features: ["Real-time performance metrics", "Interactive visual charts", "Quick actions & customizable views", "Seamless multi-property management", "Energy usage analytics"]
    },
    {
      icon: Wrench,
      title: "AI-Powered Maintenance & Work Orders",
      description: "Revolutionize work order management with AI for automatic categorization, intelligent priority assignment, smart contractor matching, and precise responsibility determination based on strata bylaws.",
      features: ["AI issue analysis & routing", "Smart contractor assignment", "Visual Kanban board management", "Automated cost tracking & reporting", "Predictive maintenance insights"]
    },
    {
      icon: MessageSquare,
      title: "Advanced Communications Suite",
      description: "Elevate community engagement with secure messaging, smart broadcast announcements, resident directories, event calendars with RSVP, and AI-suggested responses for incoming queries.",
      features: ["Secure 1-on-1 messaging", "AI-powered broadcast announcements", "Resident & contractor directories", "Event management & RSVP", "Smart message routing"]
    },
    {
      icon: FileText,
      title: "Document Management & Policy Automation",
      description: "Centralized, intelligent document repository with automated OCR, AI summarization, and policy generation. Ensure compliance with version control and easy access to all building documentation.",
      features: ["Automated OCR & data extraction", "AI-generated document summaries", "Smart policy generation from templates", "Version control & audit trails", "Secure document sharing"]
    }
  ];

  const stats = [
    { icon: Building2, value: "10+", label: "Integrated Modules" },
    { icon: Clock, value: "70%", label: "Time Saved Weekly" },
    { icon: Brain, value: "AI-First", label: "Intelligence Platform" },
    { icon: ThumbsUp, value: "99%", label: "User Satisfaction" }
  ];

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        html { scroll-behavior: smooth; }
        .gradient-text {
          background: linear-gradient(135deg, #00529F, #FEBE10, #00529F);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .float-animation {
          animation: float 6s ease-in-out infinite;
        }
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0, 82, 159, 0.3); }
          50% { box-shadow: 0 0 40px rgba(0, 82, 159, 0.6); }
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
              <button onClick={() => scrollToSection('features')} className="text-gray-700 hover:text-[#00529F] font-medium transition-colors">
                Features
              </button>
              <button onClick={() => scrollToSection('for-whom')} className="text-gray-700 hover:text-[#00529F] font-medium transition-colors">
                For Teams
              </button>
              <button onClick={() => scrollToSection('ai-capabilities')} className="text-gray-700 hover:text-[#00529F] font-medium transition-colors">
                AI Features
              </button>
              <button onClick={() => scrollToSection('login')} className="text-gray-700 hover:text-[#00529F] font-medium transition-colors">
                Login
              </button>
              <Button 
                onClick={() => setShowDemoModal(true)}
                className="bg-[#00529F] hover:bg-[#003d75] text-white"
              >
                Book a Demo
              </Button>
            </div>

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-[#00529F]"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              <button onClick={() => scrollToSection('features')} className="block w-full text-left py-2 text-gray-700 hover:text-[#00529F] font-medium">
                Features
              </button>
              <button onClick={() => scrollToSection('for-whom')} className="block w-full text-left py-2 text-gray-700 hover:text-[#00529F] font-medium">
                For Teams
              </button>
              <button onClick={() => scrollToSection('ai-capabilities')} className="block w-full text-left py-2 text-gray-700 hover:text-[#00529F] font-medium">
                AI Features
              </button>
              <button onClick={() => scrollToSection('login')} className="block w-full text-left py-2 text-gray-700 hover:text-[#00529F] font-medium">
                Login
              </button>
              <Button 
                onClick={() => setShowDemoModal(true)}
                className="w-full bg-[#00529F] hover:bg-[#003d75] text-white"
              >
                Book a Demo
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80" 
            alt="Modern Building"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#00529F]/95 via-slate-900/90 to-slate-800/95"></div>
        </div>
        
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FEBE10]/10 rounded-full blur-3xl float-animation"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00529F]/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '-3s' }}></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full mb-8 border border-white/20 shadow-lg">
              <div className="w-2 h-2 bg-[#FEBE10] rounded-full animate-pulse"></div>
              <span className="text-white font-semibold text-sm tracking-wide">For Building Managers Managing Strata Buildings | Assisting Strata Managers</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-8 leading-[1.1] tracking-tight text-white">
              The Future of Building Management: <span className="block mt-3 bg-gradient-to-r from-[#FEBE10] to-white bg-clip-text text-transparent">Unrivaled Efficiency with AI</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-200 mb-12 leading-relaxed max-w-4xl mx-auto font-light">
              Vivid BMS is the all-in-one platform built to redefine building operations. Empower your team with cutting-edge AI-powered workflows that not only streamline every task but also deliver an unparalleled experience for Building Managers, Strata Managers, Committee Members, and Residents.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button 
                size="lg" 
                onClick={() => setShowDemoModal(true)}
                className="bg-[#00529F] hover:bg-[#003d75] text-white text-base font-semibold px-10 py-7 rounded-lg shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              >
                Book a Demo
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => scrollToSection('features')}
                className="border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 text-base font-semibold px-10 py-7 rounded-lg transition-all w-full sm:w-auto"
              >
                Explore Features
              </Button>
            </div>
            
            <p className="text-sm text-gray-300 mb-8">No credit card required.</p>


          </div>
        </div>
      </section>

      {/* AI Platform Badge */}
      <section className="bg-slate-900 text-white py-20 relative overflow-hidden border-y border-slate-800">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTItMnYyaDJ2LTJoLTJ6bTItMnYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00529F]/20 border border-[#FEBE10]/30 rounded-full mb-6 shadow-lg shadow-[#00529F]/20">
            <Sparkles className="h-4 w-4 text-[#FEBE10] animate-pulse" />
            <span className="text-[#FEBE10] font-semibold text-sm tracking-wide">AI-Powered Platform</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Intelligence built into <span className="gradient-text">every feature</span>
          </h2>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Leveraging cutting-edge AI models, our platform transforms complex building management tasks into automated workflows. Advanced OCR, natural language processing, and machine learning capabilities built into every feature.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h3 className="text-2xl font-bold mb-2">Built on Modern Technology</h3>
            <p className="text-gray-400">Enterprise-grade platform powered by cutting-edge AI and cloud infrastructure</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center group">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-2xl mb-4 group-hover:bg-[#00529F] transition-colors duration-300">
                  <stat.icon className="h-8 w-8 text-[#FEBE10] group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="text-4xl font-bold mb-2 text-white group-hover:text-[#FEBE10] transition-colors duration-300">{stat.value}</div>
                <div className="text-gray-300 group-hover:text-gray-100 transition-colors duration-300">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-slate-800/90 backdrop-blur-sm border-2 border-slate-700/50 hover:border-[#00529F]/50 transition-all hover-lift group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center shadow-lg shadow-[#00529F]/30 group-hover:shadow-[#00529F]/50 transition-all">
                      <Brain className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-bold text-white text-lg">Advanced AI Models</h4>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">Powered by advanced AI models for intelligent document processing, bylaw analysis, and automated workflows</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/90 backdrop-blur-sm border-2 border-slate-700/50 hover:border-[#FEBE10]/50 transition-all hover-lift group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FEBE10] to-[#d9a509] rounded-xl flex items-center justify-center shadow-lg shadow-[#FEBE10]/30 group-hover:shadow-[#FEBE10]/50 transition-all">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-bold text-white text-lg">Enterprise Security</h4>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">Built on Base44 platform with React, TypeScript, and Tailwind CSS. Bank-level encryption and Australian data residency</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/90 backdrop-blur-sm border-2 border-slate-700/50 hover:border-[#00529F]/50 transition-all hover-lift group">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center shadow-lg shadow-[#00529F]/30 group-hover:shadow-[#00529F]/50 transition-all">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-bold text-white text-lg">Cloud Infrastructure</h4>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">Serverless architecture with Deno Deploy for backend functions. 99.9% uptime SLA with auto-scaling capabilities</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Core Modules */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">
              Everything you need in <span className="gradient-text">one platform</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              From AI-powered maintenance to compliance tracking, Vivid BMS provides all the tools modern building managers need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreModules.map((module, idx) => (
              <Card key={idx} className="border border-gray-200 hover:border-[#00529F] hover:shadow-xl transition-all group bg-white overflow-hidden">
                <CardContent className="p-8 flex flex-col h-full">
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-12 h-12 bg-[#00529F] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[#FEBE10] transition-colors duration-300">
                      <module.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2 text-gray-900">{module.title}</h3>
                      <p className="text-gray-600 leading-relaxed text-sm">{module.description}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-5 border-t border-gray-100">
                    <ul className="space-y-2">
                      {module.features.map((feature, fidx) => (
                        <li key={fidx} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-[#00529F] flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Whom Section */}
      <section id="for-whom" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight">
              Built for <span className="gradient-text">everyone</span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-light">
              From Strata Committee members to Residents, Strata Managers to Property Managers—everyone gets the tools they need.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {userPersonas.map((persona, idx) => (
              <Card key={idx} className={`border-2 ${persona.color} transition-all hover-lift group bg-white/60 backdrop-blur-sm`}>
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-16 h-16 bg-gradient-to-br ${idx === 0 ? 'from-[#00529F] to-[#003d75] shadow-[#00529F]/30' : idx === 1 ? 'from-[#FEBE10] to-[#d9a509] shadow-[#FEBE10]/30' : idx === 2 ? 'from-slate-600 to-slate-700 shadow-slate-500/30' : 'from-[#00529F] to-[#003d75] shadow-[#00529F]/30'} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all`}>
                      <persona.icon className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold mb-1">{persona.title}</h3>
                      <p className={`text-sm font-semibold ${idx === 0 ? 'text-[#00529F]' : idx === 1 ? 'text-[#FEBE10]' : idx === 2 ? 'text-slate-600' : 'text-[#00529F]'}`}>{persona.subtitle}</p>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 mb-6">{persona.description}</p>
                  
                  <div className="space-y-2">
                    {persona.highlights.map((highlight, hidx) => (
                      <div key={hidx} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-[#00529F] flex-shrink-0" />
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
      <section id="ai-capabilities" className="py-20 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTAtNHYyaDJ2LTJoLTJ6bTItMnYyaDJ2LTJoLTJ6bTItMnYyaDJ2LTJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-[#FEBE10]" />
              <span className="text-[#FEBE10] font-medium text-sm">Unique Selling Points</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Innovation that sets us <span className="gradient-text">apart</span>
            </h2>
            
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Industry-first features and intelligent automation that solve real problems faced by building managers, strata managers, and residents every day.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {aiFeatures.map((feature, idx) => (
              <Card key={idx} className="bg-slate-800/90 backdrop-blur-sm border-2 border-slate-700/50 hover:border-[#FEBE10] transition-all hover-lift group flex flex-col">
                <CardContent className="p-8 flex-1 flex flex-col">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-all`}>
                      <feature.icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-1 text-white">{feature.title}</h3>
                      {feature.subtitle && (
                        <p className="text-sm font-semibold text-[#FEBE10]">{feature.subtitle}</p>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-gray-300 mb-6 flex-1">{feature.description}</p>
                  
                  <div className="space-y-2 mt-auto">
                    {feature.highlights.map((highlight, hidx) => (
                      <div key={hidx} className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-[#FEBE10] flex-shrink-0" />
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



      {/* CTA Section - Get Started */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-slate-50/30 to-gray-50 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#00529F]/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FEBE10]/20 rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to <span className="gradient-text">get started?</span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-8">
            See Vivid BMS in action. Request a personalised demo and discover how we can transform your building management operations.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="flex items-start gap-3 bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-[#00529F]/20 hover-lift shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Personalised demo tailored to your needs</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-[#00529F]/20 hover-lift shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">30-minute session with a product specialist</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 bg-white/90 backdrop-blur-sm p-6 rounded-xl border border-[#00529F]/20 hover-lift shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">No commitment required</p>
              </div>
            </div>
          </div>

          <Button 
            size="lg"
            onClick={() => setShowDemoModal(true)}
            className="bg-[#00529F] hover:bg-[#003d75] text-white text-lg px-12 py-7"
          >
            Request Demo
          </Button>

          <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200 inline-block">
            <p className="text-sm text-gray-600 mb-2">Questions? Contact us directly:</p>
            <a href="mailto:demo@vividbms.com" className="text-[#00529F] font-semibold text-lg hover:underline">
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
                <Sparkles className="h-4 w-4 text-[#FEBE10]" />
                <span className="text-[#FEBE10] font-medium text-sm">Partnership Program</span>
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
                className="bg-[#00529F] hover:bg-[#003d75] text-white"
              >
                Explore Partnership Options <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-8">
                <h3 className="text-xl font-bold text-white mb-6">Partnership Benefits</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#FEBE10] flex-shrink-0" />
                    <span className="text-gray-300">Full platform customisation with your branding</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#FEBE10] flex-shrink-0" />
                    <span className="text-gray-300">Dedicated account management and support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#FEBE10] flex-shrink-0" />
                    <span className="text-gray-300">Custom integrations and API access</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#FEBE10] flex-shrink-0" />
                    <span className="text-gray-300">Revenue sharing opportunities</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-[#FEBE10] flex-shrink-0" />
                    <span className="text-gray-300">Co-marketing and lead generation</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-700">
                  <p className="text-gray-400 text-sm mb-2">Interested in becoming a partner?</p>
                  <a href="mailto:partners@vividbms.com" className="text-[#FEBE10] font-semibold hover:underline">
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
          <Card className="border-2 border-[#00529F]/30 shadow-xl">
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
                className="bg-[#00529F] hover:bg-[#003d75] text-white text-lg px-12 py-6"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Login to Dashboard
              </Button>

              <p className="mt-6 text-sm text-gray-500">
                Need help? Contact <a href="mailto:support@vividbms.com" className="text-[#00529F] hover:underline">support@vividbms.com</a>
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
                    <Mail className="h-4 w-4 text-[#FEBE10]" />
                  </div>
                  <span className="text-sm">hello@vividbms.com</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                    <Phone className="h-4 w-4 text-[#FEBE10]" />
                  </div>
                  <span className="text-sm">1300 VIVID BMS</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-[#FEBE10]" />
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
          className="fixed bottom-8 right-8 p-4 bg-[#00529F] hover:bg-[#003d75] text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-200 z-40"
          aria-label="Scroll to top"
        >
          <ChevronDown className="h-5 w-5 transform rotate-180" />
        </button>
      )}

      <DemoRequestModal open={showDemoModal} onOpenChange={setShowDemoModal} />
    </div>
  );
}