import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all assets with warranty expiry dates
    const assets = await base44.asServiceRole.entities.Asset.list();
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const expiringAssets = assets.filter(asset => {
      if (!asset.warranty_expiry_date) return false;
      const expiryDate = new Date(asset.warranty_expiry_date);
      return expiryDate >= today && expiryDate <= ninetyDaysFromNow;
    });

    const notifications = [];

    for (const asset of expiringAssets) {
      const expiryDate = new Date(asset.warranty_expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      // Get building details for notification
      const building = await base44.entities.Building.get(asset.building_id);
      
      let urgency = 'info';
      if (daysUntilExpiry <= 30) urgency = 'urgent';
      else if (daysUntilExpiry <= 60) urgency = 'high';
      
      // Send email notification
      if (building.manager_email) {
        await base44.integrations.Core.SendEmail({
          to: building.manager_email,
          subject: `Asset Warranty Expiring Soon - ${asset.name}`,
          body: `Asset warranty is expiring in ${daysUntilExpiry} days:

Asset: ${asset.name}
Type: ${asset.asset_type}
Location: ${asset.location || 'Not specified'}
Building: ${building.name}
Warranty Expiry: ${new Date(asset.warranty_expiry_date).toLocaleDateString()}

Please review and arrange renewal or replacement if necessary.`
        });
      }

      notifications.push({
        asset_id: asset.id,
        asset_name: asset.name,
        building_name: building.name,
        days_until_expiry: daysUntilExpiry,
        urgency
      });
    }

    return Response.json({ 
      success: true,
      notifications_sent: notifications.length,
      expiring_assets: notifications
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});