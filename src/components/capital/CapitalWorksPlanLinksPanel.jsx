import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Link as LinkIcon, 
  FileText, 
  Package, 
  Calendar,
  Plus,
  X,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CapitalWorksPlanLinksPanel({ 
  planId, 
  buildingId,
  linkedDocuments = [], 
  linkedAssets = [],
  linkedSchedules = [],
  onUpdate 
}) {
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);

  const { data: documents = [] } = useQuery({
    queryKey: ['documents', buildingId],
    queryFn: () => base44.entities.Document.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', buildingId],
    queryFn: () => base44.entities.Asset.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['maintenance-schedules', buildingId],
    queryFn: () => base44.entities.MaintenanceSchedule.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const linkDocument = async (docId) => {
    const updated = [...linkedDocuments, docId];
    await base44.entities.CapitalWorksPlan.update(planId, { documents: updated });
    toast.success('Document linked');
    onUpdate?.();
    setShowDocumentPicker(false);
  };

  const unlinkDocument = async (docId) => {
    const updated = linkedDocuments.filter(id => id !== docId);
    await base44.entities.CapitalWorksPlan.update(planId, { documents: updated });
    toast.success('Document unlinked');
    onUpdate?.();
  };

  const linkAsset = async (assetId) => {
    const updated = [...linkedAssets, assetId];
    await base44.entities.CapitalWorksPlan.update(planId, { related_asset_ids: updated });
    
    // Also update the asset to reference this plan
    await base44.entities.Asset.update(assetId, { capital_works_plan_id: planId });
    
    toast.success('Asset linked');
    onUpdate?.();
    setShowAssetPicker(false);
  };

  const unlinkAsset = async (assetId) => {
    const updated = linkedAssets.filter(id => id !== assetId);
    await base44.entities.CapitalWorksPlan.update(planId, { related_asset_ids: updated });
    
    // Remove plan reference from asset
    await base44.entities.Asset.update(assetId, { capital_works_plan_id: null });
    
    toast.success('Asset unlinked');
    onUpdate?.();
  };

  const getDocumentName = (docId) => documents.find(d => d.id === docId)?.title || 'Unknown Document';
  const getAssetName = (assetId) => assets.find(a => a.id === assetId)?.name || 'Unknown Asset';

  return (
    <div className="space-y-4">
      {/* Linked Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Linked Documents
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowDocumentPicker(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {linkedDocuments.length === 0 ? (
            <p className="text-sm text-slate-500">No documents linked</p>
          ) : (
            <div className="space-y-2">
              {linkedDocuments.map(docId => {
                const doc = documents.find(d => d.id === docId);
                return (
                  <div key={docId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="text-sm truncate">{doc?.title || 'Unknown'}</span>
                      {doc?.category && (
                        <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => unlinkDocument(docId)}
                      className="h-7 w-7 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Assets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Linked Assets
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAssetPicker(true)}>
              <Plus className="h-3 w-3 mr-1" />
              Link
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {linkedAssets.length === 0 ? (
            <p className="text-sm text-slate-500">No assets linked</p>
          ) : (
            <div className="space-y-2">
              {linkedAssets.map(assetId => {
                const asset = assets.find(a => a.id === assetId);
                return (
                  <div key={assetId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Package className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="text-sm truncate">{asset?.name || 'Unknown'}</span>
                      {asset?.replacement_cost && (
                        <Badge variant="outline" className="text-xs">
                          ${asset.replacement_cost.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => unlinkAsset(assetId)}
                      className="h-7 w-7 flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Maintenance Schedules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Related Maintenance Schedules
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.filter(s => linkedAssets.includes(s.asset_id)).length === 0 ? (
            <p className="text-sm text-slate-500">No schedules for linked assets</p>
          ) : (
            <div className="space-y-2">
              {schedules
                .filter(s => linkedAssets.includes(s.asset_id))
                .map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
                      <span className="text-sm truncate">{schedule.subject}</span>
                      <Badge variant="outline" className="text-xs">{schedule.recurrence}</Badge>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Picker Dialog */}
      <Dialog open={showDocumentPicker} onOpenChange={setShowDocumentPicker}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Document to Plan</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-2 pr-4">
              {documents
                .filter(doc => !linkedDocuments.includes(doc.id))
                .map(doc => (
                  <Card key={doc.id} className="cursor-pointer hover:bg-slate-50" onClick={() => linkDocument(doc.id)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="font-medium text-sm">{doc.title}</p>
                            <p className="text-xs text-slate-500">{doc.category}</p>
                          </div>
                        </div>
                        <Button size="sm">Link</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Asset Picker Dialog */}
      <Dialog open={showAssetPicker} onOpenChange={setShowAssetPicker}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Asset to Plan</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-2 pr-4">
              {assets
                .filter(asset => !linkedAssets.includes(asset.id))
                .map(asset => (
                  <Card key={asset.id} className="cursor-pointer hover:bg-slate-50" onClick={() => linkAsset(asset.id)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-slate-500" />
                          <div>
                            <p className="font-medium text-sm">{asset.name}</p>
                            <p className="text-xs text-slate-500">
                              {asset.asset_main_category}
                              {asset.replacement_cost && ` • $${asset.replacement_cost.toLocaleString()}`}
                            </p>
                          </div>
                        </div>
                        <Button size="sm">Link</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}