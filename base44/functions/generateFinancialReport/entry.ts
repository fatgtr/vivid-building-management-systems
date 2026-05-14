import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@2.5.2';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { buildingId, reportType, startDate, endDate } = await req.json();

    // Fetch data
    const levies = await base44.asServiceRole.entities.LevyPayment.filter(
      buildingId ? { building_id: buildingId } : {}
    );
    const workOrders = await base44.asServiceRole.entities.WorkOrder.filter(
      buildingId ? { building_id: buildingId } : {}
    );
    const building = buildingId ? await base44.asServiceRole.entities.Building.get(buildingId) : null;

    // Filter by date range
    const filteredLevies = levies.filter(l => {
      const date = new Date(l.due_date);
      return (!startDate || date >= new Date(startDate)) && (!endDate || date <= new Date(endDate));
    });

    const filteredWO = workOrders.filter(wo => {
      const date = new Date(wo.created_date);
      return (!startDate || date >= new Date(startDate)) && (!endDate || date <= new Date(endDate));
    });

    // Calculate metrics
    const totalLevies = filteredLevies.reduce((sum, l) => sum + l.amount, 0);
    const paidLevies = filteredLevies.filter(l => l.status === 'paid').reduce((sum, l) => sum + l.amount, 0);
    const outstanding = totalLevies - paidLevies;
    const maintenanceCosts = filteredWO.filter(wo => wo.actual_cost).reduce((sum, wo) => sum + wo.actual_cost, 0);

    // Generate PDF
    const doc = new jsPDF();

    // Title
    doc.setFontSize(20);
    doc.text('Financial Report', 20, 20);

    if (building) {
      doc.setFontSize(12);
      doc.text(building.name, 20, 30);
    }

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 40);
    if (startDate && endDate) {
      doc.text(`Period: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`, 20, 46);
    }

    // Summary section
    doc.setFontSize(14);
    doc.text('Financial Summary', 20, 60);

    doc.setFontSize(10);
    let y = 70;
    doc.text(`Total Levies Issued: $${totalLevies.toFixed(2)}`, 30, y);
    y += 8;
    doc.text(`Levies Collected: $${paidLevies.toFixed(2)}`, 30, y);
    y += 8;
    doc.text(`Outstanding: $${outstanding.toFixed(2)}`, 30, y);
    y += 8;
    doc.text(`Collection Rate: ${((paidLevies / totalLevies) * 100 || 0).toFixed(1)}%`, 30, y);
    y += 12;
    doc.text(`Maintenance Costs: $${maintenanceCosts.toFixed(2)}`, 30, y);

    // Levy breakdown
    y += 20;
    doc.setFontSize(14);
    doc.text('Levy Payments', 20, y);

    y += 10;
    doc.setFontSize(9);
    doc.text('Period', 20, y);
    doc.text('Amount', 80, y);
    doc.text('Status', 130, y);
    doc.text('Due Date', 160, y);

    y += 6;
    filteredLevies.slice(0, 20).forEach((levy) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(levy.period || 'N/A', 20, y);
      doc.text(`$${levy.amount.toFixed(2)}`, 80, y);
      doc.text(levy.status, 130, y);
      doc.text(new Date(levy.due_date).toLocaleDateString(), 160, y);
      y += 8;
    });

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=financial-report-${Date.now()}.pdf`
      }
    });
  } catch (error) {
    console.error('Report generation failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});