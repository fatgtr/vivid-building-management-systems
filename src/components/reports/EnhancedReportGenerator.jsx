import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Download, Mail, Calendar, Loader2 } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

const reportTemplates = [
  {
    id: 'monthly_operations',
    name: 'Monthly Operations Report',
    description: 'Work orders, maintenance, and compliance summary',
    sections: ['work_orders', 'maintenance', 'compliance', 'costs']
  },
  {
    id: 'quarterly_financial',
    name: 'Quarterly Financial Report',
    description: 'Expenses, budgets, and levy payments',
    sections: ['expenses', 'levies', 'budget_variance', 'forecasts']
  },
  {
    id: 'asset_compliance',
    name: 'Asset & Compliance Report',
    description: 'Asset register, compliance status, and due items',
    sections: ['assets', 'compliance_status', 'upcoming_renewals']
  },
  {
    id: 'resident_engagement',
    name: 'Resident Engagement Report',
    description: 'Announcements, polls, amenity bookings, and feedback',
    sections: ['announcements', 'polls', 'amenity_bookings', 'work_order_requests']
  },
  {
    id: 'energy_sustainability',
    name: 'Energy & Sustainability Report',
    description: 'Energy consumption, costs, and efficiency metrics',
    sections: ['energy_usage', 'cost_trends', 'efficiency_score', 'recommendations']
  },
  {
    id: 'custom',
    name: 'Custom Report',
    description: 'Build your own report with selected sections',
    sections: []
  }
];

const availableSections = [
  { id: 'work_orders', label: 'Work Orders Summary' },
  { id: 'maintenance', label: 'Maintenance Activities' },
  { id: 'compliance', label: 'Compliance Status' },
  { id: 'costs', label: 'Cost Analysis' },
  { id: 'expenses', label: 'Expense Breakdown' },
  { id: 'levies', label: 'Levy Payments' },
  { id: 'budget_variance', label: 'Budget vs Actual' },
  { id: 'assets', label: 'Asset Register' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'polls', label: 'Polls & Voting' },
  { id: 'amenity_bookings', label: 'Amenity Bookings' },
  { id: 'energy_usage', label: 'Energy Consumption' },
  { id: 'residents', label: 'Resident Directory' }
];

export default function EnhancedReportGenerator() {
  const { selectedBuildingId, managedBuildings } = useBuildingContext();
  const [selectedTemplate, setSelectedTemplate] = useState('monthly_operations');
  const [selectedSections, setSelectedSections] = useState(['work_orders', 'maintenance', 'compliance', 'costs']);
  const [periodType, setPeriodType] = useState('monthly');
  const [isGenerating, setIsGenerating] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState('download');
  const [emailRecipients, setEmailRecipients] = useState('');

  const currentTemplate = reportTemplates.find(t => t.id === selectedTemplate);

  const handleTemplateChange = (templateId) => {
    setSelectedTemplate(templateId);
    const template = reportTemplates.find(t => t.id === templateId);
    if (template && template.sections.length > 0) {
      setSelectedSections(template.sections);
    }
  };

  const toggleSection = (sectionId) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const generateReport = async () => {
    if (!selectedBuildingId) {
      toast.error('Please select a building');
      return;
    }

    if (selectedSections.length === 0) {
      toast.error('Please select at least one section');
      return;
    }

    setIsGenerating(true);

    try {
      // Calculate date range based on period type
      let startDate, endDate;
      const now = new Date();
      
      switch (periodType) {
        case 'monthly':
          startDate = startOfMonth(subMonths(now, 1));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case 'quarterly':
          startDate = startOfMonth(subMonths(now, 3));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        case 'yearly':
          startDate = startOfMonth(subMonths(now, 12));
          endDate = endOfMonth(subMonths(now, 1));
          break;
        default:
          startDate = startOfMonth(now);
          endDate = endOfMonth(now);
      }

      const reportData = {
        buildingId: selectedBuildingId,
        template: selectedTemplate,
        sections: selectedSections,
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        periodType,
        generatedDate: format(now, 'yyyy-MM-dd HH:mm:ss')
      };

      // Generate the report HTML/PDF
      const building = managedBuildings.find(b => b.id === selectedBuildingId);
      const reportHTML = await generateReportHTML(reportData, building);

      if (deliveryMethod === 'email') {
        // Send via email
        await base44.functions.invoke('sendReport', {
          recipients: emailRecipients.split(',').map(e => e.trim()),
          reportHTML,
          reportTitle: `${currentTemplate.name} - ${building.name}`,
          period: `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
        });
        toast.success('Report sent via email');
      } else {
        // Download as PDF
        const blob = new Blob([reportHTML], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentTemplate.name.replace(/\s/g, '_')}_${format(now, 'yyyy-MM-dd')}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success('Report downloaded');
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      toast.error('Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateReportHTML = async (reportData, building) => {
    // Fetch required data based on selected sections
    const data = {};
    
    if (selectedSections.includes('work_orders')) {
      data.workOrders = await base44.entities.WorkOrder.filter({ building_id: reportData.buildingId });
    }
    
    if (selectedSections.includes('compliance')) {
      data.compliance = await base44.entities.ComplianceRecord.filter({ building_id: reportData.buildingId });
    }
    
    if (selectedSections.includes('assets')) {
      data.assets = await base44.entities.Asset.filter({ building_id: reportData.buildingId });
    }
    
    if (selectedSections.includes('amenity_bookings')) {
      data.bookings = await base44.entities.AmenityBooking.filter({ building_id: reportData.buildingId });
    }

    // Generate HTML report
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${currentTemplate.name} - ${building.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
          h1 { color: #0f172a; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #334155; margin-top: 30px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; }
          .header { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .metric { display: inline-block; margin: 10px 20px 10px 0; }
          .metric-label { font-size: 12px; color: #64748b; }
          .metric-value { font-size: 24px; font-weight: bold; color: #3b82f6; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #f1f5f9; text-align: left; padding: 12px; border: 1px solid #e2e8f0; }
          td { padding: 10px; border: 1px solid #e2e8f0; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${currentTemplate.name}</h1>
          <p><strong>${building.name}</strong></p>
          <p>Period: ${reportData.startDate} to ${reportData.endDate}</p>
          <p>Generated: ${reportData.generatedDate}</p>
        </div>

        ${selectedSections.includes('work_orders') ? `
          <h2>Work Orders Summary</h2>
          <div class="metric">
            <div class="metric-label">Total Work Orders</div>
            <div class="metric-value">${data.workOrders?.length || 0}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Completed</div>
            <div class="metric-value">${data.workOrders?.filter(w => w.status === 'completed').length || 0}</div>
          </div>
          <div class="metric">
            <div class="metric-label">In Progress</div>
            <div class="metric-value">${data.workOrders?.filter(w => w.status === 'in_progress').length || 0}</div>
          </div>
        ` : ''}

        ${selectedSections.includes('compliance') ? `
          <h2>Compliance Status</h2>
          <div class="metric">
            <div class="metric-label">Total Records</div>
            <div class="metric-value">${data.compliance?.length || 0}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Compliant</div>
            <div class="metric-value">${data.compliance?.filter(c => c.status === 'compliant').length || 0}</div>
          </div>
          <div class="metric">
            <div class="metric-label">Overdue</div>
            <div class="metric-value">${data.compliance?.filter(c => c.status === 'overdue').length || 0}</div>
          </div>
        ` : ''}

        ${selectedSections.includes('assets') ? `
          <h2>Asset Register</h2>
          <p>Total Assets: <strong>${data.assets?.length || 0}</strong></p>
          <table>
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Type</th>
                <th>Status</th>
                <th>Next Service</th>
              </tr>
            </thead>
            <tbody>
              ${data.assets?.slice(0, 10).map(asset => `
                <tr>
                  <td>${asset.name}</td>
                  <td>${asset.asset_type}</td>
                  <td>${asset.operational_status}</td>
                  <td>${asset.next_service_date || 'N/A'}</td>
                </tr>
              `).join('') || '<tr><td colspan="4">No assets</td></tr>'}
            </tbody>
          </table>
        ` : ''}

        <div class="footer">
          <p>This report was generated by Vivid BMS on ${reportData.generatedDate}</p>
          <p>© ${new Date().getFullYear()} ${building.name}. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Enhanced Report Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Template Selection */}
          <div>
            <Label>Report Template</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportTemplates.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-slate-500">{template.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selection */}
          <div>
            <Label>Report Period</Label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Last Month</SelectItem>
                <SelectItem value="quarterly">Last Quarter</SelectItem>
                <SelectItem value="yearly">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Section Selection */}
          {selectedTemplate === 'custom' && (
            <div>
              <Label className="mb-3 block">Report Sections</Label>
              <div className="grid grid-cols-2 gap-3">
                {availableSections.map(section => (
                  <div key={section.id} className="flex items-center gap-2">
                    <Checkbox
                      id={section.id}
                      checked={selectedSections.includes(section.id)}
                      onCheckedChange={() => toggleSection(section.id)}
                    />
                    <Label htmlFor={section.id} className="cursor-pointer">
                      {section.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery Method */}
          <div>
            <Label>Delivery Method</Label>
            <Select value={deliveryMethod} onValueChange={setDeliveryMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="download">
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Download
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Send via Email
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {deliveryMethod === 'email' && (
            <div>
              <Label htmlFor="email-recipients">Email Recipients (comma separated)</Label>
              <input
                id="email-recipients"
                type="text"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
                className="w-full px-3 py-2 border border-slate-200 rounded-md"
              />
            </div>
          )}

          <Button 
            onClick={generateReport}
            disabled={isGenerating || !selectedBuildingId}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}