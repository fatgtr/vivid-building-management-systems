import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Phone, MapPin, Send, CheckCircle2, MessageSquare, Clock } from 'lucide-react';
import VividLogo from '@/components/marketing/VividLogo';
import { useToast } from '@/components/ui/use-toast';

export default function Contact() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Compose a mailto link so the message reaches the team without a backend dependency.
    const body = `Name: ${form.name}%0D%0AEmail: ${form.email}%0D%0A%0D%0A${encodeURIComponent(form.message)}`;
    const mailto = `mailto:hello@vividbms.com?subject=${encodeURIComponent(form.subject || 'Contact enquiry')}&body=${body}`;
    window.location.href = mailto;
    setSubmitting(false);
    setSubmitted(true);
    toast({ title: 'Opening your email client…', description: 'Your message is ready to send.' });
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="focus:outline-none">
              <VividLogo />
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/About" className="text-gray-700 hover:text-[#00529F] font-medium transition-colors hidden sm:inline">
                About
              </Link>
              <Link to="/">
                <Button variant="outline" className="border-[#00529F] text-[#00529F] hover:bg-[#00529F] hover:text-white">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-[#00529F]/95 via-slate-900/90 to-slate-800/95"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 backdrop-blur-md rounded-full mb-8 border border-white/20">
            <MessageSquare className="h-4 w-4 text-[#FEBE10]" />
            <span className="text-white font-semibold text-sm tracking-wide">Get in touch</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight text-white">
            We'd love to <span className="bg-gradient-to-r from-[#FEBE10] to-white bg-clip-text text-transparent">hear from you</span>
          </h1>
          <p className="text-xl text-gray-200 max-w-3xl mx-auto font-light">
            Questions, demos, partnerships, or support — the Vivid BMS team is here to help.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact methods */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Contact details</h2>
              <div className="space-y-5">
                <Card className="border-2 border-gray-200 hover:border-[#00529F] transition-all">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                      <a href="mailto:hello@vividbms.com" className="text-[#00529F] hover:underline">hello@vividbms.com</a>
                      <p className="text-sm text-gray-500 mt-1">General enquiries & support</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200 hover:border-[#FEBE10] transition-all">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FEBE10] to-[#d9a509] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                      <a href="tel:1300848432" className="text-[#00529F] hover:underline">1300 VIVID BMS</a>
                      <p className="text-sm text-gray-500 mt-1">Mon–Fri, 9am–5pm AEST</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200 hover:border-[#00529F] transition-all">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Office</h3>
                      <p className="text-gray-700">Sydney, Australia</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-gray-200 hover:border-[#00529F] transition-all">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#00529F] to-[#003d75] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Response time</h3>
                      <p className="text-gray-700">We aim to reply within one business day.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-8 flex flex-wrap gap-4 text-sm">
                <span className="text-gray-500">Specific enquiries:</span>
                <a href="mailto:demo@vividbms.com" className="text-[#00529F] hover:underline">Demos</a>
                <a href="mailto:partners@vividbms.com" className="text-[#00529F] hover:underline">Partnerships</a>
                <a href="mailto:support@vividbms.com" className="text-[#00529F] hover:underline">Support</a>
                <a href="mailto:careers@vividbms.com" className="text-[#00529F] hover:underline">Careers</a>
              </div>
            </div>

            {/* Contact form */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
              <Card className="border-2 border-gray-200 shadow-lg">
                <CardContent className="p-8">
                  {submitted ? (
                    <div className="text-center py-10">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to send!</h3>
                      <p className="text-gray-600 mb-6">Your email client should have opened with your message. If not, email us directly at hello@vividbms.com.</p>
                      <Button variant="outline" onClick={() => setSubmitted(false)} className="border-[#00529F] text-[#00529F]">
                        Send another message
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" required value={form.name} onChange={handleChange} placeholder="Your name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" name="email" type="email" required value={form.email} onChange={handleChange} placeholder="you@example.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input id="subject" name="subject" value={form.subject} onChange={handleChange} placeholder="How can we help?" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea id="message" name="message" required value={form.message} onChange={handleChange} placeholder="Tell us a bit about your enquiry…" rows={5} />
                      </div>
                      <Button type="submit" disabled={submitting} className="w-full bg-[#00529F] hover:bg-[#003d75] text-white">
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-gray-300 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
            <div className="flex items-center gap-6">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/About" className="hover:text-white transition-colors">About</Link>
              <span className="text-white font-semibold">Contact</span>
            </div>
            <p>&copy; {new Date().getFullYear()} Vivid Building Management Systems. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}