
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
import { deleteButcheryTemplate } from '@/lib/actions';
import { type ReactNode, useState } from 'react';

type DeleteTemplateDialogProps = {
  templateId: string;
  templateName: string;
  children: ReactNode;
};

export function DeleteTemplateDialog({
  templateId,
  templateName,
  children,
}: DeleteTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteButcheryTemplate(templateId);
      toast({
        title: 'Template Deleted',
        description: `"${templateName}" has been successfully deleted.`,
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete template. Please try again.',
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
            template "{templateName}".
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
