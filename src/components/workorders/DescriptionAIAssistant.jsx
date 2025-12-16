import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function DescriptionAIAssistant({ 
  title, 
  category, 
  selectedPhotos = [], 
  selectedVideos = [],
  currentDescription,
  onDescriptionGenerated,
  onTitleGenerated,
  onPriorityGenerated,
  generateTitle = false,
  suggestPriority = false
}) {
  const [generating, setGenerating] = useState(false);
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [generatedPriority, setGeneratedPriority] = useState('');
  const [priorityReason, setPriorityReason] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!generateTitle && !title && !currentDescription) {
      toast.error('Please enter a title or description first');
      return;
    }

    if (generateTitle && !category) {
      toast.error('Please select a category first');
      return;
    }

    setGenerating(true);
    try {
      const photoUrls = [];
      if (selectedPhotos.length > 0) {
        for (const photo of selectedPhotos.slice(0, 5)) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
          photoUrls.push(file_url);
        }
      }

      let prompt = '';
      let json_schema = {};

      if (generateTitle) {
        prompt = `You are assisting a building manager in creating a professional work order.
The current inputs are:
Category: ${category}
${currentDescription ? `Initial description provided by user: ${currentDescription}` : ''}
${title ? `Current title provided by user: ${title}` : ''}

Your task is to generate:
1. A concise, professional title (max 60 characters) for the work order that clearly identifies the issue.
2. A detailed professional description that:
   - Describes the issue or work needed in detail.
   - Includes relevant context for contractors.
   - Is suitable for property management records.
   - Uses professional language.
${suggestPriority ? `3. Suggest a priority level (low, medium, high, urgent) for the work order.
4. Provide a brief reason for the priority recommendation.` : ''}

${photoUrls.length > 0 ? 'Analyze the provided photos to add specific visual details and assess severity to the description and priority.' : ''}`;
        
        json_schema = {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            ...(suggestPriority && {
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
              priority_reason: { type: "string" }
            })
          },
          required: ["title", "description", ...(suggestPriority ? ["priority", "priority_reason"] : [])]
        };

      } else if (suggestPriority) {
        prompt = `You are assisting a building manager in prioritizing a work order.
The current work order details are:
Title: ${title}
Category: ${category}
Description: ${currentDescription || 'No description provided'}

Your task is to analyze the work order and suggest a priority level (low, medium, high, urgent) and provide a brief reason for your recommendation.
${photoUrls.length > 0 ? 'Analyze the provided photos to assess severity and safety concerns.' : ''}`;

        json_schema = {
          type: "object",
          properties: {
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            priority_reason: { type: "string" }
          },
          required: ["priority", "priority_reason"]
        };
      } else {
        prompt = `You are assisting a building manager in writing a professional work order description.
The current work order details are:
Title: ${title}
Category: ${category}
Current Description: ${currentDescription || ''}

Your task is to generate a clear, professional, and detailed work order description that:
1. Accurately describes the issue or work needed.
2. Includes relevant context for contractors to understand the situation.
3. Is suitable for property management records and reports.
4. Uses professional language.
If a current description is provided, enhance it; otherwise, create a new one based on the title and category.

${photoUrls.length > 0 ? 'Analyze the provided photos to add specific visual details to the description.' : ''}`;

        json_schema = {
          type: "object",
          properties: {
            description: { type: "string" }
          },
          required: ["description"]
        };
      }

      const data = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: photoUrls.length > 0 ? photoUrls : undefined,
        response_json_schema: json_schema
      });

      if (generateTitle) {
        if (data?.title) setGeneratedTitle(data.title);
        if (data?.description) setGeneratedDescription(data.description);
        if (data?.priority) setGeneratedPriority(data.priority);
        if (data?.priority_reason) setPriorityReason(data.priority_reason);
        toast.success('Content generated successfully');
      } else if (suggestPriority) {
        if (data?.priority) setGeneratedPriority(data.priority);
        if (data?.priority_reason) setPriorityReason(data.priority_reason);
        toast.success('Priority suggestion generated');
      } else {
        if (data?.description) setGeneratedDescription(data.description);
        toast.success('Description generated successfully');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseDescription = () => {
    if (generatedTitle && onTitleGenerated) {
      onTitleGenerated(generatedTitle);
    }
    if (generatedDescription) {
      onDescriptionGenerated(generatedDescription);
    }
    if (generatedPriority && onPriorityGenerated) {
      onPriorityGenerated(generatedPriority);
    }
    setGeneratedTitle('');
    setGeneratedDescription('');
    setGeneratedPriority('');
    setPriorityReason('');
    toast.success('AI suggestions applied');
  };

  const handleCopy = () => {
    const textToCopy = generatedTitle 
      ? `${generatedTitle}\n\n${generatedDescription}`
      : generatedDescription;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleGenerate}
        disabled={generating || (generateTitle && !category)}
        className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generating with AI...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            {generateTitle ? 'Generate Title & Description with AI' : 'Enhance Description with AI'}
          </>
        )}
      </Button>

      {(generatedTitle || generatedDescription || generatedPriority) && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4 space-y-3">
          {generatedTitle && (
            <div>
              <p className="text-xs font-medium text-blue-700 mb-1">Generated Title</p>
              <p className="text-sm font-semibold text-slate-900">{generatedTitle}</p>
            </div>
          )}
          {(generatedTitle || generatedPriority) && generatedDescription && <div className="border-t border-blue-200" />}
          {generatedDescription && (
            <div>
              {(generatedTitle || generatedPriority) && <p className="text-xs font-medium text-blue-700 mb-1">Generated Description</p>}
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-700 flex-1">{generatedDescription}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  className="h-8 w-8 flex-shrink-0"
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}
          {generatedPriority && (
            <>
              {(generatedTitle || generatedDescription) && <div className="border-t border-blue-200" />}
              <div>
                <p className="text-xs font-medium text-blue-700 mb-2">Suggested Priority</p>
                <div className="flex items-start gap-3">
                  <Badge className={`${
                    generatedPriority === 'urgent' ? 'bg-red-500' :
                    generatedPriority === 'high' ? 'bg-orange-500' :
                    generatedPriority === 'medium' ? 'bg-blue-500' : 'bg-slate-400'
                  } text-white capitalize font-medium`}>
                    {generatedPriority}
                  </Badge>
                  <p className="text-xs text-slate-600 flex-1">{priorityReason}</p>
                </div>
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setGeneratedTitle('');
                setGeneratedDescription('');
                setGeneratedPriority('');
                setPriorityReason('');
              }}
              className="flex-1"
            >
              Discard
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleUseDescription}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Apply AI Suggestions
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}