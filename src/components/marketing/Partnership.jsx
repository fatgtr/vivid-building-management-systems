import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Handshake, Building2, Palette, Users, Globe, ArrowRight } from 'lucide-react';

const partnerBenefits = [
  {
    icon: Building2,
    title: 'White-Label Solution',
    description: 'Brand the platform as your own with custom logos, colors, and domain'
  },
  {
    icon: Palette,
    title: 'Custom Branding',
    description: 'Tailor the interface to match your brand identity perfectly'
  },
  {
    icon: Users,
    title: 'Multi-Property Management',
    description: 'Manage unlimited buildings and clients from one dashboard'
  },
  {
    icon: Globe,
    title: 'Dedicated Support',
    description: 'Priority technical support and training for your team'
  }
];

export default function Partnership({ onDemoClick }) {
  return (
    <section className="py-24 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
            <Handshake className="h-4 w-4" />
            <span className="text-sm font-medium">Partnership Opportunities</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Partner With Vivid BMS
          </h2>
          <p className="text-xl text-indigo-100 max-w-3xl mx-auto">
            Join our partner network and offer cutting-edge building management to your clients
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {partnerBenefits.map((benefit, idx) => (
            <Card key={idx} className="border-0 bg-white/10 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                <p className="text-indigo-100 text-sm">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-white/20">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-3xl font-bold mb-4">Ready to Partner?</h3>
            <p className="text-xl text-indigo-100 mb-8">
              Let's discuss how Vivid BMS can enhance your property management services and grow your business
            </p>
            <Button 
              onClick={onDemoClick}
              className="bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-6 text-lg"
            >
              Schedule Partnership Discussion
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}