import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Wifi, 
  AlertTriangle, 
  Thermometer, 
  Shield, 
  Camera, 
  Radio,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const deviceTypes = [
  { value: 'smoke_detector', label: 'Smoke Detector', icon: AlertTriangle, color: 'text-red-600' },
  { value: 'thermostat', label: 'Smart Thermostat', icon: Thermometer, color: 'text-blue-600' },
  { value: 'access_control', label: 'Access Control', icon: Shield, color: 'text-purple-600' },
  { value: 'intercom', label: 'Intercom System', icon: Radio, color: 'text-green-600' },
  { value: 'cctv', label: 'CCTV Camera', icon: Camera, color: 'text-slate-600' },
];

export default function SmartDeviceManager({ buildingId }) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [formData, setFormData] = useState({
    device_type: 'smoke_detector',
    device_name: '',
    device_id: '',
    location: '',
    unit_id: '',
    system_vendor: '',
    auto_create_work_orders: true,
    alert_thresholds: ''
  });

  const queryClient = useQueryClient();

  const { data: devices = [] } = useQuery({
    queryKey: ['smartDevices', buildingId],
    queryFn: () => base44.entities.SmartDeviceIntegration.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const { data: units = [] } = useQuery({
    queryKey: ['units', buildingId],
    queryFn: () => base44.entities.Unit.filter({ building_id: buildingId }),
    enabled: !!buildingId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SmartDeviceIntegration.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartDevices'] });
      setShowDialog(false);
      resetForm();
      toast.success('Device added successfully');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SmartDeviceIntegration.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartDevices'] });
      setShowDialog(false);
      resetForm();
      toast.success('Device updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SmartDeviceIntegration.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smartDevices'] });
      toast.success('Device removed');
    },
  });

  const resetForm = () => {
    setFormData({
      device_type: 'smoke_detector',
      device_name: '',
      device_id: '',
      location: '',
      unit_id: '',
      system_vendor: '',
      auto_create_work_orders: true,
      alert_thresholds: ''
    });
    setEditingDevice(null);
  };

  const handleEdit = (device) => {
    setEditingDevice(device);
    setFormData({
      device_type: device.device_type,
      device_name: device.device_name,
      device_id: device.device_id,
      location: device.location || '',
      unit_id: device.unit_id || '',
      system_vendor: device.system_vendor || '',
      auto_create_work_orders: device.auto_create_work_orders,
      alert_thresholds: device.alert_thresholds ? JSON.stringify(device.alert_thresholds, null, 2) : ''
    });
    setShowDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      building_id: buildingId,
      alert_thresholds: formData.alert_thresholds ? JSON.parse(formData.alert_thresholds) : null,
      webhook_secret: editingDevice?.webhook_secret || Math.random().toString(36).substring(7)
    };

    if (editingDevice) {
      updateMutation.mutate({ id: editingDevice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getWebhookUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/functions/smartDeviceWebhook`;
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(getWebhookUrl());
    toast.success('Webhook URL copied');
  };

  const getDeviceIcon = (type) => {
    const device = deviceTypes.find(d => d.value === type);
    return device ? device.icon : Wifi;
  };

  const getDeviceColor = (type) => {
    const device = deviceTypes.find(d => d.value === type);
    return device ? device.color : 'text-slate-600';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Smart Building Integrations</h2>
          <p className="text-slate-600 text-sm mt-1">
            Connect IoT devices to automatically create work orders
          </p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Add Device
        </Button>
      </div>

      {/* Webhook Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Webhook Endpoint</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-slate-100 px-2 py-1 rounded flex-1">
                {getWebhookUrl()}
              </code>
              <Button size="sm" variant="outline" onClick={copyWebhookUrl}>
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-slate-600">
              Configure your smart devices to send events to this webhook URL
            </p>
          </div>
        </AlertDescription>
      </Alert>

      {/* Devices Grid */}
      {devices.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Wifi className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Devices Connected</h3>
            <p className="text-slate-600 mb-4">Add your first smart device integration</p>
            <Button onClick={() => setShowDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => {
            const DeviceIcon = getDeviceIcon(device.device_type);
            return (
              <Card key={device.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center ${getDeviceColor(device.device_type)}`}>
                      <DeviceIcon className="h-5 w-5" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(device)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => deleteMutation.mutate(device.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <h3 className="font-semibold text-slate-900 mb-1">{device.device_name}</h3>
                  <p className="text-xs text-slate-500 mb-2">{device.system_vendor || 'Smart Device'}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Location:</span>
                      <span className="font-medium">{device.location || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Device ID:</span>
                      <span className="font-mono text-xs">{device.device_id.substring(0, 12)}...</span>
                    </div>
                    {device.last_event_date && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Last Event:</span>
                        <span>{format(new Date(device.last_event_date), 'MMM d, h:mm a')}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <Badge className={device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}>
                      {device.status}
                    </Badge>
                    {device.auto_create_work_orders && (
                      <Badge variant="outline" className="text-xs">
                        Auto WO
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingDevice ? 'Edit Device' : 'Add Smart Device'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Device Type *</Label>
                <Select value={formData.device_type} onValueChange={(v) => setFormData({ ...formData, device_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deviceTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Device Name *</Label>
                <Input
                  value={formData.device_name}
                  onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                  placeholder="e.g., Lobby Smoke Detector"
                  required
                />
              </div>
              <div>
                <Label>Device ID *</Label>
                <Input
                  value={formData.device_id}
                  onChange={(e) => setFormData({ ...formData, device_id: e.target.value })}
                  placeholder="Unique device identifier"
                  required
                />
              </div>
              <div>
                <Label>System Vendor</Label>
                <Input
                  value={formData.system_vendor}
                  onChange={(e) => setFormData({ ...formData, system_vendor: e.target.value })}
                  placeholder="e.g., Inner Range, Nest"
                />
              </div>
              <div>
                <Label>Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Lobby, Floor 3"
                  required
                />
              </div>
              <div>
                <Label>Unit (Optional)</Label>
                <Select value={formData.unit_id} onValueChange={(v) => setFormData({ ...formData, unit_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No specific unit</SelectItem>
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id}>Unit {u.unit_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Alert Thresholds (JSON)</Label>
                <Textarea
                  value={formData.alert_thresholds}
                  onChange={(e) => setFormData({ ...formData, alert_thresholds: e.target.value })}
                  placeholder='{"max_temp": 28, "min_temp": 16}'
                  rows={3}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Optional: Define custom thresholds for alerts
                </p>
              </div>
              <div className="col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-Create Work Orders</Label>
                    <p className="text-xs text-slate-500">Automatically create work orders on alerts</p>
                  </div>
                  <Switch
                    checked={formData.auto_create_work_orders}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_create_work_orders: checked })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {editingDevice ? 'Update' : 'Add'} Device
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}