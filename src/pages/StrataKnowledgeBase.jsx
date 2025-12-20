import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Search, 
  BookOpen, 
  Scale, 
  AlertCircle,
  Filter,
  FileText,
  Building2,
  MessageSquare
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBuildingContext } from '@/components/BuildingContext';
import StrataAIChat from '@/components/strata/StrataAIChat';
import SavedResponsesPanel from '@/components/strata/SavedResponsesPanel';

export default function StrataKnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [user, setUser] = useState(null);
  const { selectedBuildingId } = useBuildingContext();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  // Fetch Responsibility Guide
  const { data: responsibilities = [] } = useQuery({
    queryKey: ['responsibilityGuide'],
    queryFn: () => base44.entities.ResponsibilityGuide.list(),
  });

  // Fetch Legislation Content
  const { data: legislation = [] } = useQuery({
    queryKey: ['legislationContent'],
    queryFn: () => base44.entities.LegislationContent.list(),
  });

  // Get unique types for filtering
  const types = [...new Set(responsibilities.map(r => r.type))];

  // Filter responsibilities
  const filteredResponsibilities = responsibilities.filter(item => {
    const matchesSearch = !searchQuery || 
      item.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.additional_info?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === 'all' || item.type === selectedType;
    
    return matchesSearch && matchesType;
  });

  // Group responsibilities by type and then by responsibility
  const groupedResponsibilities = types
    .filter(type => selectedType === 'all' || type === selectedType)
    .map(type => {
      const itemsForType = filteredResponsibilities.filter(item => item.type === type);
      if (itemsForType.length === 0) return null;

      const groupedByResponsibility = {
        'Owner': itemsForType.filter(item => item.responsible === 'Owner'),
        'Owners Corporation': itemsForType.filter(item => item.responsible === 'Owners Corporation'),
        'Owner/Owners Corporation': itemsForType.filter(item => item.responsible === 'Owner/Owners Corporation'),
      };

      return { type, groups: groupedByResponsibility };
    })
    .filter(Boolean);

  // Filter legislation
  const filteredLegislation = legislation.filter(item => {
    const matchesSearch = !searchQuery ||
      item.section_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.section_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getResponsibilityBadge = (responsible) => {
    if (responsible === 'Owner') {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Owner</Badge>;
    } else if (responsible === 'Owners Corporation') {
      return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Owners Corporation</Badge>;
    } else {
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Owner/OC</Badge>;
    }
  };

  const getCategoryBadge = (category) => {
    const styles = {
      common_property: 'bg-green-100 text-green-700',
      owners_corporation_duties: 'bg-purple-100 text-purple-700',
      maintenance: 'bg-orange-100 text-orange-700',
      insurance: 'bg-red-100 text-red-700',
      by_laws: 'bg-blue-100 text-blue-700',
      general: 'bg-slate-100 text-slate-700',
    };
    return <Badge className={styles[category] || styles.general}>{category?.replace(/_/g, ' ')}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Strata Knowledge Base</h1>
            <p className="text-blue-100 mt-1">NSW Responsibility Guide & Legislation Reference</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by item, type, section, or keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="guide" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="guide">
            <Building2 className="h-4 w-4 mr-2" />
            Who's Responsible Guide
          </TabsTrigger>
          <TabsTrigger value="ai">
            <MessageSquare className="h-4 w-4 mr-2" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="legislation">
            <Scale className="h-4 w-4 mr-2" />
            Strata Legislation
          </TabsTrigger>
        </TabsList>

        {/* Responsibility Guide Tab */}
        <TabsContent value="guide" className="space-y-4">
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select area or item type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Areas</SelectItem>
              {types.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {groupedResponsibilities.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
                <p className="text-slate-600">Try adjusting your search or filter</p>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" className="space-y-3">
              {groupedResponsibilities.map(({ type, groups }) => {
                const totalItems = Object.values(groups).flat().length;
                return (
                  <AccordionItem key={type} value={type} className="border-0 shadow-sm rounded-lg overflow-hidden bg-white">
                    <AccordionTrigger className="px-6 py-4 hover:bg-slate-50 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="text-lg font-bold text-slate-900">{type}</span>
                        <Badge variant="outline" className="ml-2">{totalItems} items</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                      <div className="space-y-5 pt-2">
                        {Object.entries(groups).map(([responsibility, items]) => {
                          if (items.length === 0) return null;
                          return (
                            <div key={responsibility}>
                              <div className="flex items-center gap-2 mb-3">
                                {getResponsibilityBadge(responsibility)}
                                <h3 className="text-base font-semibold text-slate-700">
                                  {responsibility}
                                </h3>
                                <span className="text-xs text-slate-500">({items.length})</span>
                              </div>
                              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {items.map((item, idx) => (
                                  <Card key={idx} className="border border-slate-200 shadow-none hover:shadow-sm transition-shadow">
                                    <CardContent className="p-4">
                                      <h4 className="font-medium text-sm text-slate-900 mb-2">{item.item}</h4>
                                      {item.additional_info && (
                                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                                          <p className="text-xs text-blue-900 leading-relaxed">
                                            <AlertCircle className="h-3 w-3 inline mr-1 flex-shrink-0" />
                                            {item.additional_info}
                                          </p>
                                        </div>
                                      )}
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        {/* AI Assistant Tab */}
        <TabsContent value="ai" className="space-y-4">
          {selectedBuildingId ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <StrataAIChat buildingId={selectedBuildingId} />
              </div>
              <div>
                <SavedResponsesPanel userEmail={user?.email} />
              </div>
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Select a Building</h3>
                <p className="text-slate-600">Please select a building to access the AI assistant</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Legislation Tab */}
        <TabsContent value="legislation" className="space-y-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="common_property">Common Property</SelectItem>
              <SelectItem value="owners_corporation_duties">OC Duties</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="insurance">Insurance</SelectItem>
              <SelectItem value="by_laws">By-Laws</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid gap-3">
            {filteredLegislation.length === 0 ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-12 text-center">
                  <Scale className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Legislation Found</h3>
                  <p className="text-slate-600">Try adjusting your search or category filter</p>
                </CardContent>
              </Card>
            ) : (
              filteredLegislation.map((item, idx) => (
                <Card key={idx} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="font-mono text-xs">{item.section_number}</Badge>
                          {getCategoryBadge(item.category)}
                        </div>
                        <CardTitle className="text-lg">{item.section_title}</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">{item.act_title}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 whitespace-pre-line">{item.content}</p>
                    {item.source_url && (
                      <a 
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mt-3"
                      >
                        View full legislation →
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}