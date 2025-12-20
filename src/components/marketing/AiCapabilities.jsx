import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Sparkles, Search, Zap, FileText, MessageSquare } from 'lucide-react';

const capabilities = [
  {
    icon: Brain,
    title: 'Bylaw Responsibility Analysis',
    description: 'Industry-first AI that analyzes building-specific bylaws to automatically determine maintenance responsibility for each lot',
    tag: 'Unique to Vivid'
  },
  {
    icon: Sparkles,
    title: 'Work Order Intelligence',
    description: 'AI categorizes issues, suggests priorities, recommends troubleshooting steps, and optimizes scheduling for maintenance tasks',
    tag: 'Smart Automation'
  },
  {
    icon: FileText,
    title: 'Document Intelligence',
    description: 'OCR extracts text from PDFs, AI pulls structured data from AFSS documents, lease agreements, and compliance certificates',
    tag: 'Data Extraction'
  },
  {
    icon: Search,
    title: 'Smart Search & Q&A',
    description: 'Ask questions about any document, lease agreement, or NSW strata legislation and get instant, contextual answers',
    tag: 'Knowledge Base'
  },
  {
    icon: MessageSquare,
    title: 'Communication Assistant',
    description: 'AI auto-categorizes resident messages, detects priority, routes to correct staff, and suggests template responses',
    tag: 'Smart Routing'
  },
  {
    icon: Zap,
    title: 'Pattern Recognition',
    description: 'Analyzes maintenance history to identify recurring issues, predict future problems, and recommend preventive actions',
    tag: 'Predictive Analytics'
  }
];

export default function AiCapabilities() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 to-blue-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-blue-300" />
            <span className="text-sm font-medium">Powered by Advanced AI</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Intelligence That Works For You
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Cutting-edge AI capabilities that transform how you manage properties
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((capability, idx) => (
            <Card key={idx} className="border-0 bg-white/10 backdrop-blur-sm hover:bg-white/15 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <capability.icon className="h-6 w-6 text-blue-300" />
                  </div>
                  <span className="text-xs px-2 py-1 bg-blue-400/20 text-blue-200 rounded-full">
                    {capability.tag}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{capability.title}</h3>
                <p className="text-blue-100 leading-relaxed">{capability.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-lg text-blue-100">
            All AI features are built-in and continuously learning to improve your operations
          </p>
        </div>
      </div>
    </section>
  );
}