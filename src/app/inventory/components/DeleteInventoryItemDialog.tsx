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
import { deleteInventoryItem } from '@/lib/actions';
import { type ReactNode, useState } from 'react';

type DeleteInventoryItemDialogProps = {
  itemId: string;
  itemName: string;
  children: ReactNode;
};

export function DeleteInventoryItemDialog({
  itemId,
  itemName,
  children,
}: DeleteInventoryItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteInventoryItem(itemId);
      toast({
        title: 'Ingredient Deleted',
        description: `"${itemName}" has been successfully deleted.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete ingredient. Please try again.',
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
            ingredient "{itemName}" from your inventory.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
