import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, ClipboardCheck, MessageSquare, Shield, FileText, BarChart3, Layers, CheckCircle, Home, UserCog, FolderOpen, Smartphone } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">Vivid Building Management Systems</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900">How It Works</a>
              <a href="#solutions" className="text-gray-600 hover:text-gray-900">Who It's For</a>
              <a href="#partners" className="text-gray-600 hover:text-gray-900">Partners</a>
              <a href="#whats-next" className="text-gray-600 hover:text-gray-900">What's Next</a>
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline">Login</Button>
              </Link>
              <Button className="bg-blue-600 hover:bg-blue-700">Book a Demo</Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl">
            <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
              Built for building managers who belong on site, not behind a desk.
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Vivid is a cloud based building management system designed for strata and BMC building managers. It reduces repetitive admin, streamlines routine tasks, and frees managers to focus on what really matters: the building, the people, and the day to day operation.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8">
                Book a Demo
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                See How It Works
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Supporting Statement */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-2xl sm:text-3xl font-semibold text-gray-900 leading-relaxed mb-6">
            Building managers add value by being present, inspecting buildings, meeting contractors, and working with residents and committees.
          </p>
          <p className="text-xl text-gray-600">
            Vivid is designed to take care of the repetitive desk work so building managers can stay active, engaged, and effective on site.
          </p>
        </div>
      </section>

      {/* Core Value Proposition */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Less admin. More building management.</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <p className="text-xl text-gray-700 leading-relaxed">
                Vivid automates and simplifies the tasks that consume a building manager's time: logging issues, tracking actions, managing records, and keeping communication organised.
              </p>
              <div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">That means:</h3>
                <ul className="space-y-3 text-lg text-gray-700">
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
                <h3 className="text-2xl font-bold mb-4 text-gray-900">And more time:</h3>
                <ul className="space-y-3 text-lg text-gray-700">
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
                className="rounded-2xl shadow-2xl w-full max-w-lg object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Who Vivid is built for */}
      <section id="solutions" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Who Vivid is built for</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow border-2">
              <CardContent className="p-8">
                <UserCog className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-2xl font-bold mb-4">Building managers (strata and BMC)</h3>
                <p className="text-gray-600 leading-relaxed">
                  Vivid supports building managers working across small, medium, and large residential buildings, including BMC structures. It fits both on site and portfolio based management models and adapts to how managers actually work day to day.
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow border-2">
              <CardContent className="p-8">
                <Users className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold mb-4">Strata and owners committees</h3>
                <p className="text-gray-600 leading-relaxed">
                  Clear records, structured communication, and visibility of actions taken, without adding admin overhead for the building manager.
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow border-2">
              <CardContent className="p-8">
                <Home className="w-12 h-12 text-indigo-600 mb-4" />
                <h3 className="text-2xl font-bold mb-4">Residents</h3>
                <p className="text-gray-600 leading-relaxed">
                  Simple communication and clearer updates, without complex portals or unnecessary features.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What Vivid helps you do */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">What Vivid helps you do</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <ClipboardCheck className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Streamline routine tasks</h3>
              <p className="text-gray-600 leading-relaxed">
                Log and track issues quickly without heavy work order systems that slow managers down.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <FolderOpen className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Stay organised without micromanagement</h3>
              <p className="text-gray-600 leading-relaxed">
                All building records, documents, and actions in one place, easy to access when needed.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <MessageSquare className="w-12 h-12 text-indigo-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Communicate once, clearly</h3>
              <p className="text-gray-600 leading-relaxed">
                Structured updates to residents and committees without endless email chains or follow ups.
              </p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <Smartphone className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="text-xl font-bold mb-3">Keep moving</h3>
              <p className="text-gray-600 leading-relaxed">
                Vivid is designed to support mobile, on site management, not desk based admin work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Designed to scale with real buildings */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Designed to scale with real buildings</h2>
          <p className="text-xl mb-12 opacity-90">Vivid works across:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Building2 className="w-10 h-10 mx-auto mb-4 opacity-90" />
              <p className="text-lg font-medium">Small strata schemes</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Building2 className="w-10 h-10 mx-auto mb-4 opacity-90" />
              <p className="text-lg font-medium">Medium residential buildings</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <Building2 className="w-10 h-10 mx-auto mb-4 opacity-90" />
              <p className="text-lg font-medium">Large strata and BMC managed buildings</p>
            </div>
          </div>
          <p className="text-xl opacity-90 leading-relaxed max-w-3xl mx-auto">
            The workflow stays the same as buildings grow, so managers are not forced into more complex systems as portfolios expand.
          </p>
        </div>
      </section>

      {/* What's coming next */}
      <section id="whats-next" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8 text-gray-900">What's coming next</h2>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-8 mb-6">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-xl font-semibold text-gray-900 mb-3">A dedicated Strata Management plugin is coming soon.</p>
            <p className="text-lg text-gray-600">
              For now, Vivid is focused purely on supporting building managers and strengthening on site operations.
            </p>
          </div>
        </div>
      </section>

      {/* Partner and white label note */}
      <section id="partners" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center">
          <Layers className="w-16 h-16 text-blue-600 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-6 text-gray-900">Partner with Vivid BMS</h2>
          <p className="text-xl text-gray-700 mb-8 leading-relaxed">
            Vivid is available with white label and co-branded options for building management firms who want to offer the platform under their own brand.
          </p>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-10">
            Learn More About Partnering
          </Button>
        </div>
      </section>

      {/* Closing Call to Action */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
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
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-12 py-6 text-xl font-semibold shadow-xl">
            Book a Demo
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-6 w-6 text-blue-400" />
                <span className="text-white font-bold">Vivid BMS</span>
              </div>
              <p className="text-sm">Building management made simple.</p>
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