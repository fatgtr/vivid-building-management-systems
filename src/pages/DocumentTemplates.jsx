import React from 'react';
import DocumentTemplateManager from '@/components/documents/DocumentTemplateManager';
import { useBuildingContext } from '@/components/BuildingContext';

export default function DocumentTemplates() {
  const { selectedBuildingId } = useBuildingContext();

  return (
    <div className="space-y-6">
      <DocumentTemplateManager buildingId={selectedBuildingId} />
    </div>
  );
}