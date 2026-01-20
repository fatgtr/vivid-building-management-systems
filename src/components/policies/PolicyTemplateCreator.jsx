import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Loader2,
  FileText,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PolicyTemplateLibrary from './PolicyTemplateLibrary';

export default function PolicyTemplateCreator({ buildingId, onPolicyCreated }) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [generatedPolicy, setGeneratedPolicy] = useState(null);
  const queryClient = useQueryClient();

  const populateMutation = useMutation({
    mutationFn: async (templateId) => {
      const response = await base44.functions.invoke('populatePolicyTemplate', {
        template_id: templateId,
        building_id: buildingId
      });
      return response.data;
    },
    onSuccess: (data) => {
      setGeneratedPolicy(data.policy);
      toast.success('Policy template populated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to populate template');
    }
  });

  const createPolicyMutation = useMutation({
    mutationFn: (policyData) => base44.entities.Policy.create(policyData),
    onSuccess: () => {
      queryClient.invalidateQueries(['policies']);
      toast.success('Policy created successfully');
      setShowTemplates(false);
      setSelectedTemplate(null);
      setGeneratedPolicy(null);
      if (onPolicyCreated) onPolicyCreated();
    }
  });

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    populateMutation.mutate(template.id);
  };

  const handleCreatePolicy = () => {
    if (generatedPolicy) {
      createPolicyMutation.mutate(generatedPolicy);
    }
  };

  return (
    <div>
      <Button onClick={() => setShowTemplates(true)} className="w-full">
        <FileText className="h-4 w-4 mr-2" />
        Create Policy from Template
      </Button>

      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Policy from Template</DialogTitle>
          </DialogHeader>

          {populateMutation.isPending ? (
            <div className="py-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-slate-600">Customizing policy template with AI...</p>
              <p className="text-sm text-slate-500 mt-2">Analyzing building documents and applying customizations</p>
            </div>
          ) : generatedPolicy ? (
            <div className="space-y-4">
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900">Policy Generated Successfully</p>
                      <p className="text-sm text-green-700 mt-1">
                        Review the customized policy below and create it when ready
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {generatedPolicy.title}
                    <Badge>Draft</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generatedPolicy.key_points?.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Key Points:</h4>
                      <ul className="space-y-1">
                        {generatedPolicy.key_points.map((point, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                            <span className="text-blue-600 font-bold">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Full Content:</h4>
                    <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {generatedPolicy.content}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={handleCreatePolicy}
                      disabled={createPolicyMutation.isPending}
                      className="flex-1"
                    >
                      {createPolicyMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Create Policy
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setGeneratedPolicy(null);
                        setSelectedTemplate(null);
                      }}
                    >
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <PolicyTemplateLibrary onSelectTemplate={handleSelectTemplate} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}