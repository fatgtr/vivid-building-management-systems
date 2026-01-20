import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Search,
  CheckCircle,
  Sparkles
} from 'lucide-react';

export default function PolicyTemplateLibrary({ onSelectTemplate }) {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['policyTemplates'],
    queryFn: () => base44.entities.PolicyTemplate.list()
  });

  const policyTypeLabels = {
    move_in_move_out: 'Move In/Out',
    pet_policy: 'Pet Policy',
    whs_safety: 'WHS & Safety',
    noise_disturbance: 'Noise & Disturbance',
    parking: 'Parking',
    common_area_usage: 'Common Areas',
    renovation_alterations: 'Renovations',
    waste_management: 'Waste Management',
    smoking: 'Smoking',
    short_term_rental: 'Short-term Rentals',
    guest_policy: 'Guests',
    amenity_usage: 'Amenity Usage',
    general: 'General'
  };

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return <div className="text-center py-8 text-slate-500">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredTemplates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No templates found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectTemplate(template)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{template.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {policyTypeLabels[template.policy_type]}
                      </Badge>
                      {template.is_default && (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">Default</Badge>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-slate-600">{template.description}</p>
                    )}
                    {template.template_key_points?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500">{template.template_key_points.length} key points included</p>
                      </div>
                    )}
                  </div>
                  <Button size="sm" onClick={() => onSelectTemplate(template)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}