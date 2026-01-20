import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompare, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function PolicyVersionComparison({ version1, version2 }) {
  const changes = [];

  // Compare title
  if (version1.title !== version2.title) {
    changes.push({
      field: 'Title',
      old: version2.title,
      new: version1.title
    });
  }

  // Compare content
  if (version1.content !== version2.content) {
    changes.push({
      field: 'Content',
      old: version2.content,
      new: version1.content,
      isLongText: true
    });
  }

  // Compare key points
  const oldPoints = version2.key_points || [];
  const newPoints = version1.key_points || [];
  if (JSON.stringify(oldPoints) !== JSON.stringify(newPoints)) {
    changes.push({
      field: 'Key Points',
      old: oldPoints.join(', '),
      new: newPoints.join(', ')
    });
  }

  // Compare applies_to
  if (version1.applies_to !== version2.applies_to) {
    changes.push({
      field: 'Applies To',
      old: version2.applies_to,
      new: version1.applies_to
    });
  }

  // Compare effective_date
  if (version1.effective_date !== version2.effective_date) {
    changes.push({
      field: 'Effective Date',
      old: version2.effective_date || 'Not set',
      new: version1.effective_date || 'Not set'
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">Version {version2.version || 1}</p>
          <p className="text-xs text-slate-600">{format(new Date(version2.created_date), 'PPp')}</p>
        </div>
        <GitCompare className="h-5 w-5 text-slate-400" />
        <div className="flex-1 text-right">
          <p className="text-sm font-medium text-slate-500">Version {version1.version || 1}</p>
          <p className="text-xs text-slate-600">{format(new Date(version1.created_date), 'PPp')}</p>
        </div>
      </div>

      {changes.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="p-6 text-center text-slate-500">
            No differences found between these versions
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {changes.map((change, idx) => (
            <Card key={idx}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {change.field}
                  <Badge variant="outline" className="text-xs">Changed</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-red-600 mb-2">Previous</p>
                    <div className={`p-3 rounded-lg bg-red-50 border border-red-200 ${change.isLongText ? 'max-h-64 overflow-y-auto' : ''}`}>
                      <p className={`text-sm text-slate-700 ${change.isLongText ? 'whitespace-pre-wrap' : ''}`}>
                        {change.old}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-green-600 mb-2">Current</p>
                    <div className={`p-3 rounded-lg bg-green-50 border border-green-200 ${change.isLongText ? 'max-h-64 overflow-y-auto' : ''}`}>
                      <p className={`text-sm text-slate-700 ${change.isLongText ? 'whitespace-pre-wrap' : ''}`}>
                        {change.new}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}