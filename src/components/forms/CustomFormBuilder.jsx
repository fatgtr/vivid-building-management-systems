import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical } from 'lucide-react';

export default function CustomFormBuilder({ onSave, initialFields = [] }) {
  const [fields, setFields] = useState(initialFields.length > 0 ? initialFields : [
    { id: '1', type: 'text', label: 'Field 1', required: false }
  ]);

  const addField = (type) => {
    setFields([...fields, {
      id: Date.now().toString(),
      type,
      label: `New ${type} field`,
      required: false,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
    }]);
  };

  const updateField = (id, updates) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const handleSave = () => {
    onSave(fields);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Form Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field, idx) => (
            <Card key={field.id} className="border-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-slate-400 mt-2 cursor-move" />
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Field Type</Label>
                        <Select value={field.type} onValueChange={(v) => updateField(field.id, { type: v })}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="textarea">Long Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                            <SelectItem value="date">Date</SelectItem>
                            <SelectItem value="select">Dropdown</SelectItem>
                            <SelectItem value="checkbox">Checkbox</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(v) => updateField(field.id, { required: v })}
                      />
                      <Label className="text-xs">Required</Label>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeField(field.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => addField('text')}>
              <Plus className="h-3 w-3 mr-1" /> Text Field
            </Button>
            <Button variant="outline" size="sm" onClick={() => addField('textarea')}>
              <Plus className="h-3 w-3 mr-1" /> Long Text
            </Button>
            <Button variant="outline" size="sm" onClick={() => addField('number')}>
              <Plus className="h-3 w-3 mr-1" /> Number
            </Button>
            <Button variant="outline" size="sm" onClick={() => addField('date')}>
              <Plus className="h-3 w-3 mr-1" /> Date
            </Button>
            <Button variant="outline" size="sm" onClick={() => addField('select')}>
              <Plus className="h-3 w-3 mr-1" /> Dropdown
            </Button>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        Save Form Template
      </Button>
    </div>
  );
}