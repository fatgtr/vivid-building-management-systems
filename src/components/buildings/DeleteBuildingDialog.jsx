import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export default function DeleteBuildingDialog({ building, mutation, onCancel }) {
  const handleOpenChange = (open) => {
    if (!open && !mutation.isPending) {
      mutation.reset();
      onCancel();
    }
  };
  const handleConfirm = (event) => {
    event.preventDefault();
    if (building?.id && !mutation.isPending) mutation.mutate(building.id);
  };

  return (
    <AlertDialog open={!!building} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Building & All Data</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p className="font-semibold text-destructive">Are you sure you want to delete "{building?.name}"?</p>
              <p className="text-sm">This will permanently delete:</p>
              <ul className="text-sm list-disc list-inside space-y-1 text-muted-foreground">
                <li>All units in this building</li>
                <li>All resident information</li>
                <li>All work orders and maintenance schedules</li>
                <li>All documents and announcements</li>
                <li>All inspections and visitor logs</li>
                <li>All amenities and bookings</li>
              </ul>
              <p className="text-sm font-semibold text-destructive mt-2">This action cannot be undone.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={mutation.isPending || !building?.id} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {mutation.isPending ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}