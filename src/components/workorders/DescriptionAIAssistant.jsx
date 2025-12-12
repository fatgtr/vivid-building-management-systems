import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function DescriptionAIAssistant({ 
  title, 
  category, 
  selectedPhotos = [], 
  selectedVideos = [],
  currentDescription,
  onDescriptionGenerated 
}) {
  const [generating, setGenerating] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!title) {
      toast.error('Please enter a title first');
      return;
    }

    setGenerating(true);
    try {
      // Upload photos/videos if they exist and get URLs
      const photoUrls = [];
      const videoUrls = [];

      if (selectedPhotos.length > 0) {
        for (const photo of selectedPhotos.slice(0, 5)) {
          if (!photo.isExisting) {
            const { file_url } = await base44.integrations.Core.UploadFile({ file: photo });
            photoUrls.push(file_url);
          }
        }
      }

      const prompt = `You are assisting a building manager in writing a professional work order description.

Title: ${title}
Category: ${category}
${currentDescription ? `Current Description: ${currentDescription}` : ''}

Please generate a clear, professional work order description that:
1. Describes the issue or work needed in detail
2. Includes relevant context for contractors to understand the situation
3. Is suitable for monthly building management reports
4. Uses professional language appropriate for property management

${photoUrls.length > 0 ? 'Analyze the provided photos to add specific visual details to the description.' : ''}

Generate only the description text, no additional commentary.`;

      const { data } = await base44.functions.invoke('generateWorkOrderDescription', {
        prompt,
        file_urls: photoUrls.length > 0 ? photoUrls : undefined
      });

      if (data?.description) {
        setGeneratedDescription(data.description);
        toast.success('Description generated successfully');
      } else {
        toast.error('Failed to generate description');
      }
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Failed to generate description');
    } finally {
      setGenerating(false);
    }
  };

  const handleUseDescription = () => {
    onDescriptionGenerated(generatedDescription);
    setGeneratedDescription('');
    toast.success('Description applied');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedDescription);
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
        disabled={generating || !title}
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
            Generate Description with AI
          </>
        )}
      </Button>

      {generatedDescription && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGeneratedDescription('')}
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
              Use This Description
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}