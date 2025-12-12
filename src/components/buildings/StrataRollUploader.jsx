import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function StrataRollUploader({ buildingId, onUnitsCreated, onSkip }) {
    const [open, setOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                toast.error('Please upload a PDF file');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleUploadAndExtract = async () => {
        if (!selectedFile) return;

        setUploading(true);
        try {
            // Upload the file
            const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
            
            setUploading(false);
            setProcessing(true);

            // Extract data from the PDF
            const response = await base44.functions.invoke('extractStrataRoll', { file_url });
            const result = response.data;

            if (result.success && result.data) {
                setExtractedData(result.data);
                toast.success(`Extracted ${result.data.units?.length || 0} units from Strata Roll`);
            } else {
                const errorMsg = result.error || 'Failed to extract data from PDF';
                toast.error(errorMsg);
                console.error('Strata Roll extraction error:', result);
            }
            } catch (error) {
            toast.error(`Failed to process Strata Roll: ${error.message}`);
            console.error('Strata Roll processing error:', error);
        } finally {
            setUploading(false);
            setProcessing(false);
        }
    };

    const handleCreateUnits = async () => {
        if (!extractedData || !buildingId) return;

        setProcessing(true);
        try {
            // Fetch all existing units for this building
            const existingUnits = await base44.entities.Unit.filter({ building_id: buildingId });
            
            let createdCount = 0;
            let updatedCount = 0;
            const processedUnits = [];

            for (const unit of extractedData.units) {
                const unitData = {
                    building_id: buildingId,
                    unit_number: unit.unit_number,
                    lot_number: unit.lot_number,
                    unit_entitlement: unit.unit_entitlement,
                    owner_name: unit.owner_name || '',
                    owner_email: unit.owner_email || '',
                    owner_address: unit.owner_address || ''
                };

                // Find existing unit by lot_number (or unit_number if lot_number doesn't match)
                const existingUnit = existingUnits.find(
                    u => u.lot_number === unit.lot_number || u.unit_number === unit.unit_number
                );

                let processedUnit;
                if (existingUnit) {
                    // Update existing unit
                    processedUnit = await base44.entities.Unit.update(existingUnit.id, unitData);
                    updatedCount++;
                } else {
                    // Create new unit with vacant status
                    processedUnit = await base44.entities.Unit.create({ ...unitData, status: 'vacant' });
                    createdCount++;
                }
                
                processedUnits.push({ ...processedUnit, ownerData: unit });
            }

            // Handle residents (owners)
            let residentsCreated = 0;
            let residentsUpdated = 0;

            for (const unit of processedUnits) {
                if (unit.ownerData.owner_name) {
                    // Check if owner resident already exists for this unit
                    const existingOwners = await base44.entities.Resident.filter({
                        unit_id: unit.id,
                        resident_type: 'owner'
                    });

                    const nameParts = unit.ownerData.owner_name.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';

                    const residentData = {
                        building_id: buildingId,
                        unit_id: unit.id,
                        first_name: firstName,
                        last_name: lastName,
                        email: unit.ownerData.owner_email || '',
                        resident_type: 'owner',
                        status: 'active',
                        investor_name: unit.ownerData.owner_name,
                        investor_email: unit.ownerData.owner_email || '',
                        investor_address: unit.ownerData.owner_address || ''
                    };

                    if (existingOwners.length > 0) {
                        // Update the first owner resident found
                        await base44.entities.Resident.update(existingOwners[0].id, residentData);
                        residentsUpdated++;
                    } else {
                        // Create new owner resident
                        await base44.entities.Resident.create(residentData);
                        residentsCreated++;
                    }
                }
            }

            // Update building's last strata roll upload date
            await base44.entities.Building.update(buildingId, {
                last_strata_roll_upload_date: new Date().toISOString().split('T')[0]
            });
            
            toast.success(
                `Units: ${createdCount} created, ${updatedCount} updated. Residents: ${residentsCreated} created, ${residentsUpdated} updated.`
            );
            setOpen(false);
            setExtractedData(null);
            setSelectedFile(null);
            
            if (onUnitsCreated) {
                onUnitsCreated();
            }
        } catch (error) {
            toast.error('Failed to process units and residents');
        } finally {
            setProcessing(false);
        }
    };

    const handleReset = () => {
        setExtractedData(null);
        setSelectedFile(null);
    };

    return (
        <>
            <Button
                onClick={() => setOpen(true)}
                variant="outline"
                className="gap-2"
            >
                <Upload className="h-4 w-4" />
                Upload Strata Roll
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Upload Strata Roll Document</DialogTitle>
                    </DialogHeader>

                    {onSkip && !extractedData && (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600">
                            You can skip this step and manually add units later, or upload a Strata Roll to auto-populate everything.
                        </div>
                    )}

                    {!extractedData ? (
                        <div className="space-y-4">
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center">
                                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                <p className="text-sm text-slate-600 mb-4">
                                    Upload a Strata Roll PDF to automatically extract unit and owner information
                                </p>
                                <Button variant="outline" asChild>
                                    <label className="cursor-pointer">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Select PDF File
                                        <input
                                            type="file"
                                            accept="application/pdf"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                        />
                                    </label>
                                </Button>
                                {selectedFile && (
                                    <p className="text-sm text-slate-700 mt-3 font-medium">
                                        Selected: {selectedFile.name}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                {selectedFile && (
                                    <Button 
                                        onClick={handleUploadAndExtract}
                                        disabled={uploading || processing}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    >
                                        {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                        {uploading ? 'Uploading...' : processing ? 'Extracting Data...' : 'Process Document'}
                                    </Button>
                                )}
                                {onSkip && (
                                    <Button 
                                        variant="outline"
                                        onClick={onSkip}
                                        disabled={uploading || processing}
                                        className={selectedFile ? 'flex-1' : 'w-full'}
                                    >
                                        Skip for Now
                                    </Button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <Card className="border-green-200 bg-green-50">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                        <div className="flex-1">
                                            <p className="font-medium text-green-900">Data Extracted Successfully</p>
                                            <p className="text-sm text-green-700 mt-1">
                                                Found {extractedData.units?.length || 0} units in the Strata Roll
                                            </p>
                                            {extractedData.building_address && (
                                                <p className="text-sm text-green-700">
                                                    Building: {extractedData.building_address}
                                                </p>
                                            )}
                                            {extractedData.strata_plan_number && (
                                                <p className="text-sm text-green-700">
                                                    Strata Plan: {extractedData.strata_plan_number}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="max-h-64 overflow-y-auto border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Lot</th>
                                            <th className="px-3 py-2 text-left">Unit</th>
                                            <th className="px-3 py-2 text-left">U/E</th>
                                            <th className="px-3 py-2 text-left">Owner</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {extractedData.units?.slice(0, 10).map((unit, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="px-3 py-2">{unit.lot_number}</td>
                                                <td className="px-3 py-2">{unit.unit_number}</td>
                                                <td className="px-3 py-2">{unit.unit_entitlement}</td>
                                                <td className="px-3 py-2 text-xs truncate max-w-[150px]">
                                                    {unit.owner_name}
                                                </td>
                                            </tr>
                                        ))}
                                        {extractedData.units?.length > 10 && (
                                            <tr className="border-t bg-slate-50">
                                                <td colSpan="4" className="px-3 py-2 text-center text-xs text-slate-500">
                                                    ... and {extractedData.units.length - 10} more units
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex gap-3">
                                <Button 
                                    variant="outline" 
                                    onClick={handleReset}
                                    disabled={processing}
                                    className="flex-1"
                                >
                                    Upload Different File
                                </Button>
                                <Button 
                                    onClick={handleCreateUnits}
                                    disabled={processing}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Create Units & Residents
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}