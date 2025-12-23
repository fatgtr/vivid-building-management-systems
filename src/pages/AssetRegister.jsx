import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { useBuildingContext } from '@/components/BuildingContext';
import { usePermissions } from '@/components/permissions/PermissionsContext';
import { ASSET_CATEGORIES, formatSubcategoryLabel } from '@/components/categories/assetCategories';
import BuildingManagerView from '@/components/assets/BuildingManagerView';
import StrataManagerView from '@/components/assets/StrataManagerView';
import ContractorView from '@/components/assets/ContractorView';
import CommitteeView from '@/components/assets/CommitteeView';
import { 
  Search, 
  Package, 
  ChevronLeft,
  ChevronRight,
  User,
  Building as BuildingIcon,
  Users,
  HardHat
} from 'lucide-react';
import { format } from 'date-fns';

export default function AssetRegister() {
  const { selectedBuildingId, managedBuildings } = useBuildingContext();
  const { hasRole, isAdmin } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [complianceFilter, setComplianceFilter] = useState('all');
  const [viewMode, setViewMode] = useState('auto'); // auto, building_manager, strata_manager, contractor, committee
  
  // Determine user role
  const isContractor = hasRole('contractor');
  const isCommitteeMember = hasRole('committee');
  const isStrataManager = hasRole('strata_manager') || isAdmin();
  const isBuildingManager = hasRole('building_manager') || isAdmin();

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

  // Determine default view based on role
  const getDefaultView = () => {
    if (viewMode !== 'auto') return viewMode;
    if (isCommitteeMember) return 'committee';
    if (isContractor) return 'contractor';
    if (isStrataManager) return 'strata_manager';
    return 'building_manager';
  };

  const currentView = getDefaultView();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Asset Register" 
        subtitle={`${filteredAssets.length} assets tracked across ${selectedBuildingId ? 'this building' : 'all buildings'}`}
      >
        {/* Role View Selector - Only show if user has multiple roles */}
        {(isBuildingManager && isStrataManager) || isAdmin() ? (
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="View Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto (Role-Based)</SelectItem>
              <SelectItem value="building_manager">Building Manager</SelectItem>
              <SelectItem value="strata_manager">Strata Manager</SelectItem>
              <SelectItem value="contractor">Contractor</SelectItem>
              <SelectItem value="committee">Committee</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </PageHeader>

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
            <>
              {/* Role-Based Views */}
              {currentView === 'building_manager' && (
                <BuildingManagerView 
                  assets={filteredAssets}
                  getBuildingName={getBuildingName}
                  getLocationName={getLocationName}
                  selectedBuildingId={selectedBuildingId}
                />
              )}

              {currentView === 'strata_manager' && (
                <StrataManagerView 
                  assets={filteredAssets}
                  getBuildingName={getBuildingName}
                  selectedBuildingId={selectedBuildingId}
                />
              )}

              {currentView === 'contractor' && (
                <ContractorView 
                  assets={filteredAssets}
                  getLocationName={getLocationName}
                />
              )}

              {currentView === 'committee' && (
                <CommitteeView 
                  assets={filteredAssets}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}