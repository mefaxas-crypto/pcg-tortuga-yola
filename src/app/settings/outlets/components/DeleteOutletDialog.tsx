
'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { deleteOutlet } from '@/lib/actions';
import { type ReactNode, useState } from 'react';
import { useOutletContext } from '@/context/OutletContext';

type DeleteOutletDialogProps = {
  outletId: string;
  outletName: string;
  children: ReactNode;
};

export function DeleteOutletDialog({
  outletId,
  outletName,
  children,
}: DeleteOutletDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { selectedOutlet, setSelectedOutlet, outlets } = useOutletContext();


  async function handleDelete() {
    setLoading(true);
    try {
      await deleteOutlet(outletId);

      // If the deleted outlet was the selected one, switch to another one
      if (selectedOutlet?.id === outletId) {
        const nextOutlet = outlets.find(o => o.id !== outletId);
        setSelectedOutlet(nextOutlet || null);
      }

      toast({
        title: 'Outlet Deleted',
        description: `"${outletName}" has been successfully deleted.`,
      });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            outlet &quot;{outletName}&quot;. This will also delete all associated stock records for this outlet.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
            {loading ? 'Deleting...' : 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
