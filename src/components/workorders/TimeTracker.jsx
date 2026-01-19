import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Play, Pause, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function TimeTracker({ workOrder, onSave }) {
  const [isTracking, setIsTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [manualHours, setManualHours] = useState('');

  const handleStart = () => {
    setIsTracking(true);
    setStartTime(Date.now());
  };

  const handleStop = () => {
    if (startTime) {
      const elapsed = Math.floor((Date.now() - startTime) / 60000);
      setTotalMinutes(prev => prev + elapsed);
      setIsTracking(false);
      setStartTime(null);
    }
  };

  const handleSave = () => {
    const hours = manualHours ? parseFloat(manualHours) : totalMinutes / 60;
    if (hours > 0) {
      onSave({ actual_hours: hours });
      toast.success(`${hours.toFixed(2)} hours logged`);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">Time Tracking</span>
          </div>
          {isTracking && <Badge className="bg-green-600 animate-pulse">Tracking...</Badge>}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            {!isTracking ? (
              <Button onClick={handleStart} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Start Timer
              </Button>
            ) : (
              <Button onClick={handleStop} variant="destructive" className="flex-1">
                <Pause className="h-4 w-4 mr-2" />
                Stop Timer
              </Button>
            )}
          </div>

          {totalMinutes > 0 && (
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-sm text-slate-600">Tracked Time</p>
              <p className="text-2xl font-bold text-blue-600">{(totalMinutes / 60).toFixed(2)} hrs</p>
            </div>
          )}

          <div>
            <Label>Or enter hours manually:</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.5"
                value={manualHours}
                onChange={(e) => setManualHours(e.target.value)}
                placeholder="e.g., 2.5"
              />
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}