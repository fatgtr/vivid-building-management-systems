import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, FileSpreadsheet, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function EnergyDataImporter({ buildingId, onImportComplete }) {
  const [showDialog, setShowDialog] = useState(false);
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setImporting(true);

    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extract data
      const extractResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            readings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  reading_date: { type: 'string' },
                  energy_type: { type: 'string' },
                  consumption_kwh: { type: 'number' },
                  cost: { type: 'number' },
                  meter_number: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (extractResult.status === 'success' && extractResult.output?.readings) {
        // Bulk create energy usage records
        const records = extractResult.output.readings.map(r => ({
          building_id: buildingId,
          reading_date: r.reading_date,
          energy_type: r.energy_type || 'electricity',
          consumption_kwh: r.consumption_kwh,
          cost: r.cost,
          meter_number: r.meter_number,
          reading_source: 'utility_bill'
        }));

        await base44.entities.EnergyUsage.bulkCreate(records);
        queryClient.invalidateQueries({ queryKey: ['energy-usage'] });
        toast.success(`Imported ${records.length} energy readings!`);
        setShowDialog(false);
        setFile(null);
        onImportComplete?.();
      } else {
        toast.error('Failed to extract data from file');
      }
    } catch (error) {
      toast.error(error.message || 'Import failed');
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setShowDialog(true)} variant="outline">
        <Upload className="h-4 w-4 mr-2" />
        Import Energy Data
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Energy Usage Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">Supported Formats:</p>
              <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                <li>CSV files with columns: reading_date, energy_type, consumption_kwh, cost</li>
                <li>Excel spreadsheets (.xlsx)</li>
                <li>Utility bills (PDF) - AI will extract data automatically</li>
              </ul>
            </div>

            <div>
              <Label>Upload File</Label>
              <Input
                type="file"
                accept=".csv,.xlsx,.pdf"
                onChange={(e) => setFile(e.target.files[0])}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleImport} disabled={!file || importing}>
              {importing ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</>
              ) : (
                <><FileSpreadsheet className="h-4 w-4 mr-2" /> Import Data</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}