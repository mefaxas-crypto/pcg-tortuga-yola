

'use client';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import type { AppUser } from '@/lib/types';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

const formSchema = z.object({});

type UserFormSheetProps = {
  open: boolean;
  user?: AppUser;
  onClose: () => void;
};

export function UserFormSheet({
  open,
  user,
  onClose,
}: UserFormSheetProps) {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (open && user) {
        form.reset({});
    }
  }, [user, open, form]);

  async function onSubmit() {
    if (!user) {
        toast({ variant: 'destructive', title: 'No user selected' });
        return;
    }
    setLoading(true);
    try {
        const userRef = doc(firestore, 'users', user.uid);
        // No role or outlet assignment to update
        await updateDoc(userRef, {});
        toast({
            title: 'User Updated',
            description: `${user.displayName} has been updated.`,
        });
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update user. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            Edit User
          </SheetTitle>
          <SheetDescription>
            Update user details for {user?.displayName}.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-6 py-4"
          >
            <p className="text-sm text-muted-foreground">
              All users now have the same permissions.
            </p>
            <SheetFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
