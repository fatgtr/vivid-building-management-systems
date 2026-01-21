import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { buildingId } = await req.json();

    // Fetch historical work orders
    const workOrders = await base44.asServiceRole.entities.WorkOrder.filter(
      buildingId ? { building_id: buildingId } : {}
    );

    // Fetch assets
    const assets = await base44.asServiceRole.entities.Asset.filter(
      buildingId ? { building_id: buildingId } : {}
    );

    // Fetch buildings
    const buildings = buildingId 
      ? [await base44.asServiceRole.entities.Building.get(buildingId)]
      : await base44.asServiceRole.entities.Building.list();

    // Analyze patterns with AI
    const analysisPrompt = `
You are a building maintenance AI expert. Analyze the following data and predict potential maintenance issues.

ASSETS (${assets.length} total):
${assets.slice(0, 50).map(a => `
- ${a.name} (${a.category}/${a.subcategory})
  Age: ${a.installation_date ? Math.floor((Date.now() - new Date(a.installation_date)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'} years
  Status: ${a.status}
  Condition: ${a.condition_rating || 'N/A'}/10
  Last Service: ${a.last_service_date || 'Never'}
  Warranty: ${a.warranty_expiry_date ? (new Date(a.warranty_expiry_date) > new Date() ? 'Active' : 'Expired') : 'N/A'}
`).join('')}

WORK ORDER HISTORY (Last 100):
${workOrders.slice(0, 100).map(w => `
- ${w.title} (${w.main_category}/${w.subcategory})
  Status: ${w.status}
  Priority: ${w.priority}
  Date: ${w.created_date}
  Recurring: ${w.is_recurring}
`).join('')}

BUILDINGS:
${buildings.map(b => `
- ${b.name} (Built: ${b.year_built})
  Type: ${b.building_type}
  Floors: ${b.floors}
  Units: ${b.total_units}
`).join('')}

TASK:
1. Identify assets at high risk of failure based on age, condition, service history
2. Detect recurring maintenance patterns that suggest underlying issues
3. Predict upcoming failures in the next 30-90 days
4. Recommend preventive maintenance actions with priority levels
5. Consider seasonality (we're in ${new Date().toLocaleDateString('en-US', { month: 'long' })})

Return JSON array of predictions with this structure:
{
  "predictions": [
    {
      "asset_id": "id or null if general",
      "asset_name": "Asset name",
      "risk_level": "critical|high|medium|low",
      "predicted_failure_date": "estimated date",
      "confidence": 0.0-1.0,
      "reasoning": "Why this is predicted",
      "recommended_action": "What to do",
      "estimated_cost": number or null,
      "category": "category",
      "subcategory": "subcategory"
    }
  ]
}
`;

    const aiResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          predictions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                asset_id: { type: "string" },
                asset_name: { type: "string" },
                risk_level: { type: "string" },
                predicted_failure_date: { type: "string" },
                confidence: { type: "number" },
                reasoning: { type: "string" },
                recommended_action: { type: "string" },
                estimated_cost: { type: "number" },
                category: { type: "string" },
                subcategory: { type: "string" }
              }
            }
          }
        }
      }
    });

    const predictions = aiResponse.predictions || [];

    // Store predictions for tracking
    const predictionRecord = await base44.asServiceRole.entities.MaintenancePrediction.create({
      building_id: buildingId,
      prediction_date: new Date().toISOString(),
      predictions: predictions,
      total_predictions: predictions.length,
      critical_count: predictions.filter(p => p.risk_level === 'critical').length,
      high_count: predictions.filter(p => p.risk_level === 'high').length,
      assets_analyzed: assets.length,
      work_orders_analyzed: workOrders.length
    });

    // Send alerts for critical/high risk items
    const criticalPredictions = predictions.filter(p => 
      p.risk_level === 'critical' || p.risk_level === 'high'
    );

    if (criticalPredictions.length > 0) {
      const building = buildings[0];
      const managers = [];
      
      if (building?.manager_email) managers.push(building.manager_email);
      if (building?.strata_managing_agent_email) managers.push(building.strata_managing_agent_email);

      for (const email of managers) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `🚨 Predictive Maintenance Alert: ${criticalPredictions.length} Critical Issues Detected`,
          body: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(to right, #dc2626, #ea580c); color: white; padding: 30px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">⚠️ Predictive Maintenance Alert</h1>
                <p style="margin: 10px 0 0; opacity: 0.9;">${building?.name || 'Building Management'}</p>
              </div>
              
              <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="color: #475569; margin-bottom: 20px;">Our AI system has detected ${criticalPredictions.length} high-priority maintenance issues that require immediate attention:</p>
                
                ${criticalPredictions.map((pred, idx) => `
                  <div style="margin-bottom: 20px; padding: 20px; background: ${pred.risk_level === 'critical' ? '#fef2f2' : '#fff7ed'}; border-left: 4px solid ${pred.risk_level === 'critical' ? '#dc2626' : '#ea580c'}; border-radius: 4px;">
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                      <h3 style="margin: 0; color: #1e293b;">${pred.asset_name}</h3>
                      <span style="background: ${pred.risk_level === 'critical' ? '#dc2626' : '#ea580c'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase;">
                        ${pred.risk_level}
                      </span>
                    </div>
                    <p style="color: #64748b; font-size: 14px; margin: 8px 0;"><strong>Predicted Failure:</strong> ${pred.predicted_failure_date}</p>
                    <p style="color: #64748b; font-size: 14px; margin: 8px 0;"><strong>Confidence:</strong> ${Math.round(pred.confidence * 100)}%</p>
                    <p style="color: #475569; font-size: 14px; margin: 8px 0;">${pred.reasoning}</p>
                    <p style="color: #1e293b; font-size: 14px; margin: 12px 0 0; padding-top: 12px; border-top: 1px solid #e2e8f0;"><strong>Recommended Action:</strong> ${pred.recommended_action}</p>
                    ${pred.estimated_cost ? `<p style="color: #64748b; font-size: 14px; margin: 4px 0;"><strong>Estimated Cost:</strong> $${pred.estimated_cost.toLocaleString()}</p>` : ''}
                  </div>
                `).join('')}
                
                <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px; text-align: center;">
                  <p style="margin: 0; color: #64748b; font-size: 14px;">Take action now to prevent costly emergency repairs and minimize disruption to residents.</p>
                </div>
              </div>
            </div>
          `
        });
      }
    }

    return Response.json({ 
      success: true,
      predictions,
      predictionId: predictionRecord.id,
      alertsSent: criticalPredictions.length > 0
    });
  } catch (error) {
    console.error('Predictive maintenance analysis failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});