

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import type { AppUser, Outlet } from '@/lib/types';
import { UserRoles } from '@/lib/validations';
import { doc, updateDoc, collection, query } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';

const formSchema = z.object({
  role: z.enum(UserRoles),
  assignedOutletId: z.string().optional(),
}).refine((data) => {
    if ((data.role === 'Clerk' || data.role === 'Cook') && !data.assignedOutletId) {
        return false;
    }
    return true;
}, {
    message: 'An outlet must be assigned for Clerk and Cook roles.',
    path: ['assignedOutletId'],
});

type UserFormSheetProps = {
  open: boolean;
  user?: AppUser;
  onClose: () => void;
};

const roleDescriptions: Record<AppUser['role'], string> = {
    Admin: 'Superuser with unrestricted access to all features, including user management and system settings.',
    Manager: 'High-level operator. Can do everything an Admin can do except manage users and core application settings. They can create ingredients, manage suppliers, handle all purchasing, run reports, and approve actions. They cannot manage recipes or menus.',
    Chef: 'The recipe and menu expert. Can create/edit recipes, menus, and ingredients. Also handles all production and butchering logs.',
    Clerk: 'Administrative staff role. Can log sales, manage suppliers, create ingredients, and handle the full purchasing workflow (creating and receiving POs). They cannot log production or manage recipes/menus.',
    Cook: 'Kitchen staff role. Can log sub-recipe production, log butchering, perform physical inventory counts, and create/receive POs. They cannot log sales or create master ingredients/suppliers.',
    Pending: 'New user who cannot access any part of the application until their role is changed by an Admin.',
}

export function UserFormSheet({
  open,
  user,
  onClose,
}: UserFormSheetProps) {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const outletsQuery = useMemoFirebase(() => query(collection(firestore, 'outlets')), [firestore]);
  const { data: outletsData } = useCollection<Outlet>(outletsQuery);
  const outlets = (outletsData || []).sort((a,b) => a.name.localeCompare(b.name));

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'Cook',
      assignedOutletId: '',
    },
  });

  useEffect(() => {
    if (open && user) {
        form.reset({
            role: user.role,
            assignedOutletId: user.assignedOutletId || '',
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
        const dataToUpdate: Partial<AppUser> = { role: values.role };
        if (values.role === 'Clerk' || values.role === 'Cook') {
            dataToUpdate.assignedOutletId = values.assignedOutletId;
        } else {
            dataToUpdate.assignedOutletId = ''; // Remove assignment for other roles
        }

        await updateDoc(userRef, dataToUpdate);
        toast({
            title: 'User Updated',
            description: `${user.displayName}'s role and assignment have been updated.`,
        });
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to update user role. Please try again.`,
      });
    } finally {
      setLoading(false);
    }
  }

  const selectedRole = form.watch('role');
  const showOutletAssignment = selectedRole === 'Clerk' || selectedRole === 'Cook';

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            Edit User Role
          </SheetTitle>
          <SheetDescription>
            Change the role for {user?.displayName}. This will affect their permissions across the app.
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
                      {UserRoles.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedRole && (
                    <FormDescription>
                        {roleDescriptions[selectedRole]}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            {showOutletAssignment && (
                <>
                    <Separator />
                     <FormField
                        control={form.control}
                        name="assignedOutletId"
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
                                {outlets.map(outlet => (
                                    <SelectItem key={outlet.id} value={outlet.id}>{outlet.name}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                             <FormDescription>
                                This user will only have access to this specific outlet.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
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
