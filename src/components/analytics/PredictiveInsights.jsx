import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';

export default function PredictiveInsights({ predictions = [] }) {
  const getConfidenceBadge = (confidence) => {
    if (confidence.includes('high') || confidence.includes('High')) {
      return <Badge className="bg-green-600 text-white">High Confidence</Badge>;
    }
    if (confidence.includes('medium') || confidence.includes('Medium')) {
      return <Badge className="bg-yellow-600 text-white">Medium Confidence</Badge>;
    }
    return <Badge className="bg-gray-600 text-white">Low Confidence</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Predictive Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {predictions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Sparkles className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No predictions available yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {predictions.map((prediction, idx) => (
              <div key={idx} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold text-gray-900">Forecast</h4>
                  </div>
                  {getConfidenceBadge(prediction.confidence)}
                </div>
                
                <p className="text-gray-700 mb-3">{prediction.forecast}</p>
                
                <div className="p-3 bg-white rounded border border-purple-100">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 mb-1">Recommendation</p>
                      <p className="text-sm text-gray-600">{prediction.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}