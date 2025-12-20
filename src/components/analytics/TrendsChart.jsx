import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export default function TrendsChart({ trends = [] }) {
  const getTrendIcon = (trend) => {
    if (trend.toLowerCase().includes('up') || trend.toLowerCase().includes('increase')) {
      return <TrendingUp className="h-5 w-5 text-green-600" />;
    }
    if (trend.toLowerCase().includes('down') || trend.toLowerCase().includes('decrease')) {
      return <TrendingDown className="h-5 w-5 text-red-600" />;
    }
    return <ArrowRight className="h-5 w-5 text-gray-400" />;
  };

  const getTrendColor = (trend) => {
    if (trend.toLowerCase().includes('up') || trend.toLowerCase().includes('increase')) {
      return 'text-green-600 bg-green-50 border-green-200';
    }
    if (trend.toLowerCase().includes('down') || trend.toLowerCase().includes('decrease')) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Trend Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {trends.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No trend data available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trends.map((item, idx) => (
              <div key={idx} className={`p-4 rounded-lg border ${getTrendColor(item.trend)}`}>
                <div className="flex items-start gap-3">
                  {getTrendIcon(item.trend)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{item.metric}</h4>
                      <Badge variant="outline" className="text-xs">
                        {item.change}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mb-2">{item.trend}</p>
                    <p className="text-sm text-gray-600">{item.insight}</p>
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