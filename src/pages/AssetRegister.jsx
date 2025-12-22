import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { useBuildingContext } from '@/components/BuildingContext';
import { ASSET_CATEGORIES, formatSubcategoryLabel } from '@/components/categories/assetCategories';
import { 
  Search, 
  Package, 
  MapPin, 
  Calendar,
  Building,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';



const complianceStatusConfig = {
  compliant: { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Compliant' },
  due_soon: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Due Soon' },
  overdue: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', label: 'Overdue' },
  requires_attention: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Needs Attention' },
  unknown: { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50', label: 'Unknown' },
};

export default function AssetRegister() {
  const { selectedBuildingId, managedBuildings } = useBuildingContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [complianceFilter, setComplianceFilter] = useState('all');

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', selectedBuildingId],
    queryFn: async () => {
      const result = selectedBuildingId 
        ? await base44.entities.Asset.filter({ building_id: selectedBuildingId })
        : await base44.entities.Asset.list();
      console.log('Assets fetched:', result);
      return result;
    },
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
    enabled: !selectedBuildingId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations', selectedBuildingId],
    queryFn: () => selectedBuildingId 
      ? base44.entities.Location.filter({ building_id: selectedBuildingId })
      : base44.entities.Location.list(),
  });

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = 
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.asset_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.identifier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMainCategory = !selectedMainCategory || asset.asset_main_category === selectedMainCategory;
    const matchesSubcategory = !selectedSubcategory || asset.asset_subcategory === selectedSubcategory;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesCompliance = complianceFilter === 'all' || asset.compliance_status === complianceFilter;
    
    return matchesSearch && matchesMainCategory && matchesSubcategory && matchesStatus && matchesCompliance;
  });

  const getBuildingName = (buildingId) => {
    if (selectedBuildingId) {
      const building = managedBuildings.find(b => b.id === buildingId);
      return building?.name || 'Unknown';
    }
    const building = buildings.find(b => b.id === buildingId);
    return building?.name || 'Unknown';
  };

  const getLocationName = (locationId) => {
    if (!locationId) return null;
    const location = locations.find(l => l.id === locationId);
    return location ? `${location.name} (${location.floor_level})` : null;
  };

  const getMainCategoryCounts = () => {
    const counts = {};
    assets.forEach(asset => {
      if (asset.asset_main_category) {
        counts[asset.asset_main_category] = (counts[asset.asset_main_category] || 0) + 1;
      }
    });
    return counts;
  };

  const getSubcategoryCounts = (mainCategory) => {
    const counts = {};
    assets.forEach(asset => {
      if (asset.asset_main_category === mainCategory && asset.asset_subcategory) {
        counts[asset.asset_subcategory] = (counts[asset.asset_subcategory] || 0) + 1;
      }
    });
    return counts;
  };

  const mainCategoryCounts = getMainCategoryCounts();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <PageHeader title="Asset Register" subtitle="Track all building assets and equipment" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Asset Register" 
        subtitle={`${filteredAssets.length} assets tracked across ${selectedBuildingId ? 'this building' : 'all buildings'}`}
      />

      {/* Category Navigation */}
      {selectedMainCategory && (
        <div className="flex items-center gap-2 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSelectedMainCategory(null);
              setSelectedSubcategory(null);
            }}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to All Categories
          </Button>
          {selectedSubcategory && (
            <>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedSubcategory(null)}
                className="gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Back to {ASSET_CATEGORIES[selectedMainCategory]?.label}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Main Category Cards */}
      {!selectedMainCategory && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Object.entries(ASSET_CATEGORIES).map(([key, category]) => {
            const Icon = category.icon;
            const count = mainCategoryCounts[key] || 0;
            return (
              <Card 
                key={key}
                className="cursor-pointer transition-all hover:shadow-lg hover:scale-105"
                onClick={() => setSelectedMainCategory(key)}
              >
                <CardContent className="p-5 text-center">
                  <div className={`w-12 h-12 rounded-xl ${category.color} mx-auto flex items-center justify-center mb-3`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900 mb-1">{count}</p>
                  <p className="text-sm text-slate-700 font-medium leading-tight">{category.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sub-Category Cards */}
      {selectedMainCategory && !selectedSubcategory && (
        <>
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              {(() => {
                const Icon = ASSET_CATEGORIES[selectedMainCategory]?.icon;
                return Icon ? <Icon className="h-6 w-6" /> : null;
              })()}
              {ASSET_CATEGORIES[selectedMainCategory]?.label}
            </h2>
            <p className="text-slate-500 mt-1">Select a sub-category to view assets</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {ASSET_CATEGORIES[selectedMainCategory]?.subcategories.map(subcategory => {
              const subcategoryCounts = getSubcategoryCounts(selectedMainCategory);
              const count = subcategoryCounts[subcategory] || 0;
              return (
                <Card 
                  key={subcategory}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-blue-300"
                  onClick={() => setSelectedSubcategory(subcategory)}
                >
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-slate-900 mb-1">{count}</p>
                    <p className="text-xs text-slate-600 leading-tight">{formatSubcategoryLabel(subcategory)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Filters - Only show when viewing asset list */}
      {selectedSubcategory && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={complianceFilter} onValueChange={setComplianceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Compliance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Compliance</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="requires_attention">Requires Attention</SelectItem>
                  <SelectItem value="unknown">Unknown</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="decommissioned">Decommissioned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Asset List - Only show when subcategory is selected */}
      {selectedSubcategory && (
        <>
          {filteredAssets.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No assets found"
              description={searchQuery 
                ? "Try adjusting your search" 
                : "No assets in this sub-category yet"}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAssets.map((asset) => {
                const categoryConfig = ASSET_CATEGORIES[asset.asset_main_category];
                const Icon = categoryConfig?.icon || Package;
                const colorClass = categoryConfig?.color || 'text-slate-600 bg-slate-50 border-slate-200';
                const complianceConfig = complianceStatusConfig[asset.compliance_status] || complianceStatusConfig.unknown;
                const ComplianceIcon = complianceConfig.icon;

                return (
                  <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg ${colorClass} flex items-center justify-center flex-shrink-0`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate">{asset.name}</h3>
                            <p className="text-xs text-slate-500 capitalize">{asset.asset_type?.replace(/_/g, ' ')}</p>
                          </div>
                        </div>
                        <StatusBadge status={asset.status} />
                      </div>

                  {asset.identifier && (
                    <div className="mb-3 pb-3 border-b border-slate-100">
                      <p className="text-xs text-slate-500">Identifier</p>
                      <p className="text-sm font-mono text-slate-700">{asset.identifier}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {(asset.location || asset.location_id) && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        <span className="truncate">
                          {getLocationName(asset.location_id) || asset.location}
                        </span>
                      </div>
                    )}

                    {asset.floor && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building className="h-4 w-4 text-slate-400" />
                        <span>Floor {asset.floor}</span>
                      </div>
                    )}

                    {asset.manufacturer && (
                      <div className="text-xs text-slate-500">
                        <span className="font-medium">Manufacturer:</span> {asset.manufacturer}
                      </div>
                    )}

                    {asset.asset_category === 'lift' && asset.rated_load_kg && (
                      <div className="text-xs text-slate-500">
                        <span className="font-medium">Capacity:</span> {asset.rated_load_kg}kg ({asset.max_passengers} passengers)
                      </div>
                    )}

                    {asset.asset_category === 'lift' && asset.design_registration_number && (
                      <div className="text-xs text-slate-500">
                        <span className="font-medium">Design Reg:</span> {asset.design_registration_number}
                      </div>
                    )}

                    {asset.next_service_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-500">Next Service:</span>
                        <span className="font-medium text-slate-700">
                          {format(new Date(asset.next_service_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    )}

                    {asset.asset_category === 'lift' && asset.replacement_year && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <div className="text-xs text-slate-500 space-y-1">
                          <div>
                            <span className="font-medium">Replacement:</span> {asset.replacement_year} (Est. ${(asset.replacement_cost || 0).toLocaleString()})
                          </div>
                          {asset.annual_sinking_fund > 0 && (
                            <div>
                              <span className="font-medium">Annual Fund:</span> ${asset.annual_sinking_fund.toLocaleString()}/year
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!selectedBuildingId && (
                      <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span className="font-medium">Building:</span> {getBuildingName(asset.building_id)}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className={`flex items-center gap-2 ${complianceConfig.color}`}>
                      <ComplianceIcon className="h-4 w-4" />
                      <span className="text-sm font-medium">{complianceConfig.label}</span>
                    </div>
                  </div>

                      {(asset.notes && asset.notes !== 'null') && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs text-slate-600 line-clamp-2">{asset.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}