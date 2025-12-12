import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function FaultReportingWizard({ onProceedToReport }) {
  const [selectedType, setSelectedType] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [responsibility, setResponsibility] = useState(null);

  const { data: guideData = [] } = useQuery({
    queryKey: ['responsibilityGuide'],
    queryFn: () => base44.entities.ResponsibilityGuide.list(),
  });

  // Get unique types
  const types = [...new Set(guideData.map(item => item.type))].sort();

  // Get items for selected type
  const items = guideData
    .filter(item => item.type === selectedType)
    .sort((a, b) => a.item.localeCompare(b.item));

  const handleTypeChange = (type) => {
    setSelectedType(type);
    setSelectedItem('');
    setResponsibility(null);
  };

  const handleItemChange = (itemName) => {
    setSelectedItem(itemName);
    const guide = guideData.find(g => g.type === selectedType && g.item === itemName);
    setResponsibility(guide);
  };

  const getResponsibilityColor = (resp) => {
    if (resp === 'Owner') return 'bg-blue-50 border-blue-200';
    if (resp === 'Owners Corporation') return 'bg-green-50 border-green-200';
    return 'bg-yellow-50 border-yellow-200';
  };

  const getResponsibilityIcon = (resp) => {
    if (resp === 'Owner') return <AlertCircle className="h-5 w-5 text-blue-600" />;
    if (resp === 'Owners Corporation') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    return <Info className="h-5 w-5 text-yellow-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report a Fault - Check Responsibility</CardTitle>
        <p className="text-sm text-slate-500">
          First, let's determine who is responsible for fixing this issue
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Type Selection */}
        <div>
          <Label htmlFor="fault-type">What type of issue is it?</Label>
          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger id="fault-type">
              <SelectValue placeholder="Select issue type" />
            </SelectTrigger>
            <SelectContent>
              {types.map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Item Selection */}
        {selectedType && (
          <div>
            <Label htmlFor="fault-item">What specifically needs repair?</Label>
            <Select value={selectedItem} onValueChange={handleItemChange}>
              <SelectTrigger id="fault-item">
                <SelectValue placeholder="Select specific item" />
              </SelectTrigger>
              <SelectContent>
                {items.map(item => (
                  <SelectItem key={item.id} value={item.item}>
                    {item.item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Responsibility Result */}
        {responsibility && (
          <Alert className={`${getResponsibilityColor(responsibility.responsible)} border`}>
            <div className="flex items-start gap-3">
              {getResponsibilityIcon(responsibility.responsible)}
              <div className="flex-1">
                <AlertDescription>
                  <p className="font-semibold text-slate-900 mb-2">
                    Responsible Party: {responsibility.responsible}
                  </p>
                  
                  {responsibility.responsible === 'Owner' && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-700">
                        This is your responsibility as the resident/owner. You will need to arrange and pay for repairs yourself.
                      </p>
                      <p className="text-xs text-slate-600 mt-2">
                        We recommend contacting a licensed tradesperson to fix this issue.
                      </p>
                    </div>
                  )}

                  {responsibility.responsible === 'Owners Corporation' && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-700">
                        This is the building management's responsibility. You can submit a work order request.
                      </p>
                      <Button 
                        onClick={() => onProceedToReport({ 
                          type: selectedType, 
                          item: selectedItem 
                        })}
                        className="mt-3 bg-green-600 hover:bg-green-700"
                      >
                        Proceed to Submit Work Order
                      </Button>
                    </div>
                  )}

                  {responsibility.responsible === 'Owner/Owners Corporation' && (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-700">
                        Responsibility depends on specific circumstances. Common factors include:
                      </p>
                      <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
                        <li>Location of the issue (inside lot vs common property)</li>
                        <li>Whether it services only your unit or multiple units</li>
                        <li>When the strata plan was registered</li>
                        <li>Specific by-laws in your building</li>
                      </ul>
                      {responsibility.additional_info && (
                        <p className="text-xs text-slate-600 italic mt-2">
                          Note: {responsibility.additional_info}
                        </p>
                      )}
                      <Button 
                        onClick={() => onProceedToReport({ 
                          type: selectedType, 
                          item: selectedItem,
                          requiresAssessment: true
                        })}
                        className="mt-3 bg-yellow-600 hover:bg-yellow-700"
                      >
                        Submit Request for Assessment
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}

        {!responsibility && selectedType && (
          <p className="text-sm text-slate-500 text-center py-4">
            Select a specific item to see who is responsible
          </p>
        )}
      </CardContent>
    </Card>
  );
}