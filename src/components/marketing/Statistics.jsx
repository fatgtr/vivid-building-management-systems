import React from 'react';
import { TrendingUp, Clock, Users, Star } from 'lucide-react';

const stats = [
  {
    icon: TrendingUp,
    value: '60%',
    label: 'Faster Issue Resolution',
    description: 'AI-powered prioritization speeds up maintenance'
  },
  {
    icon: Clock,
    value: '10hrs',
    label: 'Saved Per Week',
    description: 'Automated workflows reduce manual tasks'
  },
  {
    icon: Users,
    value: '95%',
    label: 'Resident Satisfaction',
    description: 'Self-service portal improves experience'
  },
  {
    icon: Star,
    value: '100%',
    label: 'Compliance Rate',
    description: 'Automated tracking ensures nothing is missed'
  }
];

export default function Statistics() {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 to-indigo-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Proven Results Across Properties
          </h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            Real impact on operations, efficiency, and satisfaction
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
                <stat.icon className="h-8 w-8 text-white" />
              </div>
              <div className="text-5xl font-bold mb-2">{stat.value}</div>
              <div className="text-xl font-semibold mb-2">{stat.label}</div>
              <p className="text-blue-100 text-sm">{stat.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}