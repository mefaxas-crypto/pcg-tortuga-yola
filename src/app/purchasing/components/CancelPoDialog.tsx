
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
import { cancelPurchaseOrder } from '@/lib/actions';
import { type ReactNode, useState } from 'react';

type CancelPoDialogProps = {
  poId: string;
  poNumber: string;
  children: ReactNode;
};

export function CancelPoDialog({
  poId,
  poNumber,
  children,
}: CancelPoDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleCancel() {
    setLoading(true);
    try {
      await cancelPurchaseOrder(poId);
      toast({
        title: 'Purchase Order Cancelled',
        description: `PO #${poNumber} has been successfully cancelled.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel the purchase order. Please try again.',
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
            This action will cancel the Purchase Order #{poNumber}. You cannot undo this.
            The PO will be moved to your history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} disabled={loading} className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
            {loading ? 'Cancelling...' : 'Yes, Cancel PO'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
