import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, ClipboardCheck, MessageSquare, Shield, FileText, BarChart3, Layers, CheckCircle, Home as HomeIcon, UserCog, FolderOpen, Smartphone } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8" style={{ color: 'var(--keyvision-blue-start)' }} />
              <span className="text-xl font-bold" style={{ color: 'var(--keyvision-text-dark)' }}>Vivid Building Management Systems</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="hover:text-gray-900" style={{ color: 'var(--keyvision-text-light)' }}>How It Works</a>
              <a href="#solutions" className="hover:text-gray-900" style={{ color: 'var(--keyvision-text-light)' }}>Who It's For</a>
              <a href="#partners" className="hover:text-gray-900" style={{ color: 'var(--keyvision-text-light)' }}>Partners</a>
              <a href="#whats-next" className="hover:text-gray-900" style={{ color: 'var(--keyvision-text-light)' }}>What's Next</a>
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline">Login</Button>
              </Link>
              <Button className="keyvision-gradient-bg text-white hover:opacity-90">Book a Demo</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative keyvision-gradient-bg text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
              Built for building managers who belong on site, not behind a desk.
            </h1>
            <p className="text-xl mb-8 text-white opacity-90">
              Vivid is a cloud based building management system designed for strata and BMC building managers. It reduces repetitive admin, streamlines routine tasks, and frees managers to focus on what really matters: the building, the people, and the day to day operation.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-white hover:bg-gray-100 text-lg px-8 font-semibold" style={{ color: 'var(--keyvision-blue-start)' }}>
                Book a Demo
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/20 text-lg px-8 font-semibold">
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Supporting Statement */}
      <section className="py-20" style={{ backgroundColor: 'var(--keyvision-bg-light)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-2xl sm:text-3xl font-bold leading-relaxed mb-6" style={{ color: 'var(--keyvision-text-dark)' }}>
            Building managers add value by being present, inspecting buildings, meeting contractors, and working with residents and committees.
          </p>
          <p className="text-xl" style={{ color: 'var(--keyvision-text-light)' }}>
            Vivid is designed to take care of the repetitive desk work so building managers can stay active, engaged, and effective on site.
          </p>
        </div>
      </section>

      {/* Core Value Proposition */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16" style={{ color: 'var(--keyvision-text-dark)' }}>Less admin. More building management.</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <p className="text-xl leading-relaxed" style={{ color: 'var(--keyvision-text-light)' }}>
                Vivid automates and simplifies the tasks that consume a building manager's time: logging issues, tracking actions, managing records, and keeping communication organised.
              </p>
              <div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--keyvision-text-dark)' }}>That means:</h3>
                <ul className="space-y-3 text-lg" style={{ color: 'var(--keyvision-text-light)' }}>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Less time creating work orders and chasing updates</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Less time duplicating information across systems</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>Less time stuck at a desk</span>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--keyvision-text-dark)' }}>And more time:</h3>
                <ul className="space-y-3 text-lg" style={{ color: 'var(--keyvision-text-light)' }}>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Walking the building</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Meeting contractors</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Engaging with residents</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Liaising with committees</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Proactively managing issues before they escalate</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="flex justify-center">
              <img 
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2073&auto=format&fit=crop" 
                alt="Building manager on site" 
                className="rounded-2xl shadow-xl w-full max-w-lg object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Who Vivid is built for */}
      <section id="solutions" className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--keyvision-bg-light)' }}>
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16" style={{ color: 'var(--keyvision-text-dark)' }}>Who Vivid is built for</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="keyvision-card">
              <CardContent className="p-8">
                <UserCog className="w-12 h-12 mb-4" style={{ color: 'var(--keyvision-blue-start)' }} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--keyvision-text-dark)' }}>Building managers (strata and BMC)</h3>
                <p className="leading-relaxed" style={{ color: 'var(--keyvision-text-light)' }}>
                  Vivid supports building managers working across small, medium, and large residential buildings, including BMC structures. It fits both on site and portfolio based management models and adapts to how managers actually work day to day.
                </p>
              </CardContent>
            </Card>
            <Card className="keyvision-card">
              <CardContent className="p-8">
                <Users className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--keyvision-text-dark)' }}>Strata and owners committees</h3>
                <p className="leading-relaxed" style={{ color: 'var(--keyvision-text-light)' }}>
                  Clear records, structured communication, and visibility of actions taken, without adding admin overhead for the building manager.
                </p>
              </CardContent>
            </Card>
            <Card className="keyvision-card">
              <CardContent className="p-8">
                <HomeIcon className="w-12 h-12 mb-4" style={{ color: 'var(--keyvision-blue-end)' }} />
                <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--keyvision-text-dark)' }}>Residents</h3>
                <p className="leading-relaxed" style={{ color: 'var(--keyvision-text-light)' }}>
                  Simple communication and clearer updates, without complex portals or unnecessary features.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What Vivid helps you do */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16" style={{ color: 'var(--keyvision-text-dark)' }}>What Vivid helps you do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="keyvision-card p-8">
              <ClipboardCheck className="w-12 h-12 mb-4" style={{ color: 'var(--keyvision-blue-start)' }} />
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--keyvision-text-dark)' }}>Streamline routine tasks</h3>
              <p className="leading-relaxed" style={{ color: 'var(--keyvision-text-light)' }}>
                Log and track issues quickly without heavy work order systems that slow managers down.
              </p>
            </div>
            <div className="keyvision-card p-8">
              <FolderOpen className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--keyvision-text-dark)' }}>Stay organised without micromanagement</h3>
              <p className="leading-relaxed" style={{ color: 'var(--keyvision-text-light)' }}>
                All building records, documents, and actions in one place, easy to access when needed.
              </p>
            </div>
            <div className="keyvision-card p-8">
              <MessageSquare className="w-12 h-12 mb-4" style={{ color: 'var(--keyvision-blue-end)' }} />
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--keyvision-text-dark)' }}>Communicate once, clearly</h3>
              <p className="leading-relaxed" style={{ color: 'var(--keyvision-text-light)' }}>
                Structured updates to residents and committees without endless email chains or follow ups.
              </p>
            </div>
            <div className="keyvision-card p-8">
              <Smartphone className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--keyvision-text-dark)' }}>Keep moving</h3>
              <p className="leading-relaxed" style={{ color: 'var(--keyvision-text-light)' }}>
                Vivid is designed to support mobile, on site management, not desk based admin work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Designed to scale with real buildings */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 keyvision-gradient-bg text-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Designed to scale with real buildings</h2>
          <p className="text-xl mb-12 opacity-90">Vivid works across:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <Building2 className="w-10 h-10 mx-auto mb-4 text-white opacity-90" />
              <p className="text-lg font-medium">Small strata schemes</p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <Building2 className="w-10 h-10 mx-auto mb-4 text-white opacity-90" />
              <p className="text-lg font-medium">Medium residential buildings</p>
            </div>
            <div className="bg-white/10 rounded-xl p-6 border border-white/20">
              <Building2 className="w-10 h-10 mx-auto mb-4 text-white opacity-90" />
              <p className="text-lg font-medium">Large strata and BMC managed buildings</p>
            </div>
          </div>
          <p className="text-xl opacity-90 leading-relaxed max-w-3xl mx-auto">
            The workflow stays the same as buildings grow, so managers are not forced into more complex systems as portfolios expand.
          </p>
        </div>
      </section>

      {/* What's coming next */}
      <section id="whats-next" className="py-20 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: 'var(--keyvision-bg-light)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8" style={{ color: 'var(--keyvision-text-dark)' }}>What's coming next</h2>
          <div className="keyvision-card p-8 mb-6">
            <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--keyvision-blue-start)' }} />
            <p className="text-xl font-semibold mb-3" style={{ color: 'var(--keyvision-text-dark)' }}>A dedicated Strata Management plugin is coming soon.</p>
            <p className="text-lg" style={{ color: 'var(--keyvision-text-light)' }}>
              For now, Vivid is focused purely on supporting building managers and strengthening on site operations.
            </p>
          </div>
        </div>
      </section>

      {/* Partner and white label note */}
      <section id="partners" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <Layers className="w-16 h-16 mx-auto mb-6" style={{ color: 'var(--keyvision-blue-start)' }} />
          <h2 className="text-4xl font-bold mb-6" style={{ color: 'var(--keyvision-text-dark)' }}>Partner with Vivid BMS</h2>
          <p className="text-xl mb-8 leading-relaxed" style={{ color: 'var(--keyvision-text-light)' }}>
            Vivid is available with white label and co-branded options for building management firms who want to offer the platform under their own brand.
          </p>
          <Button size="lg" className="text-white text-lg px-10 font-semibold" style={{ background: 'linear-gradient(to right, var(--keyvision-blue-start), var(--keyvision-blue-end))' }}>
            Learn More About Partnering
          </Button>
        </div>
      </section>

      {/* Closing Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 keyvision-gradient-bg text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4 leading-tight">
            Spend less time managing systems.
          </h2>
          <h2 className="text-4xl sm:text-5xl font-bold mb-10 leading-tight">
            Spend more time managing buildings.
          </h2>
          <p className="text-xl mb-10 opacity-90 leading-relaxed">
            Book a demo to see how Vivid supports building managers in strata and BMC environments.
          </p>
          <Button size="lg" className="bg-white hover:bg-gray-100 text-lg px-12 py-6 text-xl font-semibold shadow-xl" style={{ color: 'var(--keyvision-blue-start)' }}>
            Book a Demo
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-6 w-6" style={{ color: 'var(--keyvision-blue-start)' }} />
                <span className="text-white font-bold">Vivid BMS</span>
              </div>
              <p className="text-sm text-gray-400">Building management made simple.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Features</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">How It Works</a></li>
                <li><a href="#solutions" className="hover:text-white">Who It's For</a></li>
                <li><a href="#whats-next" className="hover:text-white">What's Next</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Partners</a></li>
                <li><a href="#" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Contact Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Vivid Building Management Systems. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}