import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sparkles,
  TrendingUp,
  DollarSign
} from 'lucide-react';

export default function MaintenanceSchedulingSuggestions({ 
  workOrderData, 
  buildingId, 
  category,
  onApplySuggestion,
  isRecurring
}) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => {
    if (isRecurring && buildingId && category) {
      fetchSuggestions();
    }
  }, [isRecurring, buildingId, category]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('suggestMaintenanceSchedule', {
        workOrderData,
        buildingId,
        category
      });

      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to fetch suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = (date) => {
    if (onApplySuggestion) {
      onApplySuggestion({
        due_date: date,
        priority: suggestions.recommended_priority,
        estimated_duration: suggestions.estimated_duration_hours
      });
    }
  };

  const timeLabels = {
    early_morning: '6:00 AM - 8:00 AM',
    morning: '8:00 AM - 12:00 PM',
    afternoon: '12:00 PM - 5:00 PM',
    evening: '5:00 PM - 8:00 PM',
    after_hours: 'After 8:00 PM'
  };

  if (!isRecurring) {
    return null;
  }

  if (loading) {
    return (
      <Card className="border-2 border-blue-100">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-slate-600">Analyzing optimal scheduling...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) {
    return (
      <Card className="border-2 border-blue-100">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-600">
              AI scheduling suggestions will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Scheduling Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        {/* Primary Recommendation */}
        <Alert className="border-2 border-blue-300 bg-white">
          <Calendar className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <p className="font-semibold text-slate-900 mb-2">Recommended Schedule</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <span className="font-medium text-slate-700">
                      {new Date(suggestions.recommended_date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-700">
                      {timeLabels[suggestions.optimal_time] || suggestions.optimal_time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-700">
                      ~{suggestions.estimated_duration_hours}h duration
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${
                      suggestions.recommended_priority === 'urgent' ? 'bg-red-500' :
                      suggestions.recommended_priority === 'high' ? 'bg-orange-500' :
                      suggestions.recommended_priority === 'medium' ? 'bg-blue-500' :
                      'bg-slate-400'
                    } text-white capitalize`}>
                      {suggestions.recommended_priority} Priority
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-sm text-slate-600 leading-relaxed">
                  <strong>Why this time?</strong> {suggestions.reasoning}
                </p>
              </div>

              <Button
                type="button"
                onClick={() => handleApplySuggestion(suggestions.recommended_date)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Recommended Schedule
              </Button>
            </div>
          </AlertDescription>
        </Alert>

        {/* Risk Assessment */}
        {suggestions.risk_if_delayed && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <p className="font-semibold text-orange-900 mb-1">If Delayed:</p>
              <p className="text-sm text-orange-800">{suggestions.risk_if_delayed}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Alternative Dates */}
        {suggestions.alternative_dates && suggestions.alternative_dates.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Alternative Options:</p>
            <div className="space-y-2">
              {suggestions.alternative_dates.map((alt, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      {new Date(alt.date).toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-xs text-slate-600">{alt.reason}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplySuggestion(alt.date)}
                  >
                    Select
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost Optimization */}
        {suggestions.cost_optimization_tips && suggestions.cost_optimization_tips.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <DollarSign className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <p className="font-semibold text-green-900 mb-2">Cost Optimization Tips:</p>
              <ul className="space-y-1">
                {suggestions.cost_optimization_tips.map((tip, idx) => (
                  <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="pt-2 border-t border-blue-200">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchSuggestions}
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Regenerate Suggestions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}