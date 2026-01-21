import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, Eye, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function DocumentPermissionManager({ document }) {
  const [visibility, setVisibility] = useState(document.visibility || 'residents_only');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (newVisibility) => 
      base44.entities.Document.update(document.id, { visibility: newVisibility }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Permissions updated');
    }
  });

  const visibilityOptions = [
    { 
      value: 'public', 
      label: 'Public', 
      icon: Eye,
      description: 'Everyone can view this document',
      color: 'bg-blue-50 text-blue-700'
    },
    { 
      value: 'residents_only', 
      label: 'Residents Only', 
      icon: Users,
      description: 'All residents can view',
      color: 'bg-green-50 text-green-700'
    },
    { 
      value: 'owners_only', 
      label: 'Owners Only', 
      icon: Shield,
      description: 'Only property owners',
      color: 'bg-purple-50 text-purple-700'
    },
    { 
      value: 'staff_only', 
      label: 'Staff Only', 
      icon: Lock,
      description: 'Building management only',
      color: 'bg-red-50 text-red-700'
    }
  ];

  const currentOption = visibilityOptions.find(o => o.value === visibility);
  const Icon = currentOption?.icon || Eye;

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Document Permissions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Visibility Level</Label>
          <Select value={visibility} onValueChange={setVisibility}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {visibilityOptions.map(option => {
                const OptionIcon = option.icon;
                return (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <OptionIcon className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-slate-500">{option.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {currentOption && (
          <div className={`p-3 rounded-lg ${currentOption.color} border`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className="h-4 w-4" />
              <span className="font-medium text-sm">{currentOption.label}</span>
            </div>
            <p className="text-xs">{currentOption.description}</p>
          </div>
        )}

        {visibility !== document.visibility && (
          <Button 
            onClick={() => updateMutation.mutate(visibility)}
            className="w-full"
            disabled={updateMutation.isPending}
          >
            Save Changes
          </Button>
        )}
      </CardContent>
    </Card>
  );
}