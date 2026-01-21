import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Loader2, Filter, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const categoryOptions = [
  { value: 'core_building_structure', label: 'Core Building Structure' },
  { value: 'mechanical_services', label: 'Mechanical Services' },
  { value: 'electrical_services', label: 'Electrical Services' },
  { value: 'fire_life_safety', label: 'Fire & Life Safety' },
  { value: 'vertical_transportation', label: 'Vertical Transportation' },
  { value: 'hydraulic_plumbing', label: 'Hydraulic & Plumbing' },
  { value: 'security_access_control', label: 'Security & Access Control' },
  { value: 'communications_it', label: 'Communications & IT' },
  { value: 'building_management_systems', label: 'Building Management Systems' },
  { value: 'external_grounds', label: 'External Grounds' },
  { value: 'common_area_fixtures_fittings', label: 'Common Area Fixtures' },
  { value: 'waste_management', label: 'Waste Management' },
  { value: 'parking_traffic', label: 'Parking & Traffic' },
  { value: 'compliance_safety', label: 'Compliance & Safety' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function MaintenanceReportFilters({ buildingId, buildingName }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Filters
  const [reportPeriod, setReportPeriod] = useState('last_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedPriorities, setSelectedPriorities] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const togglePriority = (priority) => {
    setSelectedPriorities(prev =>
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };

  const toggleStatus = (status) => {
    setSelectedStatuses(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSelectedPriorities([]);
    setSelectedStatuses([]);
    setReportPeriod('last_month');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleGenerateReport = async () => {
    if (!buildingId) {
      toast.error('Please select a building');
      return;
    }

    if (reportPeriod === 'custom' && (!customStartDate || !customEndDate)) {
      toast.error('Please select both start and end dates');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await base44.functions.invoke('generateMaintenanceReport', {
        buildingId,
        reportPeriod,
        startDate: reportPeriod === 'custom' ? customStartDate : undefined,
        endDate: reportPeriod === 'custom' ? customEndDate : undefined,
        categories: selectedCategories,
        priorities: selectedPriorities,
        statuses: selectedStatuses,
        sendEmail: false
      });

      if (response.data.success && response.data.report_url) {
        window.open(response.data.report_url, '_blank');
        toast.success('Report generated successfully');
      } else {
        toast.error('Failed to generate report');
      }
    } catch (error) {
      console.error('Report generation error:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const activeFilterCount = selectedCategories.length + selectedPriorities.length + selectedStatuses.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Building Managers Report
          </div>
          {buildingName && (
            <span className="text-sm font-normal text-slate-500">{buildingName}</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period Selection */}
        <div>
          <Label htmlFor="period">Report Period</Label>
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger id="period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="last_quarter">Last Quarter</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Custom Date Range */}
        {reportPeriod === 'custom' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Advanced Filters Toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Filter Options</Label>
              {activeFilterCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-slate-500 h-8"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Categories */}
            <div>
              <Label className="text-sm mb-2 block">Work Order Categories</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                {categoryOptions.map(cat => (
                  <div key={cat.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`cat-${cat.value}`}
                      checked={selectedCategories.includes(cat.value)}
                      onCheckedChange={() => toggleCategory(cat.value)}
                    />
                    <Label htmlFor={`cat-${cat.value}`} className="text-xs cursor-pointer">
                      {cat.label}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedCategories.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">
                  {selectedCategories.length} selected
                </p>
              )}
            </div>

            {/* Priorities */}
            <div>
              <Label className="text-sm mb-2 block">Priority Levels</Label>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map(pri => (
                  <div key={pri.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`pri-${pri.value}`}
                      checked={selectedPriorities.includes(pri.value)}
                      onCheckedChange={() => togglePriority(pri.value)}
                    />
                    <Label htmlFor={`pri-${pri.value}`} className="text-sm cursor-pointer">
                      {pri.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Statuses */}
            <div>
              <Label className="text-sm mb-2 block">Status</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(stat => (
                  <div key={stat.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`stat-${stat.value}`}
                      checked={selectedStatuses.includes(stat.value)}
                      onCheckedChange={() => toggleStatus(stat.value)}
                    />
                    <Label htmlFor={`stat-${stat.value}`} className="text-sm cursor-pointer">
                      {stat.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating || !buildingId}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}