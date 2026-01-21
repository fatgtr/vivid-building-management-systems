import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Wrench, Users, Building2, Calendar, Bell, Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';

const iconMap = {
  workOrders: Wrench,
  documents: FileText,
  residents: Users,
  assets: Building2,
  amenities: Calendar,
  announcements: Bell
};

const labelMap = {
  workOrders: 'Work Orders',
  documents: 'Documents',
  residents: 'Residents',
  assets: 'Assets',
  amenities: 'Amenities',
  announcements: 'Announcements'
};

export default function GlobalSearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { selectedBuildingId } = useBuildingContext();
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await base44.functions.invoke('globalSearch', {
          query,
          buildingId: selectedBuildingId || null
        });
        setResults(response.data.results);
        setShowResults(true);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, selectedBuildingId]);

  const handleResultClick = (type, item) => {
    setShowResults(false);
    setQuery('');
    
    // Navigate based on type
    switch (type) {
      case 'workOrders':
        navigate(createPageUrl('OperationsCenter'));
        break;
      case 'documents':
        navigate(createPageUrl('Documents'));
        break;
      case 'residents':
        navigate(createPageUrl('ResidentsCenter'));
        break;
      case 'assets':
        navigate(createPageUrl('AssetRegister'));
        break;
      case 'amenities':
        navigate(createPageUrl('Amenities'));
        break;
      case 'announcements':
        navigate(createPageUrl('BulletinBoard'));
        break;
    }
  };

  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <>
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Search everything..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          className="pl-9 pr-10"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
        )}
      </div>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden p-0">
          <div className="p-4 border-b bg-slate-50">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-400" />
              <span className="font-semibold text-slate-900">
                Search Results for "{query}"
              </span>
              {totalResults > 0 && (
                <Badge variant="secondary">{totalResults} results</Badge>
              )}
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-4">
            {!results || totalResults === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p>No results found</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(results).map(([type, items]) => {
                  if (items.length === 0) return null;
                  
                  const Icon = iconMap[type];
                  const label = labelMap[type];

                  return (
                    <div key={type}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="h-4 w-4 text-slate-400" />
                        <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">
                          {label}
                        </h3>
                        <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
                      </div>

                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleResultClick(type, item)}
                            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                          >
                            <div className="font-medium text-slate-900">
                              {item.title || item.name || item.first_name + ' ' + item.last_name || 'Untitled'}
                            </div>
                            {(item.description || item.email || item.unit_number) && (
                              <div className="text-sm text-slate-500 mt-1">
                                {item.description || item.email || `Unit ${item.unit_number}`}
                              </div>
                            )}
                            {item.category && (
                              <Badge variant="outline" className="mt-2 text-xs">
                                {item.category}
                              </Badge>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}