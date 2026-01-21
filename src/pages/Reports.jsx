import React from 'react';
import { useBuildingContext } from '@/components/BuildingContext';
import PageHeader from '@/components/common/PageHeader';
import EnhancedReportGenerator from '@/components/reports/EnhancedReportGenerator';
import { FileText } from 'lucide-react';

export default function Reports() {
  const { selectedBuildingId } = useBuildingContext();

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Reports & Analytics" 
        subtitle={selectedBuildingId ? "Generate comprehensive reports for your building" : "Select a building to generate reports"}
      />

      {!selectedBuildingId ? (
        <div className="flex flex-col items-center justify-center py-12">
          <FileText className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-slate-500 text-center">Please select a building to generate reports</p>
        </div>
      ) : (
        <EnhancedReportGenerator />
      )}
    </div>
  );
}