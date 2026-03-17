import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ClipboardList, Plus, Pencil, Trash2, Copy, Globe, Building2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function InspectionChecklistManager({ buildingId, buildings }) {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', inspection_type: 'general', is_global: false, building_id: buildingId || '', items: [] });
  const [newItem, setNewItem] = useState({ section: '', description: '', required: true });

  const { data: checklists = [] } = useQuery({
    queryKey: ['inspectionChecklists', buildingId],
    queryFn: () => base44.entities.InspectionChecklist.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InspectionChecklist.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inspectionChecklists'] }); closeDialog(); toast.success('Checklist created!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InspectionChecklist.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inspectionChecklists'] }); closeDialog(); toast.success('Checklist updated!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InspectionChecklist.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inspectionChecklists'] }); toast.success('Checklist deleted!'); },
  });

  const closeDialog = () => {
    setShowDialog(false);
    setEditingChecklist(null);
    setForm({ name: '', description: '', inspection_type: 'general', is_global: false, building_id: buildingId || '', items: [] });
  };

  const handleEdit = (checklist) => {
    setEditingChecklist(checklist);
    setForm({ ...checklist });
    setShowDialog(true);
  };

  const handleClone = (checklist) => {
    setForm({ ...checklist, name: `${checklist.name} (Copy)`, id: undefined, is_global: false, building_id: buildingId || '' });
    setEditingChecklist(null);
    setShowDialog(true);
  };

  const addItem = () => {
    if (!newItem.description.trim()) return;
    setForm(prev => ({ ...prev, items: [...(prev.items || []), { ...newItem, id: Date.now().toString() }] }));
    setNewItem({ section: '', description: '', required: true });
  };

  const removeItem = (id) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingChecklist) updateMutation.mutate({ id: editingChecklist.id, data: form });
    else createMutation.mutate(form);
  };

  const buildingChecklists = checklists.filter(c => !c.is_global && (!buildingId || c.building_id === buildingId));
  const globalChecklists = checklists.filter(c => c.is_global);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Inspection Checklists</h3>
          <p className="text-sm text-slate-500">Manage checklists for conducting inspections</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Create New Checklist
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Building Checklists */}
        <div>
          <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Building Checklists ({buildingChecklists.length})
          </h4>
          <div className="space-y-3">
            {buildingChecklists.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-slate-400 text-sm">No building checklists yet</CardContent>
              </Card>
            )}
            {buildingChecklists.map(checklist => (
              <Card key={checklist.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{checklist.name}</p>
                      {checklist.description && <p className="text-xs text-slate-500 mt-0.5">{checklist.description}</p>}
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs capitalize">{checklist.inspection_type?.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline" className="text-xs">{checklist.items?.length || 0} items</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleClone(checklist)} title="Clone"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(checklist)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteMutation.mutate(checklist.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Global Checklists */}
        <div>
          <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Global Checklists ({globalChecklists.length})
          </h4>
          <div className="space-y-3">
            {globalChecklists.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-slate-400 text-sm">No global checklists yet</CardContent>
              </Card>
            )}
            {globalChecklists.map(checklist => (
              <Card key={checklist.id} className="shadow-sm border-blue-200 bg-blue-50/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{checklist.name}</p>
                      {checklist.description && <p className="text-xs text-slate-500 mt-0.5">{checklist.description}</p>}
                      <div className="flex gap-2 mt-2">
                        <Badge className="text-xs bg-blue-100 text-blue-700">Global</Badge>
                        <Badge variant="outline" className="text-xs capitalize">{checklist.inspection_type?.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline" className="text-xs">{checklist.items?.length || 0} items</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleClone(checklist)} title="Clone to building"><Copy className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(checklist)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => deleteMutation.mutate(checklist.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingChecklist ? 'Edit Checklist' : 'Create New Checklist'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Checklist Name *</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="e.g., Annual Building Inspection" className="mt-1" />
              </div>
              <div>
                <Label>Inspection Type</Label>
                <Select value={form.inspection_type} onValueChange={v => setForm({ ...form, inspection_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['general','fire_safety','electrical','plumbing','structural','elevator','pool','move_in','move_out','annual'].map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Building</Label>
                <Select value={form.building_id || ''} onValueChange={v => setForm({ ...form, building_id: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="All Buildings" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>All Buildings</SelectItem>
                    {(buildings || []).map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox id="is_global" checked={form.is_global} onCheckedChange={checked => setForm({ ...form, is_global: checked })} />
                <label htmlFor="is_global" className="text-sm font-medium cursor-pointer">Make this a Global Checklist (available as template for all buildings)</label>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-semibold mb-3 block">Checklist Items ({form.items?.length || 0})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                {(form.items || []).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      {item.section && <span className="text-xs text-blue-600 font-medium">{item.section} / </span>}
                      <span className="text-sm text-slate-700">{item.description}</span>
                      {item.required && <Badge className="ml-2 text-xs bg-red-100 text-red-700">Required</Badge>}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => removeItem(item.id)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1 grid grid-cols-3 gap-2">
                  <Input placeholder="Section (optional)" value={newItem.section} onChange={e => setNewItem({ ...newItem, section: e.target.value })} />
                  <Input placeholder="Item description *" value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="col-span-2" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs whitespace-nowrap">
                    <Checkbox checked={newItem.required} onCheckedChange={checked => setNewItem({ ...newItem, required: checked })} />
                    Required
                  </label>
                  <Button type="button" onClick={addItem} size="sm" className="bg-blue-600 hover:bg-blue-700">Add</Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingChecklist ? 'Update' : 'Create'} Checklist
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}