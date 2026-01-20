import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  History, 
  CheckCircle, 
  GitCompare, 
  RotateCcw,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';

export default function PolicyVersionHistory({ policy, onCompare, onRevert }) {
  const parentId = policy.parent_policy_id || policy.id;

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['policyVersions', parentId],
    queryFn: async () => {
      const allVersions = await base44.entities.Policy.filter({});
      return allVersions
        .filter(p => 
          p.id === parentId || p.parent_policy_id === parentId
        )
        .sort((a, b) => (b.version || 1) - (a.version || 1));
    }
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Loading version history...</div>;
  }

  if (versions.length <= 1) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-4 text-center text-sm text-slate-500">
          <History className="h-8 w-8 mx-auto mb-2 text-slate-300" />
          No previous versions
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold flex items-center gap-2 text-sm">
        <History className="h-4 w-4" />
        Version History ({versions.length})
      </h4>
      
      <div className="space-y-2">
        {versions.map((version, idx) => {
          const isLatest = idx === 0;
          const isCurrent = version.is_current_version;
          
          return (
            <Card key={version.id} className={isCurrent ? 'border-green-300 bg-green-50' : ''}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">Version {version.version || 1}</span>
                      {isCurrent && (
                        <Badge className="bg-green-600 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      )}
                      {isLatest && !isCurrent && (
                        <Badge variant="outline">Latest</Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-slate-600 mb-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {format(new Date(version.created_date), 'PPp')}
                    </p>
                    
                    {version.version_notes && (
                      <p className="text-xs text-slate-700 mt-2">
                        {version.version_notes}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex gap-1">
                    {idx < versions.length - 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCompare(version, versions[idx + 1])}
                        title="Compare with previous version"
                      >
                        <GitCompare className="h-3 w-3" />
                      </Button>
                    )}
                    
                    {!isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRevert(version)}
                        title="Revert to this version"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}