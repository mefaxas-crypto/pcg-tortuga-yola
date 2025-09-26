
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import type { AppUser, Outlet } from '@/lib/types';
import { doc, updateDoc, collection, query, where } from 'firebase/firestore';
import { useFirebase, useCollection } from '@/firebase';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  role: z.enum(['Admin', 'Manager', 'Chef', 'Clerk', 'Cook', 'Pending']),
  outletId: z.string().optional(),
});

type UserFormSheetProps = {
  open: boolean;
  user?: AppUser;
  onClose: () => void;
};

const roles: AppUser['role'][] = ['Admin', 'Manager', 'Chef', 'Clerk', 'Cook', 'Pending'];

export function UserFormSheet({
  open,
  user,
  onClose,
}: UserFormSheetProps) {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const outletsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'outlets'), where('userId', '==', user.uid));
  }, [firestore, user]);

  const { data: outlets } = useCollection<Outlet>(outletsQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'Pending',
      outletId: '',
    },
  });

  const selectedRole = form.watch('role');

  useEffect(() => {
    if (open && user) {
        form.reset({
            role: user.role,
            outletId: user.outletId || '',
        });
    }
  }, [user, open, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ variant: 'destructive', title: 'No user selected' });
        return;
    }
    setLoading(true);
    try {
        const userRef = doc(firestore, 'users', user.uid);
        await updateDoc(userRef, {
            role: values.role,
            outletId: values.outletId || null,
        });
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
             <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                            {role}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            {(selectedRole === 'Clerk' || selectedRole === 'Cook') && (
                 <FormField
                    control={form.control}
                    name="outletId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Assign to Outlet</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an outlet" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {(outlets || []).map((outlet) => (
                                <SelectItem key={outlet.id} value={outlet.id}>
                                {outlet.name}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
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
