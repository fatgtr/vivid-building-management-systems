import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'Strata Manager',
    company: 'Metro Property Management',
    image: '👩‍💼',
    rating: 5,
    text: 'Vivid BMS has transformed how we manage our portfolio. The AI bylaw analysis alone saves us hours every week. Our clients are thrilled with the resident portal.'
  },
  {
    name: 'David Chen',
    role: 'Building Manager',
    company: 'Harbour View Apartments',
    image: '👨‍💼',
    rating: 5,
    text: 'The automated compliance tracking is a game-changer. We never miss a deadline, and the asset register keeps everything organized. Best investment we\'ve made.'
  },
  {
    name: 'Emma Thompson',
    role: 'Property Owner',
    company: 'Resident at Skyline Tower',
    image: '👩',
    rating: 5,
    text: 'As a resident, the self-service portal is incredible. I can submit maintenance requests, check lease details, and get instant answers about bylaws. So convenient!'
  }
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Trusted by Property Professionals
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            See what managers and residents are saying about Vivid BMS
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="border-0 shadow-lg hover:shadow-xl transition-all">
              <CardContent className="p-8">
                <Quote className="h-10 w-10 text-blue-200 mb-4" />
                
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                
                <p className="text-slate-700 mb-6 leading-relaxed">"{testimonial.text}"</p>
                
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{testimonial.image}</div>
                  <div>
                    <div className="font-semibold text-slate-900">{testimonial.name}</div>
                    <div className="text-sm text-slate-600">{testimonial.role}</div>
                    <div className="text-sm text-slate-500">{testimonial.company}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}