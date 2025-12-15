import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { buildingId, reportPeriod = 'last_month', sendEmail = false } = await req.json();

        if (!buildingId) {
            return Response.json({ error: 'Building ID is required' }, { status: 400 });
        }

        // Calculate date range
        const now = new Date();
        let startDate, endDate;
        
        if (reportPeriod === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (reportPeriod === 'last_quarter') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
            endDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
        } else if (reportPeriod === 'custom') {
            // For custom date ranges passed in the request
            startDate = new Date(req.startDate);
            endDate = new Date(req.endDate);
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch all necessary data
        const [building, allWorkOrders, residents, contractors] = await Promise.all([
            base44.asServiceRole.entities.Building.get(buildingId),
            base44.asServiceRole.entities.WorkOrder.filter({ building_id: buildingId }),
            base44.asServiceRole.entities.Resident.filter({ building_id: buildingId }),
            base44.asServiceRole.entities.Contractor.list()
        ]);

        // Filter work orders by date range
        const workOrders = allWorkOrders.filter(wo => {
            const createdDate = new Date(wo.created_date);
            return createdDate >= startDate && createdDate <= endDate;
        });

        // Get strata committee members and manager email
        const strataCommitteeMembers = residents.filter(r => r.investor_strata_committee_member);
        const recipientEmails = [
            ...strataCommitteeMembers.map(r => r.investor_email || r.email).filter(e => e),
            building.strata_managing_agent_email
        ].filter(e => e);

        // Prepare data for AI analysis
        const workOrderSummary = workOrders.map(wo => ({
            title: wo.title,
            category: wo.category,
            priority: wo.priority,
            status: wo.status,
            created_date: wo.created_date,
            completed_date: wo.completed_date,
            estimated_cost: wo.estimated_cost,
            actual_cost: wo.actual_cost,
            description: wo.description,
        }));

        // AI Analysis
        const analysisPrompt = `You are a property management AI assistant generating an executive summary for a building maintenance report.

Building: ${building.name}
Report Period: ${startDateStr} to ${endDateStr}
Total Work Orders: ${workOrders.length}

Work Orders Summary:
${JSON.stringify(workOrderSummary, null, 2)}

Analyze this data and provide:
1. Executive summary (2-3 sentences highlighting the period's maintenance activity)
2. Key metrics (total orders, completion rate, average resolution time, total costs)
3. Top 3 recurring issues with their frequency
4. Trends and patterns observed
5. Recommendations for property managers
6. Budget insights and cost optimization opportunities`;

        const analysisSchema = {
            type: "object",
            properties: {
                executive_summary: { type: "string" },
                total_work_orders: { type: "number" },
                completed_work_orders: { type: "number" },
                total_cost: { type: "number" },
                average_resolution_days: { type: "number" },
                recurring_issues: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            issue: { type: "string" },
                            frequency: { type: "number" },
                            severity: { type: "string" }
                        }
                    }
                },
                trends: { type: "array", items: { type: "string" } },
                recommendations: { type: "array", items: { type: "string" } },
                budget_insights: { type: "string" }
            }
        };

        const aiAnalysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: analysisSchema
        });

        const analysis = aiAnalysis.data;

        // Generate PDF Report
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 20;

        // Helper functions
        const addText = (text, x, y, size = 12, style = 'normal', color = [0, 0, 0]) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', style);
            doc.setTextColor(...color);
            doc.text(text, x, y);
        };

        const addWrappedText = (text, x, y, maxWidth, size = 10) => {
            doc.setFontSize(size);
            const lines = doc.splitTextToSize(text, maxWidth);
            doc.text(lines, x, y);
            return lines.length * (size * 0.35);
        };

        const checkPageBreak = (requiredSpace = 30) => {
            if (yPos + requiredSpace > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
                return true;
            }
            return false;
        };

        // Cover Page - Gradient Header
        doc.setFillColor(37, 99, 235); // Blue-600
        doc.rect(0, 0, pageWidth, 60, 'F');
        
        addText('Building Managers Report', 20, 25, 24, 'bold', [255, 255, 255]);
        addText(building.name, 20, 40, 14, 'normal', [255, 255, 255]);
        addText(`${startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`, 20, 50, 12, 'normal', [219, 234, 254]);

        yPos = 75;

        // Executive Summary Box
        doc.setFillColor(239, 246, 255); // Blue-50
        doc.roundedRect(15, yPos, pageWidth - 30, 40, 3, 3, 'F');
        doc.setDrawColor(147, 197, 253); // Blue-300
        doc.roundedRect(15, yPos, pageWidth - 30, 40, 3, 3, 'S');
        
        addText('Executive Summary', 20, yPos + 8, 12, 'bold', [37, 99, 235]);
        const summaryHeight = addWrappedText(analysis.executive_summary || 'No summary available', 20, yPos + 16, pageWidth - 40, 10);
        yPos += 50 + summaryHeight;

        // Key Metrics Section
        checkPageBreak(60);
        addText('Key Metrics', 20, yPos, 16, 'bold', [15, 23, 42]);
        yPos += 10;

        const metrics = [
            { label: 'Total Work Orders', value: analysis.total_work_orders || workOrders.length, color: [37, 99, 235] },
            { label: 'Completed', value: analysis.completed_work_orders || workOrders.filter(w => w.status === 'completed').length, color: [34, 197, 94] },
            { label: 'Total Cost', value: `$${(analysis.total_cost || workOrders.reduce((sum, w) => sum + (w.actual_cost || w.estimated_cost || 0), 0)).toLocaleString()}`, color: [251, 146, 60] },
            { label: 'Avg Resolution', value: `${Math.round(analysis.average_resolution_days || 7)} days`, color: [168, 85, 247] }
        ];

        const boxWidth = (pageWidth - 50) / 4;
        metrics.forEach((metric, idx) => {
            const xPos = 15 + (idx * (boxWidth + 5));
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(xPos, yPos, boxWidth, 25, 2, 2, 'F');
            doc.setDrawColor(229, 231, 235);
            doc.roundedRect(xPos, yPos, boxWidth, 25, 2, 2, 'S');
            
            addText(metric.value.toString(), xPos + 5, yPos + 12, 14, 'bold', metric.color);
            addText(metric.label, xPos + 5, yPos + 20, 8, 'normal', [100, 116, 139]);
        });
        yPos += 35;

        // Recurring Issues
        if (analysis.recurring_issues && analysis.recurring_issues.length > 0) {
            checkPageBreak(50);
            addText('Recurring Issues', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 8;

            analysis.recurring_issues.slice(0, 5).forEach((issue, idx) => {
                checkPageBreak(20);
                doc.setFillColor(254, 242, 242); // Red-50
                doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
                
                addText(`${idx + 1}. ${issue.issue}`, 20, yPos + 6, 10, 'normal', [15, 23, 42]);
                addText(`${issue.frequency}x`, pageWidth - 40, yPos + 6, 10, 'bold', [220, 38, 38]);
                addText(issue.severity || 'Medium', pageWidth - 70, yPos + 6, 8, 'normal', [100, 116, 139]);
                yPos += 18;
            });
            yPos += 5;
        }

        // Trends & Insights
        if (analysis.trends && analysis.trends.length > 0) {
            checkPageBreak(40);
            addText('Trends & Insights', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 8;

            analysis.trends.forEach((trend) => {
                checkPageBreak(15);
                doc.setFillColor(224, 242, 254); // Blue-100
                const trendHeight = addWrappedText(`• ${trend}`, 20, yPos + 5, pageWidth - 40, 9);
                yPos += trendHeight + 8;
            });
            yPos += 5;
        }

        // Recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            checkPageBreak(40);
            addText('Recommendations', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 8;

            analysis.recommendations.forEach((rec) => {
                checkPageBreak(15);
                doc.setFillColor(240, 253, 244); // Green-50
                const recHeight = addWrappedText(`✓ ${rec}`, 20, yPos + 5, pageWidth - 40, 9);
                yPos += recHeight + 8;
            });
            yPos += 5;
        }

        // Work Orders Detail
        doc.addPage();
        yPos = 20;
        addText('Work Orders Detail', 20, yPos, 16, 'bold', [15, 23, 42]);
        yPos += 12;

        for (const wo of workOrders.slice(0, 20)) { // Limit to 20 work orders for PDF size
            checkPageBreak(80);

            // Work order box
            doc.setFillColor(249, 250, 251);
            doc.roundedRect(15, yPos, pageWidth - 30, 'auto', 2, 2, 'F');
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.5);
            doc.line(15, yPos, pageWidth - 15, yPos);

            addText(wo.title, 20, yPos + 6, 11, 'bold', [15, 23, 42]);
            yPos += 12;

            addText(`Category: ${wo.category} | Priority: ${wo.priority} | Status: ${wo.status}`, 20, yPos, 8, 'normal', [100, 116, 139]);
            yPos += 6;

            if (wo.description) {
                const descHeight = addWrappedText(wo.description, 20, yPos, pageWidth - 40, 9);
                yPos += descHeight + 3;
            }

            addText(`Cost: $${(wo.actual_cost || wo.estimated_cost || 0).toLocaleString()}`, 20, yPos, 9, 'normal', [22, 163, 74]);
            yPos += 8;

            // Before/After Photos
            if (wo.photos && wo.photos.length > 0) {
                try {
                    const beforePhoto = wo.photos[0];
                    const afterPhoto = wo.photos[wo.photos.length - 1];
                    
                    checkPageBreak(45);
                    addText('Before', 20, yPos, 8, 'bold', [100, 116, 139]);
                    if (wo.photos.length > 1) {
                        addText('After', 95, yPos, 8, 'bold', [100, 116, 139]);
                    }
                    yPos += 5;

                    // Note: jsPDF has limited image support - we'll add placeholders
                    doc.setFillColor(226, 232, 240);
                    doc.roundedRect(20, yPos, 60, 35, 2, 2, 'F');
                    addText('Photo', 45, yPos + 18, 8, 'normal', [148, 163, 184]);
                    
                    if (wo.photos.length > 1) {
                        doc.roundedRect(95, yPos, 60, 35, 2, 2, 'F');
                        addText('Photo', 120, yPos + 18, 8, 'normal', [148, 163, 184]);
                    }
                    
                    yPos += 40;
                } catch (err) {
                    console.log('Error adding photos:', err);
                }
            }

            yPos += 5;
        }

        // Budget Insights
        if (analysis.budget_insights) {
            doc.addPage();
            yPos = 20;
            addText('Budget & Cost Analysis', 20, yPos, 16, 'bold', [15, 23, 42]);
            yPos += 12;

            doc.setFillColor(254, 249, 195); // Yellow-100
            doc.roundedRect(15, yPos, pageWidth - 30, 40, 3, 3, 'F');
            const budgetHeight = addWrappedText(analysis.budget_insights, 20, yPos + 8, pageWidth - 40, 10);
            yPos += budgetHeight + 15;
        }

        // Footer on last page
        const totalPages = doc.internal.pages.length - 1;
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            addText(`Page ${i} of ${totalPages}`, pageWidth - 40, pageHeight - 10, 8, 'normal', [148, 163, 184]);
            addText(`Generated: ${now.toLocaleDateString()}`, 20, pageHeight - 10, 8, 'normal', [148, 163, 184]);
        }

        // Generate PDF
        const pdfBytes = doc.output('arraybuffer');
        const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
        const pdfFile = new File([pdfBlob], `${building.name}-Report-${startDateStr}.pdf`, { type: 'application/pdf' });

        // Upload PDF
        const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: pdfFile });

        // Send emails only if sendEmail is true
        let emailsSent = 0;
        if (sendEmail && recipientEmails.length > 0) {
            const emailPromises = recipientEmails.map(email => 
                base44.asServiceRole.integrations.Core.SendEmail({
                    to: email,
                    subject: `${building.name} - Building Managers Report`,
                    body: `
                        <h2>Building Managers Report</h2>
                        <p>Dear Strata Committee Member,</p>
                        <p>Please find attached the building managers report for <strong>${building.name}</strong> covering the period from <strong>${startDate.toLocaleDateString()}</strong> to <strong>${endDate.toLocaleDateString()}</strong>.</p>
                        
                        <h3>Report Highlights:</h3>
                        <ul>
                            <li>Total Work Orders: ${analysis.total_work_orders || workOrders.length}</li>
                            <li>Completed: ${analysis.completed_work_orders || workOrders.filter(w => w.status === 'completed').length}</li>
                            <li>Total Cost: $${(analysis.total_cost || 0).toLocaleString()}</li>
                        </ul>
                        
                        <p>Download the full report: <a href="${file_url}">View Report</a></p>
                        
                        <p>Best regards,<br>${building.name} Management</p>
                    `
                })
            );

            await Promise.all(emailPromises);
            emailsSent = recipientEmails.length;
        }

        return Response.json({
            success: true,
            report_url: file_url,
            recipients_notified: emailsSent,
            recipient_emails: recipientEmails,
            analysis: analysis
        });

    } catch (error) {
        console.error('Report generation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});