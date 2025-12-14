import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Search, AlertCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ResponsibilityLookup() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: responsibilities = [] } = useQuery({
    queryKey: ['responsibilityGuide'],
    queryFn: () => base44.entities.ResponsibilityGuide.list(),
    enabled: open,
  });

  const filteredResults = responsibilities.filter(item => {
    if (!searchQuery) return false;
    const query = searchQuery.toLowerCase();
    return (
      item.item.toLowerCase().includes(query) ||
      item.type.toLowerCase().includes(query) ||
      item.additional_info?.toLowerCase().includes(query)
    );
  }).slice(0, 5);

  const getResponsibilityBadge = (responsible) => {
    if (responsible === 'Owner') {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Owner</Badge>;
    } else if (responsible === 'Owners Corporation') {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Owners Corporation</Badge>;
    } else {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Owner/OC</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <BookOpen className="h-4 w-4" />
          Quick Lookup
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            Responsibility Quick Lookup
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search for item (e.g., 'burst pipe', 'balcony tiles', 'garage door')..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {searchQuery && (
            <div className="space-y-3">
              {filteredResults.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center text-slate-500">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                    <p className="text-sm">No results found for "{searchQuery}"</p>
                    <p className="text-xs mt-1">Try different keywords or visit the full knowledge base</p>
                  </CardContent>
                </Card>
              ) : (
                filteredResults.map((item, idx) => (
                  <Card key={idx} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">{item.type}</Badge>
                            {getResponsibilityBadge(item.responsible)}
                          </div>
                          <h4 className="font-semibold text-slate-900">{item.item}</h4>
                        </div>
                      </div>
                      {item.additional_info && (
                        <p className="text-sm text-slate-600 mt-2">{item.additional_info}</p>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          <div className="pt-4 border-t">
            <Link to={createPageUrl('StrataKnowledgeBase')} onClick={() => setOpen(false)}>
              <Button variant="ghost" className="w-full gap-2">
                <ExternalLink className="h-4 w-4" />
                View Full Strata Knowledge Base
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}