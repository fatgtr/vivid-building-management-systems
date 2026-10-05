import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBuildingContext } from '@/components/BuildingContext';
import { toast } from 'sonner';

export default function useDeleteBuilding(onDeleted) {
  const queryClient = useQueryClient();
  const { selectedBuildingId, setSelectedBuildingId } = useBuildingContext();

  return useMutation({
    mutationFn: async (buildingId) => {
      try {
        const { data } = await base44.functions.invoke('deleteBuildingCascade', { buildingId });
        if (data.success !== true) {
          throw new Error(data.error || 'Failed to delete building');
        }
        return data;
      } catch (error) {
        throw new Error(error.response?.data?.error || error.message || 'Failed to delete building');
      }
    },
    onSuccess: async (_, buildingId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['buildings'] }),
        queryClient.invalidateQueries({ queryKey: ['units'] }),
        queryClient.invalidateQueries({ queryKey: ['residents'] }),
        queryClient.invalidateQueries({ queryKey: ['workOrders'] }),
      ]);
      if (selectedBuildingId === buildingId) setSelectedBuildingId(null);
      onDeleted();
      queryClient.removeQueries({ queryKey: ['building', buildingId], exact: true });
      toast.success('Building and all associated data deleted successfully');
    },
  });
}