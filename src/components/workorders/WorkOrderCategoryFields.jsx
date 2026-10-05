import React from 'react';
import { Label } from '@/components/ui/label';
import { ASSET_CATEGORIES, formatSubcategoryLabel, getSubcategories } from '@/components/categories/assetCategories';

export default function WorkOrderCategoryFields({ formData, setFormData }) {
  const changeCategory = (event) => {
    const main_category = event.target.value;
    setFormData(previous => previous.main_category === main_category ? previous : {
      ...previous, main_category, subcategory: '', asset_id: ''
    });
  };
  // Native controls keep dependent option changes out of portalled dropdowns
  // and avoid their hidden form-control option registration/change feedback.
  return <>
    <div>
      <Label htmlFor="main_category" className="text-sm font-semibold">Main Category *</Label>
      <select id="main_category" value={formData.main_category || ''} onChange={changeCategory}
        className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
        <option value="" disabled>Select main category</option>
        {Object.entries(ASSET_CATEGORIES).map(([value, category]) => <option key={value} value={value}>{category.label}</option>)}
      </select>
    </div>
    <div>
      <Label htmlFor="subcategory" className="text-sm font-semibold">Sub-Category</Label>
      <select id="subcategory" value={formData.subcategory || ''} disabled={!formData.main_category}
        onChange={(event) => { const subcategory = event.target.value; setFormData(previous => ({ ...previous, subcategory })); }}
        className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
        <option value="">{formData.main_category ? 'Select sub-category' : 'Select main category first'}</option>
        {getSubcategories(formData.main_category).map(value => <option key={value} value={value}>{formatSubcategoryLabel(value)}</option>)}
      </select>
    </div>
  </>;
}