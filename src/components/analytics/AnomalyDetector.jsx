import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function AnomalyDetector({ anomalies = [] }) {
  const getSeverityIcon = (severity) => {
    if (severity.toLowerCase().includes('high') || severity.toLowerCase().includes('critical')) {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
    if (severity.toLowerCase().includes('medium')) {
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
    return <Info className="h-5 w-5 text-blue-600" />;
  };

  const getSeverityColor = (severity) => {
    if (severity.toLowerCase().includes('high') || severity.toLowerCase().includes('critical')) {
      return 'bg-red-100 text-red-800 border-red-300';
    }
    if (severity.toLowerCase().includes('medium')) {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    }
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Anomaly Detection
        </CardTitle>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 mx-auto mb-3 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-green-600" />
            </div>
            <p className="font-medium text-gray-900">No Anomalies Detected</p>
            <p className="text-sm text-gray-500 mt-1">All metrics are within expected ranges</p>
          </div>
        ) : (
          <div className="space-y-4">
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className={`p-4 rounded-lg border-2 ${getSeverityColor(anomaly.severity)}`}>
                <div className="flex items-start gap-3 mb-3">
                  {getSeverityIcon(anomaly.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{anomaly.type}</h4>
                      <Badge variant="outline" className={getSeverityColor(anomaly.severity)}>
                        {anomaly.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">{anomaly.description}</p>
                  </div>
                </div>
                
                {anomaly.action && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900">Recommended Action:</p>
                      <Button variant="outline" size="sm" className="text-xs">
                        Take Action
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{anomaly.action}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}