
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
import { undoButcheringLog } from '@/lib/actions';
import { type ReactNode, useState } from 'react';
import { format } from 'date-fns';

type UndoButcheringLogDialogProps = {
  logId: string;
  logDate: Date;
  children: ReactNode;
};

export function UndoButcheringLogDialog({
  logId,
  logDate,
  children,
}: UndoButcheringLogDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleUndo() {
    setLoading(true);
    try {
      await undoButcheringLog(logId);
      toast({
        title: 'Butchering Undone',
        description: `The butchering log from ${format(logDate, 'P p')} has been reversed.`,
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
            This will reverse the inventory changes made by the butchering log from {' '}
            <span className='font-medium'>{format(logDate, 'P p')}</span>. The primary item will be returned to stock, and the yielded items will be depleted. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUndo} disabled={loading}>
            {loading ? 'Reversing...' : 'Continue'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
