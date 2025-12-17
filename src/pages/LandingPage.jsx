import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, Users, ClipboardCheck, MessageSquare, Shield, FileText, BarChart3, Layers, CheckCircle } from 'lucide-react';

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
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#solutions" className="text-gray-600 hover:text-gray-900">Solutions</a>
              <a href="#partners" className="text-gray-600 hover:text-gray-900">Partners</a>
              <a href="#support" className="text-gray-600 hover:text-gray-900">Support</a>
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
          <div className="max-w-3xl">
            <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6">
              Powerfully simple building management software for strata and building teams.
            </h1>
            <p className="text-xl mb-8 text-blue-100">
              Vivid is a cloud based building management system that helps strata managers, building management firms, and residents stay organised, stay compliant, and communicate clearly, across small, medium, and large buildings.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8">
                Book a Demo
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
                See Features
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Line */}
      <section className="py-8 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-600 text-lg">
            Trusted by strata and building management teams who want a modern alternative to complex, expensive platforms.
          </p>
        </div>
      </section>

      {/* Three Value Pillars */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Built for strata, not everything</h3>
              <p className="text-gray-600 text-lg">
                Vivid focuses on residential strata and BMC structures. It fits day to day building operations without feature overload.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Clear oversight in one place</h3>
              <p className="text-gray-600 text-lg">
                Track tasks, issues, documents, and building records with real visibility, so teams make better decisions.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Layers className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Partner ready, white label available</h3>
              <p className="text-gray-600 text-lg">
                Offer Vivid under your own brand, or co brand it as "powered by Vivid". Ideal for strata managers and building management firms who on charge to owners corporations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who Vivid is for */}
      <section id="solutions" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Who Vivid is for</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <Users className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="text-2xl font-bold mb-3">Strata managers</h3>
                <p className="text-gray-600">
                  Streamline communication, compliance, and reporting across every building in your portfolio.
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <Building2 className="w-10 h-10 text-green-600 mb-4" />
                <h3 className="text-2xl font-bold mb-3">Building management firms</h3>
                <p className="text-gray-600">
                  Run daily operations from one dashboard, across single sites or multi building portfolios.
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <MessageSquare className="w-10 h-10 text-purple-600 mb-4" />
                <h3 className="text-2xl font-bold mb-3">Residents and committees</h3>
                <p className="text-gray-600">
                  Get clear notices, access key documents, and see progress on issues without messy email chains.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What you can do with Vivid */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">What you can do with Vivid</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Tasks and issue tracking</h3>
                  <p className="text-gray-600">Log, assign, and track tasks in real time. Keep clear ownership, status, and timelines.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Building records and compliance</h3>
                  <p className="text-gray-600">Store registers, documents, and approvals in one place, with a clear history of changes and actions.</p>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Communication that works</h3>
                  <p className="text-gray-600">Send notices and updates via in app notifications and email, with structured templates that reduce admin time.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2">Operational visibility</h3>
                  <p className="text-gray-600">See what is open, what is overdue, and what is complete, across buildings and teams.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Designed to scale */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-blue-50">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8">Designed to scale</h2>
          <p className="text-xl text-gray-700 mb-12">Vivid works for:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="flex flex-col items-center">
              <CheckCircle className="w-8 h-8 text-blue-600 mb-3" />
              <p className="text-lg font-medium">Small schemes that need simple, affordable tools</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-8 h-8 text-blue-600 mb-3" />
              <p className="text-lg font-medium">Medium buildings with active committees</p>
            </div>
            <div className="flex flex-col items-center">
              <CheckCircle className="w-8 h-8 text-blue-600 mb-3" />
              <p className="text-lg font-medium">Large strata and BMC structures that need stronger oversight</p>
            </div>
          </div>
          <p className="text-gray-600 text-lg font-medium">Same platform, same workflow, every size.</p>
        </div>
      </section>

      {/* Partner section */}
      <section id="partners" className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Sell it your way</h2>
          <p className="text-xl mb-12 text-blue-100">Wholesale options for strata managers and building management firms.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2">White label branding</h3>
              <p className="text-blue-100">Your logo, colours, email identity</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2">Co-branding option</h3>
              <p className="text-blue-100">"Powered by Vivid"</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-bold mb-2">Portfolio rollout tools</h3>
              <p className="text-blue-100">For faster deployment</p>
            </div>
          </div>
          <Button size="lg" className="bg-white text-indigo-600 hover:bg-gray-100 text-lg px-8">
            Partner with Vivid
          </Button>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to see Vivid in action?</h2>
          <p className="text-xl text-gray-600 mb-10">
            Book a demo and we will show you how Vivid simplifies building operations, improves communication, and keeps records clean.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8">
              Book a Demo
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Contact Us
            </Button>
          </div>
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
                <li><a href="#" className="hover:text-white">Task Management</a></li>
                <li><a href="#" className="hover:text-white">Compliance</a></li>
                <li><a href="#" className="hover:text-white">Communications</a></li>
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