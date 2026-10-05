import React from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function WorkOrderAssetField({ formData, setFormData }) {
  const { building_id, main_category, asset_id } = formData;
  const enabled = Boolean(building_id && main_category);
  // This paged query has its own cache; Operations Center's asset overview
  // must not supply a different result shape to the work-order selector.
  const { data, isPending, isError, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['workOrderAssetOptions', building_id, main_category],
    enabled,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) => base44.entities.Asset.filter(
      { building_id, asset_main_category: main_category },
      { sort: 'name', limit: 50, fields: ['name', 'asset_type'], ...(pageParam ? { cursor: pageParam } : {}) }
    ),
    getNextPageParam: page => page.has_more ? page.next_cursor : undefined,
  });
  const assets = data?.pages.flatMap(page => page.items) || [];
  const selectionLoaded = assets.some(asset => asset.id === asset_id);
  const { data: selectedAsset } = useQuery({
    queryKey: ['workOrderSelectedAsset', asset_id],
    queryFn: () => base44.entities.Asset.get(asset_id),
    enabled: enabled && Boolean(asset_id) && !selectionLoaded,
  });
  const loading = enabled && isPending;
  const placeholder = !enabled ? 'Select building and main category first' : loading ? 'Loading assets...' : assets.length ? 'Select asset' : 'No assets available';
  return <div>
    <Label htmlFor="asset_id" className="text-sm font-semibold">Linked Asset (optional)</Label>
    <select id="asset_id" value={asset_id || ''} disabled={!enabled || loading || isError}
      onChange={(event) => { const value = event.target.value; setFormData(previous => previous.asset_id === value ? previous : { ...previous, asset_id: value }); }}
      className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50">
      <option value="">{asset_id ? 'No linked asset' : placeholder}</option>
      {asset_id && !selectionLoaded && <option value={asset_id}>{selectedAsset?.name || 'Linked asset'}</option>}
      {assets.map(asset => <option key={asset.id} value={asset.id}>{asset.name} ({asset.asset_type})</option>)}
    </select>
    {isError && <p role="alert" className="mt-2 text-sm text-destructive">Assets could not be loaded. Reselect the category to try again.</p>}
    {hasNextPage && <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
      {isFetchingNextPage ? 'Loading assets...' : 'Load more assets'}
    </Button>}
  </div>;
}