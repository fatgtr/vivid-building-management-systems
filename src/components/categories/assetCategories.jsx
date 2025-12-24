import { 
  Building, 
  Wind, 
  Zap, 
  Flame, 
  Building2,
  Droplet,
  Shield,
  Wifi,
  Gauge,
  TreePine,
  Sofa,
  Trash2,
  Car,
  HardHat,
  Briefcase,
  Home,
  FileText
} from 'lucide-react';

export const ASSET_CATEGORIES = {
  'core_building_structure': {
    label: 'Core Building & Structure',
    icon: Building,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
    subcategories: [
      'foundations_and_slabs',
      'structural_columns_and_beams',
      'roof_membranes',
      'roof_drainage',
      'external_walls',
      'internal_walls',
      'cladding_systems',
      'balconies',
      'balustrades',
      'windows',
      'external_doors',
      'internal_fire_rated_doors',
      'basement_structures',
      'expansion_joints',
      'waterproofing_systems'
    ]
  },
  'mechanical_services': {
    label: 'Mechanical Services',
    icon: Wind,
    color: 'text-cyan-600 bg-cyan-50 border-cyan-200',
    subcategories: [
      'air_conditioning_plant',
      'split_systems',
      'vrf_vrv_systems',
      'chillers',
      'boilers',
      'cooling_towers',
      'mechanical_ventilation',
      'toilet_exhaust',
      'car_park_exhaust',
      'stair_pressurisation',
      'mechanical_pumps',
      'plant_room_equipment'
    ]
  },
  'electrical_services': {
    label: 'Electrical Services',
    icon: Zap,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    subcategories: [
      'main_switchboard',
      'sub_main_boards',
      'distribution_boards',
      'electrical_metering',
      'lighting_circuits',
      'common_area_lighting',
      'emergency_lighting',
      'exit_signage',
      'solar_systems',
      'inverters',
      'backup_generators',
      'ups_systems'
    ]
  },
  'fire_life_safety': {
    label: 'Fire & Life Safety',
    icon: Flame,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    subcategories: [
      'fire_indicator_panel',
      'smoke_detectors',
      'heat_detectors',
      'manual_call_points',
      'fire_sprinklers',
      'hydrants',
      'hose_reels',
      'fire_extinguishers',
      'fire_doors',
      'fire_shutters',
      'ewis',
      'smoke_exhaust',
      'fire_stairs_pressurisation'
    ]
  },
  'vertical_transportation': {
    label: 'Vertical Transportation',
    icon: Building2,
    color: 'text-purple-600 bg-purple-50 border-purple-200',
    subcategories: [
      'passenger_lifts',
      'service_lifts',
      'goods_lifts',
      'car_lifts',
      'disabled_access_lifts'
    ]
  },
  'hydraulic_plumbing': {
    label: 'Hydraulic & Plumbing',
    icon: Droplet,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    subcategories: [
      'cold_water_supply',
      'hot_water_plant',
      'gas_supply',
      'sewer_systems',
      'stormwater_systems',
      'trade_waste',
      'grease_traps',
      'pumps',
      'water_tanks',
      'backflow_devices'
    ]
  },
  'security_access_control': {
    label: 'Security & Access Control',
    icon: Shield,
    color: 'text-red-600 bg-red-50 border-red-200',
    subcategories: [
      'access_control_panels',
      'card_readers',
      'keypads',
      'intercom_systems',
      'cctv_cameras',
      'recording_equipment',
      'alarm_systems',
      'roller_doors',
      'boom_gates'
    ]
  },
  'communications_it': {
    label: 'Communications & IT',
    icon: Wifi,
    color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    subcategories: [
      'mdf_rooms',
      'idf_rooms',
      'data_cabling',
      'nbn_infrastructure',
      'matv_systems',
      'smatv_systems',
      'wi_fi_systems'
    ]
  },
  'building_management_systems': {
    label: 'Building Management Systems',
    icon: Gauge,
    color: 'text-teal-600 bg-teal-50 border-teal-200',
    subcategories: [
      'bms_controllers',
      'sensors',
      'energy_monitoring',
      'lighting_controls',
      'hvac_controls'
    ]
  },
  'external_grounds': {
    label: 'External & Grounds',
    icon: TreePine,
    color: 'text-green-600 bg-green-50 border-green-200',
    subcategories: [
      'landscaping',
      'irrigation',
      'external_lighting',
      'fencing',
      'gates',
      'pavements',
      'driveways',
      'retaining_walls'
    ]
  },
  'common_area_fixtures_fittings': {
    label: 'Common Area Fixtures & Fittings',
    icon: Sofa,
    color: 'text-amber-600 bg-amber-50 border-amber-200',
    subcategories: [
      'furniture',
      'signage',
      'mailboxes',
      'notice_boards',
      'storage_cages',
      'bike_racks'
    ]
  },
  'waste_management': {
    label: 'Waste Management',
    icon: Trash2,
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    subcategories: [
      'bin_rooms',
      'garbage_compactors',
      'recycling_equipment',
      'bin_lifters',
      'waste_chutes'
    ]
  },
  'parking_traffic': {
    label: 'Parking & Traffic',
    icon: Car,
    color: 'text-gray-600 bg-gray-50 border-gray-200',
    subcategories: [
      'line_marking',
      'speed_humps',
      'traffic_mirrors',
      'bollards',
      'parking_equipment'
    ]
  },
  'compliance_safety': {
    label: 'Compliance & Safety',
    icon: HardHat,
    color: 'text-orange-600 bg-orange-50 border-orange-200',
    subcategories: [
      'anchor_points',
      'abseil_systems',
      'ladders',
      'guardrails',
      'safety_signage'
    ]
  },
  'commercial_specific': {
    label: 'Commercial Specific',
    icon: Briefcase,
    color: 'text-violet-600 bg-violet-50 border-violet-200',
    subcategories: [
      'commercial_exhaust',
      'kitchen_hoods',
      'grease_ducts',
      'loading_docks',
      'dock_levellers'
    ]
  },
  'residential_specific': {
    label: 'Residential Specific',
    icon: Home,
    color: 'text-pink-600 bg-pink-50 border-pink-200',
    subcategories: [
      'pools',
      'spas',
      'gym_equipment',
      'bbq_equipment',
      'shared_laundries'
    ]
  },
  'documentation_registers': {
    label: 'Documentation & Registers',
    icon: FileText,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    subcategories: [
      'asset_register',
      'maintenance_schedules',
      'afss_records',
      'certificates',
      'warranties',
      'manuals'
    ]
  }
};

// Helper function to get formatted subcategory label
export const formatSubcategoryLabel = (subcategory) => {
  return subcategory
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper function to get all main categories as array
export const getMainCategories = () => {
  return Object.keys(ASSET_CATEGORIES);
};

// Helper function to get subcategories for a main category
export const getSubcategories = (mainCategory) => {
  return ASSET_CATEGORIES[mainCategory]?.subcategories || [];
};