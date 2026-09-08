import { ASSET_CATEGORIES } from '@/components/categories/assetCategories';

// Maps each asset_main_category to its AI PDF extractor + theme accent + drop-zone label.
// Sub-categories inherit the parent main category's extractor.
// Categories not listed fall back to the generic extractor.
export const CATEGORY_IMPORT_CONFIG = {
  fire_life_safety: {
    fn: 'extractAFSSAssets',
    accent: '#e53e3e',
    iconBg: '#FEE2E2',
    dropLabel: 'AFSS / fire safety register PDF',
    hint: 'The AI extracts fire safety equipment, matches existing assets, links this document, and creates compliance records + work orders for deficiencies.'
  },
  mechanical_services: {
    fn: 'extractAsBuiltAssets',
    assetCategoryParam: 'mechanical',
    accent: '#0891b2',
    iconBg: '#CFFAFE',
    dropLabel: 'as-built mechanical register PDF',
    hint: 'The AI extracts mechanical plant & equipment, matches existing assets, and links this document to each asset.'
  },
  electrical_services: {
    fn: 'extractAsBuiltAssets',
    assetCategoryParam: 'electrical',
    accent: '#ca8a04',
    iconBg: '#FEF3C7',
    dropLabel: 'as-built electrical register PDF',
    hint: 'The AI extracts electrical assets, matches existing assets, and links this document to each asset.'
  },
  hydraulic_plumbing: {
    fn: 'extractAsBuiltAssets',
    assetCategoryParam: 'plumbing',
    accent: '#2563eb',
    iconBg: '#DBEAFE',
    dropLabel: 'as-built hydraulic / plumbing register PDF',
    hint: 'The AI extracts hydraulic & plumbing assets, matches existing assets, and links this document to each asset.'
  },
  vertical_transportation: {
    fn: 'extractLiftRegistrationData',
    accent: '#7c3aed',
    iconBg: '#EDE9FE',
    dropLabel: 'lift plant registration certificate PDF',
    hint: 'The AI extracts lift assets, matches existing ones, links this document, and creates renewal maintenance schedules + compliance records.'
  }
};

export const DEFAULT_CATEGORY_IMPORT = {
  fn: 'extractGenericAssets',
  accent: '#334155',
  iconBg: '#E2E8F0',
  dropLabel: 'asset register document PDF',
  hint: 'The AI extracts assets from the document, matches existing ones (no duplicates), and links this document to each asset.',
  isGeneric: true
};

export function getCategoryImportConfig(mainCategory) {
  return CATEGORY_IMPORT_CONFIG[mainCategory] || { ...DEFAULT_CATEGORY_IMPORT, accent: '#334155', iconBg: '#E2E8F0' };
}

// Categories with inspection-style compliance data — always show the Compliance Barometer.
export const INSPECTION_CATEGORIES = ['fire_life_safety', 'electrical_services', 'vertical_transportation'];

// Builds the backend invoke params for a category import, given the active sub-category.
export function buildImportParams(cfg, { file_url, buildingId, documentId, fileName, mainCategory, subcategory }) {
  const params = { file_url, buildingId, documentId, fileName };
  if (cfg.assetCategoryParam) params.assetCategory = cfg.assetCategoryParam;
  if (cfg.isGeneric) {
    params.assetCategory = mainCategory;
    params.categoryLabel = ASSET_CATEGORIES[mainCategory]?.label || mainCategory;
    params.subcategories = ASSET_CATEGORIES[mainCategory]?.subcategories || [];
    if (subcategory) params.subcategory = subcategory;
  }
  return params;
}