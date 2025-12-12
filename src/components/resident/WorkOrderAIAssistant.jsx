import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, 
  Send, 
  Lightbulb, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
  ArrowRight
} from 'lucide-react';

export default function WorkOrderAIAssistant({ onComplete }) {
  const [step, setStep] = useState('initial'); // initial, analyzing, clarifying, troubleshooting, complete
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [clarifyingAnswer, setClarifyingAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const handleInitialSubmit = async () => {
    if (!description.trim()) return;

    setLoading(true);
    try {
      const result = await base44.functions.invoke('analyzeWorkOrderIssue', {
        description,
        conversationHistory: []
      });

      setAnalysis(result.data);
      setConversationHistory([
        { role: 'user', content: description },
        { role: 'assistant', content: result.data.assistant_message }
      ]);

      if (result.data.is_emergency) {
        setStep('complete');
      } else if (result.data.clarifying_questions.length > 0) {
        setStep('clarifying');
      } else if (result.data.troubleshooting_steps.length > 0) {
        setStep('troubleshooting');
      } else {
        setStep('complete');
      }
    } catch (error) {
      console.error('Error analyzing issue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClarifyingAnswer = async () => {
    if (!clarifyingAnswer.trim()) return;

    setLoading(true);
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: clarifyingAnswer }
    ];
    setConversationHistory(updatedHistory);

    try {
      // Re-analyze with additional context
      const result = await base44.functions.invoke('analyzeWorkOrderIssue', {
        description: `${description}\n\nAdditional details: ${clarifyingAnswer}`,
        conversationHistory: updatedHistory
      });

      setAnalysis(result.data);
      setConversationHistory([
        ...updatedHistory,
        { role: 'assistant', content: result.data.assistant_message }
      ]);
      
      // Move to next question or troubleshooting
      if (currentQuestionIndex < result.data.clarifying_questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setClarifyingAnswer('');
      } else if (result.data.troubleshooting_steps.length > 0 && result.data.priority !== 'urgent') {
        setStep('troubleshooting');
      } else {
        setStep('complete');
      }
    } catch (error) {
      console.error('Error processing answer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipTroubleshooting = () => {
    setStep('complete');
  };

  const handleComplete = () => {
    const fullDescription = conversationHistory
      .filter(msg => msg.role === 'user')
      .map(msg => msg.content)
      .join('\n\n');

    onComplete({
      title: description.substring(0, 100),
      description: fullDescription,
      category: analysis.category,
      priority: analysis.priority,
      analysis: analysis
    });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'text-slate-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600'
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="space-y-4">
      {/* Initial Description */}
      {step === 'initial' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Describe Your Issue
            </CardTitle>
            <p className="text-sm text-slate-500">
              Our AI assistant will help you categorize and prioritize your maintenance request
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="description">What's the problem? *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., Water is leaking from under the kitchen sink..."
                rows={4}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={handleInitialSubmit} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!description.trim() || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Analyze Issue
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results */}
      {analysis && (step === 'clarifying' || step === 'troubleshooting' || step === 'complete') && (
        <Alert className="bg-blue-50 border-blue-200">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium text-blue-900">{analysis.assistant_message}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="capitalize">
                  {analysis.category.replace(/_/g, ' ')}
                </Badge>
                <Badge className={getPriorityColor(analysis.priority)}>
                  {analysis.priority} priority
                </Badge>
              </div>
              <p className="text-sm text-blue-800 mt-2">{analysis.priority_explanation}</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Clarifying Questions */}
      {step === 'clarifying' && analysis?.clarifying_questions[currentQuestionIndex] && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Additional Details
            </CardTitle>
            <p className="text-sm text-slate-500">
              Question {currentQuestionIndex + 1} of {analysis.clarifying_questions.length}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>{analysis.clarifying_questions[currentQuestionIndex]}</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  value={clarifyingAnswer}
                  onChange={(e) => setClarifyingAnswer(e.target.value)}
                  placeholder="Your answer..."
                  onKeyPress={(e) => e.key === 'Enter' && handleClarifyingAnswer()}
                />
                <Button 
                  onClick={handleClarifyingAnswer}
                  disabled={!clarifyingAnswer.trim() || loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setStep('troubleshooting')}
              className="w-full"
            >
              Skip Questions
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Troubleshooting Steps */}
      {step === 'troubleshooting' && analysis?.troubleshooting_steps?.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Try These Quick Fixes First
            </CardTitle>
            <p className="text-sm text-yellow-700">
              These simple steps might resolve your issue without needing a technician
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-2">
              {analysis.troubleshooting_steps.map((step, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-600 text-white text-sm flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className="text-sm text-slate-700 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            <div className="flex gap-2">
              <Button 
                onClick={handleSkipTroubleshooting}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Still Need Help - Submit Request
              </Button>
              <Button 
                variant="outline"
                onClick={() => onComplete(null)}
                className="flex-1"
              >
                Issue Resolved
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete */}
      {step === 'complete' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-green-900 mb-1">Analysis Complete</h3>
                <p className="text-sm text-green-800">
                  {analysis?.is_emergency 
                    ? 'This appears to be an emergency. Please submit immediately.' 
                    : 'Your request is ready to submit with the suggested category and priority.'}
                </p>
              </div>
            </div>
            <Button 
              onClick={handleComplete}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Continue to Full Form
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}