import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Users, Home, CheckCircle2 } from 'lucide-react';

const solutions = [
  {
    icon: Building2,
    title: 'For Building Managers',
    description: 'Streamline daily operations with intelligent automation',
    benefits: [
      'AI-powered work order management',
      'Automated compliance tracking',
      'Contractor coordination tools',
      'Real-time reporting & analytics',
      'Resident communication hub',
      'Document management system'
    ],
    color: 'from-blue-600 to-blue-700'
  },
  {
    icon: Users,
    title: 'For Strata Managers',
    description: 'Manage multiple properties with ease',
    benefits: [
      'Multi-building dashboard',
      'Centralized document repository',
      'Compliance monitoring across portfolio',
      'Automated maintenance reports',
      'Managing agent portal',
      'White-label capabilities'
    ],
    color: 'from-indigo-600 to-indigo-700'
  },
  {
    icon: Home,
    title: 'For Residents & Owners',
    description: 'Empowering residents with self-service tools',
    benefits: [
      'Smart maintenance requests',
      'Bylaw responsibility checker',
      'Lease agreement Q&A',
      'Real-time request tracking',
      'Building announcements',
      'Document access portal'
    ],
    color: 'from-teal-600 to-teal-700'
  }
];

export default function Solutions() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Solutions for Every Stakeholder
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Tailored experiences that address the unique needs of managers, owners, and residents
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {solutions.map((solution, idx) => (
            <Card key={idx} className="border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 bg-white">
              <CardContent className="p-8">
                <div className={`w-16 h-16 bg-gradient-to-br ${solution.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                  <solution.icon className="h-8 w-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{solution.title}</h3>
                <p className="text-slate-600 mb-6">{solution.description}</p>
                
                <ul className="space-y-3">
                  {solution.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-700">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}