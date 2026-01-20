import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

export default function EfficiencyRecommendations({ recommendations = [], optimizationOpportunities = [] }) {
  if (recommendations.length === 0 && optimizationOpportunities.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
          <p className="text-slate-700 font-medium">Energy usage is optimized!</p>
          <p className="text-sm text-slate-500 mt-1">No major efficiency recommendations at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              AI-Powered Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="p-4 border border-slate-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">{rec.title}</h4>
                      <p className="text-sm text-slate-700">{rec.description}</p>
                    </div>
                    <Badge className={
                      rec.priority === 'high' ? 'bg-red-100 text-red-800' :
                      rec.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {rec.priority} priority
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="bg-green-50 p-2 rounded">
                      <p className="text-xs text-green-700 font-medium">Potential Savings</p>
                      <p className="text-lg font-bold text-green-900">
                        {rec.estimated_savings_percent}%
                      </p>
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="text-xs text-blue-700 font-medium">Difficulty</p>
                      <p className="text-sm font-semibold text-blue-900 capitalize">
                        {rec.implementation_difficulty}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Optimization Opportunities */}
      {optimizationOpportunities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-green-600" />
              Cost Optimization Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {optimizationOpportunities.map((opp, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-slate-900">{opp.opportunity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-700 font-medium">Potential Savings</p>
                    <p className="text-xl font-bold text-green-900">
                      ${opp.potential_savings?.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}