import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { 
            buildingId, 
            reportPeriod = 'last_month', 
            sendEmail = false,
            startDate: customStartDate,
            endDate: customEndDate,
            categories = [],
            priorities = [],
            statuses = []
        } = await req.json();

        if (!buildingId) {
            return Response.json({ error: 'Building ID is required' }, { status: 400 });
        }

        // Calculate date range
        const now = new Date();
        let startDate, endDate;
        
        if (reportPeriod === 'custom' && customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            endDate = new Date(customEndDate);
        } else if (reportPeriod === 'last_month') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (reportPeriod === 'last_quarter') {
            const currentQuarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
            endDate = new Date(now.getFullYear(), currentQuarter * 3, 0);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        }

        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        // Fetch all necessary data
        const [building, allWorkOrders, residents, contractors, maintenanceSchedules, assets, inspections, documents] = await Promise.all([
            base44.asServiceRole.entities.Building.get(buildingId),
            base44.asServiceRole.entities.WorkOrder.filter({ building_id: buildingId }),
            base44.asServiceRole.entities.Resident.filter({ building_id: buildingId }),
            base44.asServiceRole.entities.Contractor.list(),
            base44.asServiceRole.entities.MaintenanceSchedule.filter({ building_id: buildingId }).catch(() => []),
            base44.asServiceRole.entities.Asset.filter({ building_id: buildingId }).catch(() => []),
            base44.asServiceRole.entities.Inspection.filter({ building_id: buildingId }).catch(() => []),
            base44.asServiceRole.entities.Document.filter({ building_id: buildingId }).catch(() => [])
        ]);

        // Filter work orders by date range and other criteria
        const workOrders = allWorkOrders.filter(wo => {
            const createdDate = new Date(wo.created_date);
            const completedDate = wo.completed_date ? new Date(wo.completed_date) : null;
            
            // Date filter - include if created in range OR completed in range
            const dateMatch = (createdDate >= startDate && createdDate <= endDate) ||
                   (completedDate && completedDate >= startDate && completedDate <= endDate);
            
            if (!dateMatch) return false;
            
            // Category filter
            if (categories.length > 0) {
                const woCategory = wo.main_category || wo.category;
                if (!woCategory || !categories.includes(woCategory)) return false;
            }
            
            // Priority filter
            if (priorities.length > 0) {
                if (!wo.priority || !priorities.includes(wo.priority)) return false;
            }
            
            // Status filter
            if (statuses.length > 0) {
                if (!wo.status || !statuses.includes(wo.status)) return false;
            }
            
            return true;
        });

        // Get strata committee members and manager email
        const strataCommitteeMembers = residents.filter(r => r.investor_strata_committee_member);
        const recipientEmails = [
            ...strataCommitteeMembers.map(r => r.investor_email || r.email).filter(e => e),
            building.strata_managing_agent_email
        ].filter(e => e);

        // Categorize work orders
        const completedWorkOrders = workOrders.filter(wo => wo.status === 'completed');
        const pendingWorkOrders = workOrders.filter(wo => wo.status === 'open' || wo.status === 'in_progress');
        const residentReported = workOrders.filter(wo => wo.reported_by && residents.find(r => r.email === wo.reported_by));
        
        // Scheduled maintenance in date range
        const scheduledMaintenance = maintenanceSchedules.filter(ms => {
            if (!ms.next_due_date) return false;
            const dueDate = new Date(ms.next_due_date);
            return dueDate >= startDate && dueDate <= endDate;
        });
        
        const overdueMaintenance = maintenanceSchedules.filter(ms => {
            if (!ms.next_due_date) return false;
            return new Date(ms.next_due_date) < now && ms.status !== 'completed';
        });

        // Inspections in date range
        const completedInspections = inspections.filter(insp => {
            if (!insp.inspection_date) return false;
            const inspDate = new Date(insp.inspection_date);
            return inspDate >= startDate && inspDate <= endDate && insp.status === 'completed';
        });

        // Defects and critical issues
        const defects = workOrders.filter(wo => 
            wo.priority === 'urgent' || wo.priority === 'high' || 
            wo.title?.toLowerCase().includes('defect') || 
            wo.description?.toLowerCase().includes('defect')
        );

        // Assets requiring attention
        const criticalAssets = assets.filter(a => 
            a.operational_status === 'degraded' || 
            a.operational_status === 'down' ||
            a.health_score < 50 ||
            (a.next_service_date && new Date(a.next_service_date) < now)
        );

        // Calculate costs
        const totalCost = workOrders.reduce((sum, wo) => sum + (wo.actual_cost || wo.estimated_cost || 0), 0);
        const maintenanceCost = completedWorkOrders.reduce((sum, wo) => sum + (wo.actual_cost || 0), 0);
        const pendingEstimatedCost = pendingWorkOrders.reduce((sum, wo) => sum + (wo.estimated_cost || 0), 0);

        // Prepare data for AI analysis
        const workOrderSummary = workOrders.map(wo => ({
            title: wo.title,
            category: wo.main_category || wo.category,
            priority: wo.priority,
            status: wo.status,
            created_date: wo.created_date,
            completed_date: wo.completed_date,
            estimated_cost: wo.estimated_cost,
            actual_cost: wo.actual_cost,
            is_resident_reported: !!residents.find(r => r.email === wo.reported_by),
            description: wo.description,
        }));

        // Enhanced AI Analysis with comprehensive data
        const analysisPrompt = `You are an expert building maintenance analyst generating a comprehensive report with predictive insights.

Building: ${building.name}
Report Period: ${startDateStr} to ${endDateStr}

WORK ORDERS (${workOrders.length} total):
- Completed: ${completedWorkOrders.length}
- Pending: ${pendingWorkOrders.length}
- Resident Reported: ${residentReported.length}
- Defects/Critical: ${defects.length}

SCHEDULED MAINTENANCE:
- Due in Period: ${scheduledMaintenance.length}
- Overdue: ${overdueMaintenance.length}

INSPECTIONS:
- Completed: ${completedInspections.length}

ASSETS:
- Critical Attention Required: ${criticalAssets.length}

COSTS:
- Total Actual Cost: $${totalCost.toFixed(2)}
- Completed Work Cost: $${maintenanceCost.toFixed(2)}
- Pending Estimated Cost: $${pendingEstimatedCost.toFixed(2)}

Work Orders Detail:
${JSON.stringify(workOrderSummary.slice(-30), null, 2)}

Analyze this comprehensive data and provide:
1. Executive summary (2-3 sentences covering all activity types)
2. Key metrics across all categories
3. Top recurring issues with their frequency
4. Pattern analysis: Categories/priorities affecting costs and timelines
5. Predictive maintenance alerts based on historical data and asset conditions
6. Proactive recommendations with specific actions and estimated savings
7. Budget insights and cost optimization opportunities
8. Service quality assessment for resident-reported issues
9. Compliance and safety observations from inspections and defects`;

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
                patterns: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            description: { type: "string" },
                            impact: { type: "string" },
                            severity: { type: "string" }
                        }
                    }
                },
                predictions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            asset_or_system: { type: "string" },
                            predicted_issue: { type: "string" },
                            timeframe: { type: "string" },
                            confidence: { type: "string" }
                        }
                    }
                },
                recommendations: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            title: { type: "string" },
                            action: { type: "string" },
                            priority: { type: "string" },
                            estimated_savings: { type: "string" }
                        }
                    }
                },
                budget_insights: { type: "string" },
                service_quality_score: { type: "number" },
                compliance_notes: { type: "string" }
            }
        };

        const analysis = await base44.asServiceRole.integrations.Core.InvokeLLM({
            prompt: analysisPrompt,
            response_json_schema: analysisSchema
        });

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
            return lines.length * (size * 0.4 + 2);
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
            { label: 'Total Work Orders', value: workOrders.length, color: [37, 99, 235] },
            { label: 'Completed', value: completedWorkOrders.length, color: [34, 197, 94] },
            { label: 'Pending', value: pendingWorkOrders.length, color: [251, 146, 60] },
            { label: 'Total Cost', value: `$${totalCost.toLocaleString()}`, color: [168, 85, 247] }
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

        // Scheduled Maintenance Summary
        checkPageBreak(50);
        addText('Scheduled Maintenance', 20, yPos, 14, 'bold', [15, 23, 42]);
        yPos += 8;

        const scheduleMetrics = [
            { label: 'Completed Tasks', value: scheduledMaintenance.filter(m => m.status === 'completed').length, color: [34, 197, 94] },
            { label: 'Due This Period', value: scheduledMaintenance.length, color: [251, 146, 60] },
            { label: 'Overdue Tasks', value: overdueMaintenance.length, color: [220, 38, 38] },
            { label: 'Total Schedules', value: maintenanceSchedules.length, color: [37, 99, 235] }
        ];

        const miniBoxWidth = (pageWidth - 50) / 4;
        scheduleMetrics.forEach((metric, idx) => {
            const xPos = 15 + (idx * (miniBoxWidth + 5));
            doc.setFillColor(250, 250, 250);
            doc.roundedRect(xPos, yPos, miniBoxWidth, 20, 2, 2, 'F');
            doc.setDrawColor(229, 231, 235);
            doc.roundedRect(xPos, yPos, miniBoxWidth, 20, 2, 2, 'S');
            
            addText(metric.value.toString(), xPos + 5, yPos + 10, 12, 'bold', metric.color);
            addText(metric.label, xPos + 5, yPos + 16, 7, 'normal', [100, 116, 139]);
        });
        yPos += 28;

        // Overdue Maintenance Details
        if (overdueMaintenance.length > 0) {
            checkPageBreak(30);
            addText('⚠ Overdue Maintenance Tasks', 20, yPos, 12, 'bold', [220, 38, 38]);
            yPos += 8;
            
            overdueMaintenance.slice(0, 5).forEach((task) => {
                checkPageBreak(15);
                doc.setFillColor(254, 242, 242);
                doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
                addText(`• ${task.task_name || task.asset_name || 'Maintenance Task'}`, 20, yPos + 6, 9, 'normal', [15, 23, 42]);
                addText(`Due: ${task.next_due_date ? new Date(task.next_due_date).toLocaleDateString() : 'N/A'}`, pageWidth - 60, yPos + 6, 8, 'normal', [220, 38, 38]);
                yPos += 14;
            });
            yPos += 5;
        }

        // Resident Reported Issues
        if (residentReported.length > 0) {
            checkPageBreak(40);
            addText('Resident Service Requests', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 8;
            
            const residentMetrics = [
                { label: 'Total Requests', value: residentReported.length },
                { label: 'Resolved', value: residentReported.filter(w => w.status === 'completed').length },
                { label: 'Avg Response', value: `${analysis.average_resolution_days || 5} days` }
            ];
            
            residentMetrics.forEach((metric, idx) => {
                addText(`${metric.label}: `, 25, yPos, 10, 'normal', [100, 116, 139]);
                addText(metric.value.toString(), 25 + (idx * 60) + 40, yPos, 10, 'bold', [15, 23, 42]);
                yPos += 6;
            });
            yPos += 8;
        }

        // Defects & Critical Issues
        if (defects.length > 0) {
            checkPageBreak(40);
            addText('Defects & Critical Issues', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 8;

            defects.slice(0, 5).forEach((defect) => {
                checkPageBreak(20);
                doc.setFillColor(254, 242, 242);
                doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
                
                addText(`⚠ ${defect.title}`, 20, yPos + 6, 10, 'bold', [15, 23, 42]);
                addText(`${defect.priority} | ${defect.status}`, pageWidth - 70, yPos + 6, 8, 'normal', [220, 38, 38]);
                yPos += 18;
            });
            yPos += 5;
        }

        // Asset Health Summary
        if (criticalAssets.length > 0) {
            checkPageBreak(40);
            addText('Assets Requiring Attention', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 8;

            criticalAssets.slice(0, 5).forEach((asset) => {
                checkPageBreak(15);
                doc.setFillColor(254, 249, 195);
                doc.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'F');
                addText(`• ${asset.name}`, 20, yPos + 6, 9, 'normal', [15, 23, 42]);
                addText(`Status: ${asset.operational_status}`, pageWidth - 70, yPos + 6, 8, 'normal', [251, 146, 60]);
                yPos += 14;
            });
            yPos += 5;
        }

        // Inspections Summary
        if (completedInspections.length > 0) {
            checkPageBreak(30);
            addText('Inspections Completed', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 8;
            addText(`Total Inspections: ${completedInspections.length}`, 25, yPos, 10, 'normal', [15, 23, 42]);
            yPos += 8;
            
            const findingsCount = completedInspections.reduce((sum, insp) => 
                sum + (insp.findings?.length || 0), 0);
            if (findingsCount > 0) {
                addText(`Total Findings: ${findingsCount}`, 25, yPos, 10, 'normal', [251, 146, 60]);
                yPos += 8;
            }
        }
        yPos += 10;

        // Recurring Issues
        if (analysis.recurring_issues && analysis.recurring_issues.length > 0) {
            checkPageBreak(50);
            addText('Top Recurring Issues', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 8;

            analysis.recurring_issues.slice(0, 5).forEach((issue, idx) => {
                checkPageBreak(20);
                doc.setFillColor(254, 242, 242);
                doc.roundedRect(15, yPos, pageWidth - 30, 15, 2, 2, 'F');
                
                addText(`${idx + 1}. ${issue.issue}`, 20, yPos + 6, 10, 'normal', [15, 23, 42]);
                addText(`${issue.frequency}x`, pageWidth - 40, yPos + 6, 10, 'bold', [220, 38, 38]);
                addText(issue.severity || 'Medium', pageWidth - 70, yPos + 6, 8, 'normal', [100, 116, 139]);
                yPos += 18;
            });
            yPos += 5;
        }

        // Pattern Analysis
        if (analysis.patterns && analysis.patterns.length > 0) {
            checkPageBreak(40);
            addText('AI Pattern Analysis', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 10;

            analysis.patterns.forEach((pattern) => {
                checkPageBreak(30);
                doc.setFillColor(239, 246, 255); // Blue-50
                doc.roundedRect(15, yPos, pageWidth - 30, 20, 2, 2, 'F');
                
                addText(`• ${pattern.description}`, 20, yPos + 6, 10, 'normal', [15, 23, 42]);
                yPos += 10;
                addText(`Impact: ${pattern.impact} | Severity: ${pattern.severity}`, 25, yPos, 8, 'normal', [100, 116, 139]);
                yPos += 15;
            });
            yPos += 8;
        }

        // Predictive Maintenance Alerts
        if (analysis.predictions && analysis.predictions.length > 0) {
            checkPageBreak(40);
            addText('Predictive Maintenance Alerts', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 10;

            analysis.predictions.forEach((prediction) => {
                checkPageBreak(30);
                doc.setFillColor(254, 242, 242); // Red-50
                doc.roundedRect(15, yPos, pageWidth - 30, 22, 2, 2, 'F');
                
                addText(`⚠ ${prediction.asset_or_system}`, 20, yPos + 6, 10, 'bold', [15, 23, 42]);
                yPos += 10;
                const predHeight = addWrappedText(prediction.predicted_issue, 25, yPos, pageWidth - 50, 9);
                yPos += predHeight + 3;
                addText(`Expected: ${prediction.timeframe} | Confidence: ${prediction.confidence}`, 25, yPos, 8, 'normal', [100, 116, 139]);
                yPos += 15;
            });
            yPos += 8;
        }

        // Proactive Recommendations
        if (analysis.recommendations && analysis.recommendations.length > 0) {
            checkPageBreak(40);
            addText('Proactive Recommendations', 20, yPos, 14, 'bold', [15, 23, 42]);
            yPos += 10;

            analysis.recommendations.forEach((rec) => {
                checkPageBreak(35);
                doc.setFillColor(236, 253, 245); // Green-50
                doc.roundedRect(15, yPos, pageWidth - 30, 25, 2, 2, 'F');
                
                addText(`✓ ${rec.title}`, 20, yPos + 6, 10, 'bold', [15, 23, 42]);
                yPos += 10;
                const actionHeight = addWrappedText(rec.action, 25, yPos, pageWidth - 50, 9);
                yPos += actionHeight + 3;
                addText(`Priority: ${rec.priority} | Savings: ${rec.estimated_savings}`, 25, yPos, 8, 'normal', [100, 116, 139]);
                yPos += 15;
            });
            yPos += 8;
        }

        // Work Orders Detail
        doc.addPage();
        yPos = 20;
        addText('Work Orders Detail', 20, yPos, 16, 'bold', [15, 23, 42]);
        yPos += 12;

        for (const wo of workOrders.slice(0, 20)) { // Limit to 20 work orders for PDF size
            checkPageBreak(80);

            // Work order separator line
            doc.setDrawColor(229, 231, 235);
            doc.setLineWidth(0.5);
            doc.line(15, yPos, pageWidth - 15, yPos);
            yPos += 5;

            addText(wo.title, 20, yPos, 11, 'bold', [15, 23, 42]);
            yPos += 8;

            addText(`Category: ${wo.main_category || wo.category || 'N/A'} | Priority: ${wo.priority} | Status: ${wo.status}`, 20, yPos, 8, 'normal', [100, 116, 139]);
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

        // Budget & Cost Analysis
        doc.addPage();
        yPos = 20;
        addText('Budget & Cost Analysis', 20, yPos, 16, 'bold', [15, 23, 42]);
        yPos += 12;

        // Cost Breakdown
        const costBreakdown = [
            { label: 'Completed Work', value: `$${maintenanceCost.toLocaleString()}`, color: [34, 197, 94] },
            { label: 'Pending (Est.)', value: `$${pendingEstimatedCost.toLocaleString()}`, color: [251, 146, 60] },
            { label: 'Total Period', value: `$${totalCost.toLocaleString()}`, color: [37, 99, 235] }
        ];

        costBreakdown.forEach((item, idx) => {
            checkPageBreak(10);
            addText(`${item.label}:`, 25, yPos, 10, 'normal', [100, 116, 139]);
            addText(item.value, 100, yPos, 12, 'bold', item.color);
            yPos += 10;
        });
        yPos += 10;

        if (analysis.budget_insights) {
            checkPageBreak(40);
            doc.setFillColor(254, 249, 195);
            doc.roundedRect(15, yPos, pageWidth - 30, 40, 3, 3, 'F');
            const budgetHeight = addWrappedText(analysis.budget_insights, 20, yPos + 8, pageWidth - 40, 10);
            yPos += budgetHeight + 15;
        }

        // Service Quality & Compliance
        if (analysis.service_quality_score || analysis.compliance_notes) {
            checkPageBreak(50);
            addText('Service Quality & Compliance', 20, yPos, 16, 'bold', [15, 23, 42]);
            yPos += 12;

            if (analysis.service_quality_score) {
                addText(`Resident Satisfaction Score: ${analysis.service_quality_score}/10`, 25, yPos, 10, 'bold', [34, 197, 94]);
                yPos += 10;
            }

            if (analysis.compliance_notes) {
                doc.setFillColor(236, 253, 245);
                doc.roundedRect(15, yPos, pageWidth - 30, 30, 3, 3, 'F');
                const compHeight = addWrappedText(analysis.compliance_notes, 20, yPos + 8, pageWidth - 40, 10);
                yPos += compHeight + 15;
            }
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