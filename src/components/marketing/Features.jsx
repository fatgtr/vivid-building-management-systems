import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wrench, FileText, Bell, Calendar, Shield, Users, 
  BarChart3, Sparkles, Building2, ClipboardCheck, 
  AlertCircle, MessageSquare, Database, Zap, Brain, Search
} from 'lucide-react';

const features = {
  core: [
    {
      icon: Wrench,
      title: 'Smart Work Orders',
      description: 'AI-powered maintenance management with automatic categorization and priority detection',
      highlights: ['Bylaw responsibility analysis', 'Automated scheduling', 'Contractor assignment']
    },
    {
      icon: FileText,
      title: 'Document Intelligence',
      description: 'OCR processing, version control, and AI-powered document analysis',
      highlights: ['Smart extraction', 'Q&A chat', 'Automatic categorization']
    },
    {
      icon: Bell,
      title: 'Communications Hub',
      description: 'Targeted announcements, message management, and notification system',
      highlights: ['Scheduled publishing', 'Template responses', 'Multi-channel delivery']
    },
    {
      icon: Database,
      title: 'Asset Register',
      description: 'Comprehensive asset tracking with automated compliance monitoring',
      highlights: ['AFSS extraction', 'Service scheduling', 'Lifecycle management']
    }
  ],
  management: [
    {
      icon: Users,
      title: 'Resident Portal',
      description: 'Self-service platform with AI-assisted fault reporting and lease management',
      highlights: ['Responsibility wizard', 'Lease Q&A', 'Real-time tracking']
    },
    {
      icon: Calendar,
      title: 'Calendar & Scheduling',
      description: 'Unified calendar with work orders, maintenance schedules, and events',
      highlights: ['Multi-view support', 'Event filtering', 'Recurring tasks']
    },
    {
      icon: Shield,
      title: 'Role Management',
      description: 'Granular permissions with customizable role templates',
      highlights: ['Multi-level access', 'Resource-based permissions', 'Audit trails']
    },
    {
      icon: BarChart3,
      title: 'Reports & Analytics',
      description: 'Comprehensive reporting with automated generation and delivery',
      highlights: ['Maintenance summaries', 'Compliance reports', 'Pattern analysis']
    }
  ],
  advanced: [
    {
      icon: Brain,
      title: 'AI Bylaw Analysis',
      description: 'Industry-first automatic determination of maintenance responsibility',
      highlights: ['Lot-specific analysis', 'Confidence scoring', 'Reference tracking']
    },
    {
      icon: Sparkles,
      title: 'Work Order Intelligence',
      description: 'AI-powered issue analysis, troubleshooting, and scheduling',
      highlights: ['Smart categorization', 'DIY suggestions', 'Pattern recognition']
    },
    {
      icon: Search,
      title: 'Strata Knowledge Base',
      description: 'AI chat assistant with NSW legislation and building documents',
      highlights: ['Contextual search', 'Saved responses', 'Document Q&A']
    },
    {
      icon: Zap,
      title: 'Smart Automation',
      description: 'Automated workflows for compliance, communications, and scheduling',
      highlights: ['Compliance reminders', 'Auto-escalation', 'Report generation']
    }
  ]
};

export default function Features() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Powerful Features for Modern Building Management
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Everything you need to streamline operations, ensure compliance, and delight residents
          </p>
        </div>

        <Tabs defaultValue="core" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl mx-auto mb-12">
            <TabsTrigger value="core">Core Modules</TabsTrigger>
            <TabsTrigger value="management">Management Tools</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Features</TabsTrigger>
          </TabsList>

          {Object.entries(features).map(([key, featureList]) => (
            <TabsContent key={key} value={key}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {featureList.map((feature, idx) => (
                  <Card key={idx} className="border-0 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <feature.icon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-slate-900 mb-2">{feature.title}</h3>
                          <p className="text-slate-600 mb-4">{feature.description}</p>
                          <ul className="space-y-2">
                            {feature.highlights.map((highlight, i) => (
                              <li key={i} className="flex items-center text-sm text-slate-700">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full mr-2"></div>
                                {highlight}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}