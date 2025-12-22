import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Square, MapPin, Trash2, Save, ZoomIn, ZoomOut, MousePointer } from 'lucide-react';
import { toast } from 'sonner';

export default function PlanMarkupTool({ pdfUrl, locations, onSaveCoordinates }) {
  const [drawMode, setDrawMode] = useState(null); // 'boundary' or 'point'
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [markups, setMarkups] = useState({});
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBoundary, setCurrentBoundary] = useState(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // Initialize markups from existing location coordinates
    const initialMarkups = {};
    locations.forEach(loc => {
      if (loc.coordinates) {
        try {
          initialMarkups[loc.name] = JSON.parse(loc.coordinates);
        } catch (e) {
          console.error('Failed to parse coordinates for', loc.name);
        }
      }
    });
    setMarkups(initialMarkups);
  }, [locations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = containerRef.current;
    
    // Set canvas size to match container
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all existing markups
    Object.entries(markups).forEach(([locationName, data]) => {
      if (data.type === 'boundary') {
        ctx.strokeStyle = data.color || '#3b82f6';
        ctx.lineWidth = 2;
        ctx.strokeRect(data.x, data.y, data.width, data.height);
        ctx.fillStyle = data.color || '#3b82f6';
        ctx.globalAlpha = 0.2;
        ctx.fillRect(data.x, data.y, data.width, data.height);
        ctx.globalAlpha = 1;
        
        // Label
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px sans-serif';
        ctx.fillText(locationName, data.x + 5, data.y + 15);
      } else if (data.type === 'point') {
        ctx.fillStyle = data.color || '#3b82f6';
        ctx.beginPath();
        ctx.arc(data.x, data.y, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Label
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px sans-serif';
        ctx.fillText(locationName, data.x + 10, data.y - 5);
      }
    });

    // Draw current boundary being drawn
    if (currentBoundary) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        currentBoundary.startX,
        currentBoundary.startY,
        currentBoundary.width,
        currentBoundary.height
      );
      ctx.setLineDash([]);
    }
  }, [markups, currentBoundary]);

  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  };

  const handleMouseDown = (e) => {
    if (!drawMode || !selectedLocation) return;

    const pos = getMousePos(e);

    if (drawMode === 'boundary') {
      setIsDrawing(true);
      setCurrentBoundary({
        startX: pos.x,
        startY: pos.y,
        width: 0,
        height: 0,
      });
    } else if (drawMode === 'point') {
      const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
      const newMarkups = {
        ...markups,
        [selectedLocation]: {
          type: 'point',
          x: pos.x,
          y: pos.y,
          color,
        },
      };
      setMarkups(newMarkups);
      toast.success(`Point marked for ${selectedLocation}`);
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentBoundary) return;

    const pos = getMousePos(e);
    setCurrentBoundary({
      ...currentBoundary,
      width: pos.x - currentBoundary.startX,
      height: pos.y - currentBoundary.startY,
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBoundary || !selectedLocation) return;

    const color = `#${Math.floor(Math.random()*16777215).toString(16)}`;
    const newMarkups = {
      ...markups,
      [selectedLocation]: {
        type: 'boundary',
        x: currentBoundary.startX,
        y: currentBoundary.startY,
        width: currentBoundary.width,
        height: currentBoundary.height,
        color,
      },
    };
    setMarkups(newMarkups);
    setIsDrawing(false);
    setCurrentBoundary(null);
    toast.success(`Boundary marked for ${selectedLocation}`);
  };

  const handleClearMarkup = () => {
    if (!selectedLocation) return;
    const newMarkups = { ...markups };
    delete newMarkups[selectedLocation];
    setMarkups(newMarkups);
    toast.success('Markup cleared');
  };

  const handleSaveAll = () => {
    const updates = locations.map(location => ({
      id: location.id,
      coordinates: markups[location.name] ? JSON.stringify(markups[location.name]) : null,
    }));
    onSaveCoordinates(updates);
  };

  const unmarkedLocations = locations.filter(loc => !markups[loc.name]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={selectedLocation || ''} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select location to mark" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.name} value={loc.name}>
                  {loc.name} {markups[loc.name] && '✓'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={drawMode === 'boundary' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDrawMode(drawMode === 'boundary' ? null : 'boundary')}
            disabled={!selectedLocation}
          >
            <Square className="h-4 w-4 mr-2" />
            Boundary
          </Button>

          <Button
            variant={drawMode === 'point' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDrawMode(drawMode === 'point' ? null : 'point')}
            disabled={!selectedLocation}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Point
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearMarkup}
            disabled={!selectedLocation || !markups[selectedLocation]}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-slate-600 min-w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(2, zoom + 0.1))}>
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button onClick={handleSaveAll} className="bg-green-600 hover:bg-green-700">
            <Save className="h-4 w-4 mr-2" />
            Save All Markups
          </Button>
        </div>
      </div>

      {unmarkedLocations.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            {unmarkedLocations.length} location{unmarkedLocations.length !== 1 ? 's' : ''} not marked yet: {unmarkedLocations.map(l => l.name).join(', ')}
          </p>
        </div>
      )}

      <div 
        ref={containerRef}
        className="relative border rounded-lg overflow-hidden bg-slate-100"
        style={{ height: '600px' }}
      >
        <iframe
          src={pdfUrl}
          className="absolute inset-0 w-full h-full"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium mb-2">Legend</h4>
          <div className="space-y-1">
            {Object.entries(markups).map(([name, data]) => (
              <div key={name} className="flex items-center gap-2 text-xs">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: data.color, opacity: 0.6 }}
                />
                <span>{name}</span>
                <Badge variant="outline" className="text-xs">
                  {data.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-2">Instructions</h4>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>1. Select a location from the dropdown</li>
            <li>2. Choose boundary (drag to draw) or point (click)</li>
            <li>3. Mark the location on the plan</li>
            <li>4. Repeat for all locations</li>
            <li>5. Click "Save All Markups" when done</li>
          </ul>
        </div>
      </div>
    </div>
  );
}