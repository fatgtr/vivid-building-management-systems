import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { partnerId } = await req.json();

    if (!partnerId) {
      return Response.json({ error: 'Partner ID required' }, { status: 400 });
    }

    // Get partner info
    const partner = await base44.asServiceRole.entities.Partner.get(partnerId);
    if (!partner) {
      return Response.json({ error: 'Partner not found' }, { status: 404 });
    }

    // Get billing config
    const billingConfigs = await base44.asServiceRole.entities.PartnerBilling.list();
    const billingConfig = billingConfigs.find(c => c.partner_id === partnerId);
    
    if (!billingConfig) {
      return Response.json({ error: 'Billing configuration not found' }, { status: 404 });
    }

    // Get all buildings for this partner
    const allBuildings = await base44.asServiceRole.entities.Building.list();
    const buildings = allBuildings.filter(b => b.partner_id === partnerId);

    // Calculate billing period
    const today = new Date();
    const cycleMultiplier = billingConfig.billing_cycle === 'monthly' ? 1 : 
                           billingConfig.billing_cycle === 'quarterly' ? 3 : 12;
    
    const billingPeriodStart = new Date(today);
    const billingPeriodEnd = new Date(today);
    billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + cycleMultiplier);

    // Calculate line items
    const lineItems = buildings.map(building => {
      const lotCount = building.strata_lots || 0;
      const ratePerLot = billingConfig.rate_per_lot_monthly;
      const subtotal = lotCount * ratePerLot * cycleMultiplier;

      return {
        building_id: building.id,
        building_name: building.name,
        strata_plan: building.strata_plan_number,
        lot_count: lotCount,
        rate_per_lot: ratePerLot,
        months: cycleMultiplier,
        subtotal: subtotal,
      };
    });

    // Calculate totals
    const subtotal = lineItems.reduce((sum, item) => sum + item.subtotal, 0);
    const taxRate = 0.10; // 10% GST
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number
    const existingInvoices = await base44.asServiceRole.entities.PartnerInvoice.list();
    const partnerInvoices = existingInvoices.filter(i => i.partner_id === partnerId);
    const invoiceNumber = `INV-${partner.name.substring(0, 3).toUpperCase()}-${String(partnerInvoices.length + 1).padStart(4, '0')}`;

    // Calculate due date
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + (billingConfig.payment_terms_days || 30));

    // Create invoice
    const invoice = await base44.asServiceRole.entities.PartnerInvoice.create({
      partner_id: partnerId,
      invoice_number: invoiceNumber,
      billing_period_start: billingPeriodStart.toISOString().split('T')[0],
      billing_period_end: billingPeriodEnd.toISOString().split('T')[0],
      line_items: lineItems,
      subtotal: subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: 'draft',
      due_date: dueDate.toISOString().split('T')[0],
    });

    // Send notification email
    if (billingConfig.billing_email) {
      await base44.integrations.Core.SendEmail({
        to: billingConfig.billing_email,
        subject: `New Invoice ${invoiceNumber}`,
        body: `A new invoice has been generated for ${partner.name}.\n\nInvoice Number: ${invoiceNumber}\nTotal Amount: $${totalAmount.toFixed(2)}\nDue Date: ${dueDate.toLocaleDateString()}\n\nPlease log in to view and download the invoice.\n\nBest regards,\nVivid BMS`,
      });
    }

    return Response.json({ 
      success: true, 
      invoice: invoice,
      message: 'Invoice generated successfully' 
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    return Response.json({ 
      error: error.message || 'Failed to generate invoice' 
    }, { status: 500 });
  }
});