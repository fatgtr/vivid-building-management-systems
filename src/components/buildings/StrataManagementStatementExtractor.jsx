import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle, AlertCircle, FileCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";

const infoTypeLabels = {
  committee_structure: 'Committee Structure',
  meeting_requirements: 'Meeting Requirements',
  levy_structure: 'Levy Structure',
  insurance: 'Insurance',
  maintenance_responsibilities: 'Maintenance Responsibilities',
  service_contracts: 'Service Contracts',
  financial_reporting: 'Financial Reporting',
  dispute_resolution: 'Dispute Resolution',
  voting_procedures: 'Voting Procedures',
  proxy_rules: 'Proxy Rules',
  shared_facility_schedule: 'Shared Facility',
  other: 'Other'
};

const infoTypeColors = {
  committee_structure: 'bg-purple-100 text-purple-700',
  meeting_requirements: 'bg-blue-100 text-blue-700',
  levy_structure: 'bg-green-100 text-green-700',
  insurance: 'bg-orange-100 text-orange-700',
  maintenance_responsibilities: 'bg-yellow-100 text-yellow-700',
  service_contracts: 'bg-indigo-100 text-indigo-700',
  financial_reporting: 'bg-cyan-100 text-cyan-700',
  dispute_resolution: 'bg-red-100 text-red-700',
  voting_procedures: 'bg-pink-100 text-pink-700',
  proxy_rules: 'bg-violet-100 text-violet-700',
  shared_facility_schedule: 'bg-teal-100 text-teal-700',
  other: 'bg-gray-100 text-gray-700'
};

export default function StrataManagementStatementExtractor({ buildingId, buildingName, fileUrl, documentId, onComplete }) {
  const [extractedData, setExtractedData] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const queryClient = useQueryClient();

  const extractMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('extractStrataManagementStatement', {
        file_url: fileUrl,
        building_id: buildingId,
        document_id: documentId
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setExtractedData(data.data);
        // Select all items by default
        setSelectedItems(data.data.management_items.map((_, index) => index));
        toast.success(`Extracted ${data.data.management_items.length} management items`);
      } else {
        toast.error('Failed to extract management statement: ' + data.error);
      }
    },
    onError: (error) => {
      toast.error('Extraction failed: ' + error.message);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const itemsToSave = selectedItems.map(index => ({
        ...extractedData.management_items[index],
        building_id: buildingId,
        document_id: documentId,
        status: 'active'
      }));

      await base44.entities.StrataManagementInfo.bulkCreate(itemsToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['strataManagementInfo', buildingId] });
      toast.success('Management information saved successfully');
      onComplete();
    },
    onError: (error) => {
      toast.error('Failed to save management information: ' + error.message);
    }
  });

  const toggleItem = (index) => {
    setSelectedItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  if (extractMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600 font-medium">Analyzing strata management statement...</p>
        <p className="text-sm text-slate-500 mt-2">This may take 30-60 seconds</p>
      </div>
    );
  }

  if (!extractedData) {
    return (
      <div className="space-y-4">
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Ready to extract management information</p>
            <p className="text-sm">
              The AI will analyze the strata management statement and extract:
            </p>
            <ul className="list-disc list-inside mt-2 text-sm space-y-1">
              <li>Committee structure and roles</li>
              <li>Meeting frequency and requirements</li>
              <li>Levy structures (admin fund, sinking fund)</li>
              <li>Insurance requirements</li>
              <li>Maintenance responsibilities</li>
              <li>Service contract details</li>
              <li>Financial reporting requirements</li>
              <li>Dispute resolution procedures</li>
              <li>Voting procedures and quorum</li>
              <li>Proxy rules and regulations</li>
              <li><strong>Schedule 1 & 2: All shared facilities with item numbers, descriptions, member benefits, and locations</strong></li>
            </ul>
          </AlertDescription>
        </Alert>

        <Button 
          onClick={() => extractMutation.mutate()} 
          className="w-full"
          size="lg"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Start AI Extraction
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <p className="font-medium text-green-900">
            Extracted {extractedData.management_items.length} management items from the document
          </p>
          {extractedData.summary && (
            <p className="text-sm text-green-800 mt-1">{extractedData.summary}</p>
          )}
        </AlertDescription>
      </Alert>

      <div className="max-h-96 overflow-y-auto space-y-3">
        {extractedData.management_items.map((item, index) => (
          <Card 
            key={index}
            className={`cursor-pointer transition-all ${
              selectedItems.includes(index) 
                ? 'border-blue-500 border-2 shadow-md' 
                : 'hover:border-slate-300'
            }`}
            onClick={() => toggleItem(index)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <FileCheck className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </div>
                <Badge className={infoTypeColors[item.info_type] || infoTypeColors.other}>
                  {infoTypeLabels[item.info_type] || 'Other'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-600">{item.description}</p>
              
              {item.info_type === 'shared_facility_schedule' && (
                <>
                  {item.item_number && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Item No.: </span>
                      <span className="text-slate-600">{item.item_number}</span>
                    </div>
                  )}
                  {item.shared_facility_name && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Facility: </span>
                      <span className="text-slate-600">{item.shared_facility_name}</span>
                    </div>
                  )}
                  {item.shared_facility_description && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Description: </span>
                      <span className="text-slate-600">{item.shared_facility_description}</span>
                    </div>
                  )}
                  {item.member_benefit && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Member Benefit: </span>
                      <span className="text-slate-600">{item.member_benefit}</span>
                    </div>
                  )}
                  {item.facility_location && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Location: </span>
                      <span className="text-slate-600">{item.facility_location}</span>
                    </div>
                  )}
                </>
              )}

              {item.info_type !== 'shared_facility_schedule' && (
                <>
                  {item.requirements && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Requirements: </span>
                      <span className="text-slate-600">{item.requirements}</span>
                    </div>
                  )}

                  {item.frequency && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Frequency: </span>
                      <span className="text-slate-600">{item.frequency}</span>
                    </div>
                  )}

                  {item.responsible_party && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Responsible Party: </span>
                      <span className="text-slate-600">{item.responsible_party}</span>
                    </div>
                  )}

                  {item.notes && (
                    <div className="text-sm">
                      <span className="font-medium text-slate-700">Notes: </span>
                      <span className="text-slate-600">{item.notes}</span>
                    </div>
                  )}
                </>
              )}

              {item.effective_date && (
                <div className="text-xs text-slate-500 pt-2 border-t">
                  Effective: {item.effective_date}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-slate-600">
          {selectedItems.length} of {extractedData.management_items.length} items selected
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectedItems([])}
            disabled={selectedItems.length === 0}
          >
            Deselect All
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={selectedItems.length === 0 || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save {selectedItems.length} Item{selectedItems.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}