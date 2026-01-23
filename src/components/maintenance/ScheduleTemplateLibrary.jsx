import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, Plus } from 'lucide-react';
import { toast } from 'sonner';

const SCHEDULE_TEMPLATES = {
  structural_components: [
    { item: 'Steel beams', frequency: 'yearly', type: 'inspection', description: 'Inspect for corrosion, cracks, and structural integrity', cost: 500 },
    { item: 'Concrete slabs', frequency: 'yearly', type: 'inspection', description: 'Check for cracks, spalling, and water damage', cost: 400 },
    { item: 'Elevator shafts', frequency: 'half_yearly', type: 'inspection', description: 'Inspect structural components and safety systems', cost: 600 }
  ],
  fire_safety_systems: [
    { item: 'Fire extinguishers', frequency: 'yearly', type: 'both', description: 'Annual inspection and servicing as per AS1851', cost: 50 },
    { item: 'Smoke detectors', frequency: 'half_yearly', type: 'both', description: 'Test and clean smoke detectors', cost: 30 },
    { item: 'Fire alarms', frequency: 'half_yearly', type: 'both', description: 'Test alarm system and battery backup', cost: 200 },
    { item: 'Fire doors', frequency: 'yearly', type: 'inspection', description: 'Inspect seals, hinges, and closing mechanisms', cost: 150 },
    { item: 'Hydrant systems', frequency: 'yearly', type: 'both', description: 'Pressure test and flow test as per AS2419', cost: 800 }
  ],
  hvac: [
    { item: 'HVAC units', frequency: 'quarterly', type: 'both', description: 'Clean filters, check refrigerant, inspect electrical connections', cost: 250 },
    { item: 'Cooling towers', frequency: 'monthly', type: 'both', description: 'Water treatment, clean basin, check water levels', cost: 400 },
    { item: 'Ductwork', frequency: 'yearly', type: 'inspection', description: 'Inspect for leaks, blockages, and clean as needed', cost: 600 }
  ],
  plumbing_system: [
    { item: 'Water heaters', frequency: 'yearly', type: 'both', description: 'Check anode rod, flush tank, inspect safety valves', cost: 200 },
    { item: 'Backflow prevention systems', frequency: 'yearly', type: 'both', description: 'Test and certify backflow prevention devices', cost: 300 },
    { item: 'Tempering valves', frequency: 'yearly', type: 'both', description: 'Test temperature and pressure relief valves', cost: 150 },
    { item: 'Pumps and pits', frequency: 'quarterly', type: 'inspection', description: 'Inspect sump pumps and drainage pits', cost: 100 }
  ],
  electrical_system: [
    { item: 'Switchboards', frequency: 'yearly', type: 'inspection', description: 'Thermal imaging and electrical testing', cost: 500 },
    { item: 'Emergency lighting', frequency: 'half_yearly', type: 'both', description: 'Test emergency lights and exit signs', cost: 150 },
    { item: 'Solar panels', frequency: 'yearly', type: 'both', description: 'Clean panels, check inverter, test performance', cost: 400 },
    { item: 'EV charging stations', frequency: 'half_yearly', type: 'inspection', description: 'Inspect connections, test charging functionality', cost: 200 }
  ],
  elevators_escalators_travelators: [
    { item: 'Elevator cabins', frequency: 'monthly', type: 'both', description: 'Monthly maintenance as per manufacturer requirements', cost: 800 },
    { item: 'Elevator control system', frequency: 'quarterly', type: 'inspection', description: 'Test safety systems and emergency protocols', cost: 400 }
  ],
  landscaping_exterior: [
    { item: 'Swimming pool', frequency: 'weekly', type: 'both', description: 'Test water chemistry, clean filters, vacuum', cost: 150 },
    { item: 'Pool equipment', frequency: 'monthly', type: 'inspection', description: 'Check pumps, filters, and chlorination systems', cost: 200 },
    { item: 'Irrigation systems', frequency: 'monthly', type: 'inspection', description: 'Check sprinklers, timers, and water flow', cost: 100 },
    { item: 'Landscaping', frequency: 'weekly', type: 'maintenance', description: 'Mowing, trimming, weeding, and general upkeep', cost: 300 }
  ],
  roofing: [
    { item: 'Roofing materials', frequency: 'yearly', type: 'inspection', description: 'Inspect for damage, wear, and potential leaks', cost: 350 },
    { item: 'Roof safety systems', frequency: 'yearly', type: 'inspection', description: 'Test anchor points and safety equipment', cost: 250 }
  ],
  car_parking_area: [
    { item: 'Boom gates', frequency: 'quarterly', type: 'both', description: 'Lubricate, test sensors, check operation', cost: 200 },
    { item: 'Car park lighting', frequency: 'quarterly', type: 'inspection', description: 'Replace failed lights, check emergency lighting', cost: 150 }
  ]
};

const CATEGORY_LABELS = {
  structural_components: 'Structural Components',
  fire_safety_systems: 'Fire Safety Systems',
  hvac: 'HVAC',
  plumbing_system: 'Plumbing System',
  electrical_system: 'Electrical System',
  elevators_escalators_travelators: 'Elevators & Escalators',
  landscaping_exterior: 'Landscaping & Exterior',
  roofing: 'Roofing',
  car_parking_area: 'Car Parking Area'
};

export default function ScheduleTemplateLibrary({ buildingId, onTemplateApplied }) {
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [applying, setApplying] = useState(false);

  const toggleTemplate = (category, template) => {
    const key = `${category}:${template.item}`;
    setSelectedTemplates(prev => 
      prev.includes(key) 
        ? prev.filter(t => t !== key)
        : [...prev, key]
    );
  };

  const applyTemplates = async () => {
    if (selectedTemplates.length === 0) {
      toast.error('Please select at least one template');
      return;
    }

    setApplying(true);
    try {
      const schedulesToCreate = [];
      
      selectedTemplates.forEach(key => {
        const [category, itemName] = key.split(':');
        const template = SCHEDULE_TEMPLATES[category].find(t => t.item === itemName);
        
        if (template) {
          const now = new Date();
          schedulesToCreate.push({
            building_id: buildingId,
            category,
            item_name: template.item,
            subject: `${template.item} - ${template.type === 'both' ? 'Maintenance & Inspection' : template.type}`,
            description: template.description,
            maintenance_type: template.type,
            recurrence: template.frequency,
            scheduled_date: now.toISOString().split('T')[0],
            next_due_date: now.toISOString().split('T')[0],
            estimated_cost: template.cost,
            status: 'active',
            from_nsw_initial_schedule: false
          });
        }
      });

      await base44.entities.MaintenanceSchedule.bulkCreate(schedulesToCreate);
      
      toast.success(`${schedulesToCreate.length} maintenance schedules created`);
      setSelectedTemplates([]);
      
      if (onTemplateApplied) {
        onTemplateApplied();
      }
    } catch (error) {
      console.error('Template application error:', error);
      toast.error('Failed to apply templates: ' + error.message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Schedule Templates</CardTitle>
        <CardDescription>
          Pre-configured maintenance schedules based on NSW strata requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fire_safety_systems" className="w-full">
          <ScrollArea className="w-full whitespace-nowrap">
            <TabsList className="inline-flex w-max">
              {Object.keys(SCHEDULE_TEMPLATES).map(category => (
                <TabsTrigger key={category} value={category} className="text-xs">
                  {CATEGORY_LABELS[category]}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollArea>

          {Object.entries(SCHEDULE_TEMPLATES).map(([category, templates]) => (
            <TabsContent key={category} value={category} className="space-y-2 mt-4">
              {templates.map((template, idx) => {
                const key = `${category}:${template.item}`;
                const isSelected = selectedTemplates.includes(key);
                
                return (
                  <Card 
                    key={idx}
                    className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}
                    onClick={() => toggleTemplate(category, template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{template.item}</h4>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600" />}
                          </div>
                          <p className="text-sm text-slate-600 mb-2">{template.description}</p>
                          <div className="flex gap-2">
                            <Badge variant="outline">{template.frequency}</Badge>
                            <Badge variant="outline">{template.type}</Badge>
                            <Badge variant="outline">${template.cost}</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>
          ))}
        </Tabs>

        {selectedTemplates.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium mb-2">
              {selectedTemplates.length} template{selectedTemplates.length !== 1 ? 's' : ''} selected
            </p>
            <Button onClick={applyTemplates} disabled={applying} className="w-full">
              {applying ? 'Creating Schedules...' : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create {selectedTemplates.length} Schedule{selectedTemplates.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}