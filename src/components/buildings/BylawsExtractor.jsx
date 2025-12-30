import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle, AlertCircle, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from "@/components/ui/alert";

const bylawTypeLabels = {
  pets: 'Pets',
  parking: 'Parking',
  noise: 'Noise',
  renovations: 'Renovations',
  rental: 'Rental',
  common_property: 'Common Property',
  balcony_outdoor: 'Balcony/Outdoor',
  waste_disposal: 'Waste Disposal',
  storage: 'Storage',
  conduct: 'Conduct',
  amenity_usage: 'Amenity Usage',
  other: 'Other'
};

const bylawTypeColors = {
  pets: 'bg-purple-100 text-purple-700',
  parking: 'bg-blue-100 text-blue-700',
  noise: 'bg-orange-100 text-orange-700',
  renovations: 'bg-yellow-100 text-yellow-700',
  rental: 'bg-green-100 text-green-700',
  common_property: 'bg-indigo-100 text-indigo-700',
  balcony_outdoor: 'bg-cyan-100 text-cyan-700',
  waste_disposal: 'bg-emerald-100 text-emerald-700',
  storage: 'bg-slate-100 text-slate-700',
  conduct: 'bg-red-100 text-red-700',
  amenity_usage: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-700'
};

export default function BylawsExtractor({ buildingId, buildingName, fileUrl, documentId, onComplete }) {
  const [extractedData, setExtractedData] = useState(null);
  const [selectedBylaws, setSelectedBylaws] = useState([]);
  const queryClient = useQueryClient();

  const extractMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('extractBylaws', {
        file_url: fileUrl,
        building_id: buildingId,
        document_id: documentId
      });
      return response.data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setExtractedData(data.data);
        // Select all bylaws by default
        setSelectedBylaws(data.data.bylaws.map((_, index) => index));
        toast.success(`Extracted ${data.data.bylaws.length} bylaws`);
      } else {
        toast.error('Failed to extract bylaws: ' + data.error);
      }
    },
    onError: (error) => {
      toast.error('Extraction failed: ' + error.message);
    }
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const bylawsToSave = selectedBylaws.map(index => ({
        ...extractedData.bylaws[index],
        building_id: buildingId,
        document_id: documentId,
        status: 'active'
      }));

      await base44.entities.BuildingBylaw.bulkCreate(bylawsToSave);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildingBylaws', buildingId] });
      toast.success('Bylaws saved successfully');
      onComplete();
    },
    onError: (error) => {
      toast.error('Failed to save bylaws: ' + error.message);
    }
  });

  const toggleBylaw = (index) => {
    setSelectedBylaws(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  if (extractMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600 font-medium">Analyzing bylaws document...</p>
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
            <p className="font-medium mb-2">Ready to analyze complete bylaws</p>
            <p className="text-sm text-slate-600 mb-2">
              The AI will read and process the entire bylaws document including all sections, clauses, and amendments throughout the complete document to extract:
            </p>
            <p className="text-sm text-slate-500 italic">
              Pet policies, parking rules, noise restrictions, renovation guidelines, rental regulations, common property usage, balcony/outdoor guidelines, waste disposal, conduct rules, penalty provisions, amendment history, effective dates, and all other bylaws.
            </p>
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
            Extracted {extractedData.bylaws.length} bylaws from the document
          </p>
          {extractedData.summary && (
            <p className="text-sm text-green-800 mt-1">{extractedData.summary}</p>
          )}
        </AlertDescription>
      </Alert>

      <div className="max-h-96 overflow-y-auto space-y-3">
        {extractedData.bylaws.map((bylaw, index) => (
          <Card 
            key={index}
            className={`cursor-pointer transition-all ${
              selectedBylaws.includes(index) 
                ? 'border-blue-500 border-2 shadow-md' 
                : 'hover:border-slate-300'
            }`}
            onClick={() => toggleBylaw(index)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Scale className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <CardTitle className="text-base">{bylaw.title}</CardTitle>
                </div>
                <Badge className={bylawTypeColors[bylaw.bylaw_type] || bylawTypeColors.other}>
                  {bylawTypeLabels[bylaw.bylaw_type] || 'Other'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-slate-600">{bylaw.description}</p>
              
              {bylaw.restrictions && (
                <div className="text-sm">
                  <span className="font-medium text-slate-700">Restrictions: </span>
                  <span className="text-slate-600">{bylaw.restrictions}</span>
                </div>
              )}

              {bylaw.penalties && (
                <div className="text-sm">
                  <span className="font-medium text-slate-700">Penalties: </span>
                  <span className="text-slate-600">{bylaw.penalties}</span>
                </div>
              )}

              {(bylaw.effective_date || bylaw.amended_date) && (
                <div className="flex gap-4 text-xs text-slate-500 pt-2 border-t">
                  {bylaw.effective_date && (
                    <span>Effective: {bylaw.effective_date}</span>
                  )}
                  {bylaw.amended_date && (
                    <span>Amended: {bylaw.amended_date}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between pt-4 border-t">
        <p className="text-sm text-slate-600">
          {selectedBylaws.length} of {extractedData.bylaws.length} bylaws selected
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSelectedBylaws([])}
            disabled={selectedBylaws.length === 0}
          >
            Deselect All
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={selectedBylaws.length === 0 || saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save {selectedBylaws.length} Bylaw{selectedBylaws.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}