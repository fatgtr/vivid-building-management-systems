import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from '@/components/common/PageHeader';
import { useBuildingContext } from '@/components/BuildingContext';
import { ASSET_CATEGORIES } from '@/components/categories/assetCategories';
import { 
  TrendingUp, 
  AlertTriangle, 
  Calendar,
  DollarSign,
  FileText,
  Download,
  Building2,
  Clock,
  Shield
} from 'lucide-react';
import { format, differenceInYears, addYears } from 'date-fns';

export default function CapitalWorksPlanning() {
  const { selectedBuildingId, managedBuildings } = useBuildingContext();
  const [forecastYears, setForecastYears] = useState(10);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', selectedBuildingId],
    queryFn: () => {
      if (!selectedBuildingId) return [];
      return base44.entities.Asset.filter({ 
        building_id: selectedBuildingId,
        status: 'active'
      });
    },
    enabled: !!selectedBuildingId,
  });

  const { data: buildings = [] } = useQuery({
    queryKey: ['buildings'],
    queryFn: () => base44.entities.Building.list(),
  });

  const calculateAssetMetrics = (asset) => {
    if (!asset.installation_date || !asset.lifecycle_years) {
      return {
        age: 0,
        remainingLife: asset.lifecycle_years || 0,
        replacementYear: null,
        isWithin3Years: false,
        isCritical: false,
        percentageUsed: 0
      };
    }

    const installDate = new Date(asset.installation_date);
    const currentYear = new Date().getFullYear();
    const age = differenceInYears(new Date(), installDate);
    const remainingLife = Math.max(0, asset.lifecycle_years - age);
    const replacementYear = currentYear + remainingLife;
    const isWithin3Years = remainingLife <= 3 && remainingLife >= 0;
    const isCritical = remainingLife <= 0;
    const percentageUsed = Math.min(100, (age / asset.lifecycle_years) * 100);

    return {
      age,
      remainingLife,
      replacementYear,
      isWithin3Years,
      isCritical,
      percentageUsed
    };
  };

  const assetsWithMetrics = useMemo(() => {
    return assets.map(asset => ({
      ...asset,
      metrics: calculateAssetMetrics(asset)
    }));
  }, [assets]);

  const criticalAssets = assetsWithMetrics.filter(a => a.metrics.isCritical);
  const within3YearAssets = assetsWithMetrics.filter(a => a.metrics.isWithin3Years);
  
  const forecastByYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const forecast = {};

    for (let i = 0; i <= forecastYears; i++) {
      const year = currentYear + i;
      forecast[year] = [];
    }

    assetsWithMetrics.forEach(asset => {
      const { replacementYear } = asset.metrics;
      if (replacementYear && replacementYear >= currentYear && replacementYear <= currentYear + forecastYears) {
        forecast[replacementYear].push(asset);
      }
    });

    return forecast;
  }, [assetsWithMetrics, forecastYears]);

  const totalForecastCost = useMemo(() => {
    return Object.values(forecastByYear).flat().reduce((sum, asset) => {
      return sum + (asset.replacement_cost || 0);
    }, 0);
  }, [forecastByYear]);

  const generateReport = async () => {
    const currentYear = new Date().getFullYear();
    const building = buildings.find(b => b.id === selectedBuildingId);
    
    const reportData = {
      buildingName: building?.name || 'Unknown Building',
      generatedDate: format(new Date(), 'dd/MM/yyyy'),
      forecastPeriod: `${currentYear} - ${currentYear + forecastYears}`,
      totalAssets: assets.length,
      criticalAssets: criticalAssets.length,
      within3YearAssets: within3YearAssets.length,
      totalForecastCost: totalForecastCost,
      yearlyBreakdown: Object.entries(forecastByYear).map(([year, assets]) => ({
        year,
        assetCount: assets.length,
        totalCost: assets.reduce((sum, a) => sum + (a.replacement_cost || 0), 0),
        assets: assets.map(a => ({
          name: a.name,
          category: ASSET_CATEGORIES[a.asset_main_category]?.label || a.asset_main_category,
          age: a.metrics.age,
          remainingLife: a.metrics.remainingLife,
          replacementCost: a.replacement_cost || 0,
          riskRating: a.risk_rating || 'medium'
        }))
      }))
    };

    // Call backend function to generate PDF report
    const { data } = await base44.functions.invoke('generateCapitalWorksReport', reportData);
    
    if (data?.reportUrl) {
      window.open(data.reportUrl, '_blank');
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getBuildingName = (buildingId) => buildings.find(b => b.id === buildingId)?.name || 'Unknown';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Capital Works Planning" subtitle="10-year asset replacement forecast" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!selectedBuildingId) {
    return (
      <div className="space-y-6">
        <PageHeader title="Capital Works Planning" subtitle="10-year asset replacement forecast" />
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Building Selected</h3>
            <p className="text-slate-500">Please select a building to view capital works planning</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Capital Works Planning" 
        subtitle={`${forecastYears}-year forecast for ${getBuildingName(selectedBuildingId)}`}
      >
        <Button onClick={generateReport} className="gap-2">
          <Download className="h-4 w-4" />
          Generate Report
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{criticalAssets.length}</p>
                <p className="text-sm text-slate-500">Critical (Past Due)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{within3YearAssets.length}</p>
                <p className="text-sm text-slate-500">Within 3 Years</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{assets.length}</p>
                <p className="text-sm text-slate-500">Total Active Assets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">${(totalForecastCost / 1000).toFixed(0)}k</p>
                <p className="text-sm text-slate-500">{forecastYears}-Year Budget</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList>
          <TabsTrigger value="forecast">10-Year Forecast</TabsTrigger>
          <TabsTrigger value="critical">Critical Assets</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming (3 Years)</TabsTrigger>
        </TabsList>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          {Object.entries(forecastByYear)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([year, yearAssets]) => {
              const yearTotal = yearAssets.reduce((sum, a) => sum + (a.replacement_cost || 0), 0);
              
              if (yearAssets.length === 0) return null;

              return (
                <Card key={year}>
                  <CardHeader className="border-b bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          {year}
                        </CardTitle>
                        <p className="text-sm text-slate-500 mt-1">{yearAssets.length} assets due for replacement</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">${yearTotal.toLocaleString()}</p>
                        <p className="text-sm text-slate-500">Estimated Cost</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {yearAssets.map(asset => {
                        const categoryConfig = ASSET_CATEGORIES[asset.asset_main_category];
                        const Icon = categoryConfig?.icon || Shield;

                        return (
                          <Card key={asset.id} className="border-2">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg ${categoryConfig?.color} flex items-center justify-center`}>
                                    <Icon className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-slate-900">{asset.name}</h4>
                                    <p className="text-xs text-slate-500">{categoryConfig?.label}</p>
                                  </div>
                                </div>
                                {asset.risk_rating && (
                                  <Badge className={getRiskColor(asset.risk_rating)}>
                                    {asset.risk_rating}
                                  </Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-slate-500">Age</p>
                                  <p className="font-semibold">{asset.metrics.age} years</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Remaining Life</p>
                                  <p className="font-semibold">{asset.metrics.remainingLife} years</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Lifecycle</p>
                                  <p className="font-semibold">{asset.lifecycle_years} years</p>
                                </div>
                                <div>
                                  <p className="text-slate-500">Replacement Cost</p>
                                  <p className="font-semibold text-green-600">
                                    ${(asset.replacement_cost || 0).toLocaleString()}
                                  </p>
                                </div>
                              </div>

                              {/* Progress bar */}
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-slate-500">Lifecycle Used</span>
                                  <span className="font-semibold">{asset.metrics.percentageUsed.toFixed(0)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${
                                      asset.metrics.percentageUsed >= 100 ? 'bg-red-500' :
                                      asset.metrics.percentageUsed >= 85 ? 'bg-orange-500' :
                                      asset.metrics.percentageUsed >= 70 ? 'bg-yellow-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(100, asset.metrics.percentageUsed)}%` }}
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </TabsContent>

        {/* Critical Assets Tab */}
        <TabsContent value="critical">
          <Card>
            <CardHeader className="bg-red-50 border-b">
              <CardTitle className="flex items-center gap-2 text-red-900">
                <AlertTriangle className="h-5 w-5" />
                Critical Assets (Past Replacement Date)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {criticalAssets.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500">No critical assets - excellent!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {criticalAssets.map(asset => {
                    const categoryConfig = ASSET_CATEGORIES[asset.asset_main_category];
                    const Icon = categoryConfig?.icon || Shield;

                    return (
                      <Card key={asset.id} className="border-2 border-red-200 bg-red-50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${categoryConfig?.color} flex items-center justify-center`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900">{asset.name}</h4>
                                <p className="text-xs text-slate-500">{categoryConfig?.label}</p>
                              </div>
                            </div>
                            <Badge className="bg-red-600 text-white">Overdue</Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-slate-600">Current Age</p>
                              <p className="font-semibold text-red-700">{asset.metrics.age} years</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Expected Life</p>
                              <p className="font-semibold">{asset.lifecycle_years} years</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-slate-600">Replacement Cost</p>
                              <p className="font-semibold text-lg text-green-700">
                                ${(asset.replacement_cost || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming 3 Years Tab */}
        <TabsContent value="upcoming">
          <Card>
            <CardHeader className="bg-orange-50 border-b">
              <CardTitle className="flex items-center gap-2 text-orange-900">
                <Clock className="h-5 w-5" />
                Assets Due Within 3 Years
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {within3YearAssets.length === 0 ? (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500">No assets due for replacement in the next 3 years</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {within3YearAssets.map(asset => {
                    const categoryConfig = ASSET_CATEGORIES[asset.asset_main_category];
                    const Icon = categoryConfig?.icon || Shield;

                    return (
                      <Card key={asset.id} className="border-2 border-orange-200">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg ${categoryConfig?.color} flex items-center justify-center`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-slate-900">{asset.name}</h4>
                                <p className="text-xs text-slate-500">{categoryConfig?.label}</p>
                              </div>
                            </div>
                            <Badge className="bg-orange-500 text-white">
                              {asset.metrics.remainingLife} {asset.metrics.remainingLife === 1 ? 'year' : 'years'} left
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-slate-500">Installed</p>
                              <p className="font-semibold">{format(new Date(asset.installation_date), 'yyyy')}</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Replace By</p>
                              <p className="font-semibold text-orange-600">{asset.metrics.replacementYear}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-slate-500">Replacement Cost</p>
                              <p className="font-semibold text-lg text-green-600">
                                ${(asset.replacement_cost || 0).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-slate-500">Lifecycle Progress</span>
                              <span className="font-semibold">{asset.metrics.percentageUsed.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full bg-orange-500"
                                style={{ width: `${Math.min(100, asset.metrics.percentageUsed)}%` }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}