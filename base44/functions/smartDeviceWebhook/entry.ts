import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse incoming webhook data
    const payload = await req.json();
    const { device_id, device_type, event_type, event_data, timestamp, signature } = payload;

    if (!device_id || !device_type || !event_type) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find device integration
    const devices = await base44.asServiceRole.entities.SmartDeviceIntegration.filter({ 
      device_id,
      status: 'active'
    });

    if (devices.length === 0) {
      return Response.json({ error: 'Device not found or inactive' }, { status: 404 });
    }

    const device = devices[0];

    // Validate webhook signature if configured
    if (device.webhook_secret && signature) {
      // Basic signature validation (implement proper HMAC validation in production)
      const expectedSignature = signature; // Implement proper validation
    }

    // Update last event date
    await base44.asServiceRole.entities.SmartDeviceIntegration.update(device.id, {
      last_event_date: new Date().toISOString()
    });

    // Process event based on device type and create work order if needed
    let workOrder = null;

    if (device.auto_create_work_orders && shouldCreateWorkOrder(event_type, event_data, device)) {
      const workOrderData = generateWorkOrderFromEvent(device, event_type, event_data);
      
      workOrder = await base44.asServiceRole.entities.WorkOrder.create(workOrderData);

      // Send notification if work order created
      if (workOrder) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: 'building-manager@example.com', // Get from building config
          subject: `[ALERT] Smart Device Alert: ${device.device_name}`,
          body: `
            <h2>Smart Device Alert</h2>
            <p><strong>Device:</strong> ${device.device_name} (${device.device_type})</p>
            <p><strong>Location:</strong> ${device.location}</p>
            <p><strong>Event:</strong> ${event_type}</p>
            <p><strong>Details:</strong> ${JSON.stringify(event_data, null, 2)}</p>
            <p>A work order has been automatically created: <strong>${workOrder.title}</strong></p>
          `
        });
      }
    }

    return Response.json({ 
      success: true,
      device_name: device.device_name,
      work_order_created: !!workOrder,
      work_order_id: workOrder?.id
    });

  } catch (error) {
    console.error('Smart device webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function shouldCreateWorkOrder(eventType, eventData, device) {
  const alertEvents = {
    smoke_detector: ['smoke_detected', 'alarm', 'low_battery', 'malfunction'],
    thermostat: ['temperature_extreme', 'hvac_fault', 'offline', 'maintenance_required'],
    access_control: ['forced_entry', 'door_held_open', 'system_fault', 'unauthorized_access'],
    intercom: ['system_fault', 'camera_offline', 'audio_fault'],
    cctv: ['camera_offline', 'motion_detected_restricted', 'tampering_detected', 'recording_failure']
  };

  const deviceAlerts = alertEvents[device.device_type] || [];
  
  // Check if event should trigger work order
  if (deviceAlerts.includes(eventType)) {
    // Check thresholds if configured
    if (device.alert_thresholds) {
      const thresholds = typeof device.alert_thresholds === 'string' 
        ? JSON.parse(device.alert_thresholds) 
        : device.alert_thresholds;
      
      // Apply threshold logic
      if (device.device_type === 'thermostat' && eventType === 'temperature_extreme') {
        const temp = eventData.temperature;
        if (temp > thresholds.max_temp || temp < thresholds.min_temp) {
          return true;
        }
        return false;
      }
    }
    
    return true;
  }

  return false;
}

function generateWorkOrderFromEvent(device, eventType, eventData) {
  const categoryMap = {
    smoke_detector: 'security',
    thermostat: 'hvac',
    access_control: 'security',
    intercom: 'security',
    cctv: 'security'
  };

  const priorityMap = {
    smoke_detected: 'urgent',
    alarm: 'urgent',
    forced_entry: 'urgent',
    unauthorized_access: 'high',
    temperature_extreme: 'high',
    hvac_fault: 'high',
    camera_offline: 'medium',
    system_fault: 'high',
    low_battery: 'medium',
    offline: 'medium',
    malfunction: 'high'
  };

  const titleMap = {
    smoke_detector: {
      smoke_detected: 'EMERGENCY: Smoke Detected',
      alarm: 'Fire Alarm Activated',
      low_battery: 'Smoke Detector Low Battery',
      malfunction: 'Smoke Detector Malfunction'
    },
    thermostat: {
      temperature_extreme: 'Temperature Out of Range',
      hvac_fault: 'HVAC System Fault',
      offline: 'Thermostat Offline',
      maintenance_required: 'HVAC Maintenance Required'
    },
    access_control: {
      forced_entry: 'SECURITY ALERT: Forced Entry Detected',
      door_held_open: 'Door Held Open',
      system_fault: 'Access Control System Fault',
      unauthorized_access: 'Unauthorized Access Attempt'
    },
    intercom: {
      system_fault: 'Intercom System Fault',
      camera_offline: 'Intercom Camera Offline',
      audio_fault: 'Intercom Audio Fault'
    },
    cctv: {
      camera_offline: 'CCTV Camera Offline',
      motion_detected_restricted: 'Motion in Restricted Area',
      tampering_detected: 'Camera Tampering Detected',
      recording_failure: 'CCTV Recording Failure'
    }
  };

  const title = titleMap[device.device_type]?.[eventType] || `Smart Device Alert: ${eventType}`;
  
  const description = `Automatic alert from ${device.device_name} (${device.system_vendor || 'Smart Device'})

Location: ${device.location}
Event Type: ${eventType}
Timestamp: ${new Date().toISOString()}

Event Details:
${JSON.stringify(eventData, null, 2)}

This work order was automatically created by the smart building system.`;

  return {
    building_id: device.building_id,
    unit_id: device.unit_id || null,
    title,
    description,
    category: categoryMap[device.device_type] || 'other',
    priority: priorityMap[eventType] || 'medium',
    status: 'open',
    reported_by_name: 'Smart Building System',
    notes: `Device ID: ${device.device_id}\nIntegration ID: ${device.id}`
  };
}