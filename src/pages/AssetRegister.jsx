import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import StatusBadge from '@/components/common/StatusBadge';
import { useBuildingContext } from '@/components/BuildingContext';
import { 
  Search, 
  Package, 
  MapPin, 
  Calendar,
  Flame,
  Zap,
  Wind,
  Droplet,
  Building,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

const categoryIcons = {
  fire_safety: Flame,
  electrical: Zap,
  mechanical: Wind,
  plumbing: Droplet,
  hvac: Wind,
  lift: Building,
  other: Package,
};

const categoryColors = {
  fire_safety: 'text-orange-600 bg-orange-50 border-orange-200',
  electrical: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  mechanical: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  plumbing: 'text-blue-600 bg-blue-50 border-blue-200',
  hvac: 'text-cyan-600 bg-cyan-50 border-cyan-200',
  lift: 'text-purple-600 bg-purple-50 border-purple-200',
  other: 'text-slate-600 bg-slate-50 border-slate-200',
};

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
  const [categoryFilter, setCategoryFilter] = useState('all');
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
    
    const matchesCategory = categoryFilter === 'all' || asset.asset_category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
    const matchesCompliance = complianceFilter === 'all' || asset.compliance_status === complianceFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesCompliance;
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

  const getCategoryCounts = () => {
    const counts = {};
    assets.forEach(asset => {
      counts[asset.asset_category] = (counts[asset.asset_category] || 0) + 1;
    });
    return counts;
  };

  const categoryCounts = getCategoryCounts();

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

      {/* Category Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {Object.entries(categoryColors).map(([category, colorClass]) => {
          const Icon = categoryIcons[category];
          const count = categoryCounts[category] || 0;
          return (
            <Card 
              key={category}
              className={`cursor-pointer transition-all ${categoryFilter === category ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => setCategoryFilter(categoryFilter === category ? 'all' : category)}
            >
              <CardContent className="p-4 text-center">
                <div className={`w-10 h-10 rounded-full ${colorClass} mx-auto flex items-center justify-center mb-2`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-2xl font-bold text-slate-900">{count}</p>
                <p className="text-xs text-slate-500 capitalize mt-1">{category.replace(/_/g, ' ')}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="fire_safety">Fire Safety</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="mechanical">Mechanical</SelectItem>
                <SelectItem value="plumbing">Plumbing</SelectItem>
                <SelectItem value="hvac">HVAC</SelectItem>
                <SelectItem value="lift">Lift</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

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

      {/* Asset List */}
      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No assets found"
          description={searchQuery || categoryFilter !== 'all' 
            ? "Try adjusting your filters" 
            : "Assets will appear here after extracting from documents"}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => {
            const Icon = categoryIcons[asset.asset_category] || Package;
            const complianceConfig = complianceStatusConfig[asset.compliance_status] || complianceStatusConfig.unknown;
            const ComplianceIcon = complianceConfig.icon;

            return (
              <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${categoryColors[asset.asset_category]} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{asset.name}</h3>
                        <p className="text-xs text-slate-500 capitalize">{asset.asset_type.replace(/_/g, ' ')}</p>
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
    </div>
  );
}