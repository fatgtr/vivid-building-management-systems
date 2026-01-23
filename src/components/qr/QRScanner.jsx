import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Camera } from 'lucide-react';
import { toast } from 'sonner';

export default function QRScanner({ onScan, buttonText = "Scan QR Code" }) {
  const [showDialog, setShowDialog] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const handleManualSubmit = () => {
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setShowDialog(false);
      setManualInput('');
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <QrCode className="h-4 w-4" />
        {buttonText}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan or Enter Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-8 bg-slate-100 rounded-lg text-center">
              <Camera className="h-16 w-16 text-slate-400 mx-auto mb-3" />
              <p className="text-sm text-slate-600">Camera scanning coming soon</p>
            </div>
            <div>
              <Label>Or enter code manually:</Label>
              <div className="flex gap-2">
                <Input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Enter asset ID or code"
                />
                <Button onClick={handleManualSubmit}>Submit</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}