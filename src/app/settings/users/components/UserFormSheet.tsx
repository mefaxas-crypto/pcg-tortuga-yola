
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
import type { AppUser } from '@/lib/types';
import { UserRoles } from '@/lib/validations';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const formSchema = z.object({
  role: z.enum(UserRoles),
});

type UserFormSheetProps = {
  open: boolean;
  user?: AppUser;
  onClose: () => void;
};

const roleDescriptions: Record<AppUser['role'], string> = {
    Admin: 'Superuser with unrestricted access to all features, including user management and system settings.',
    Manager: 'Can manage all operational aspects like inventory, purchasing, and reports, but cannot manage recipes, menus or users.',
    Chef: 'Can manage recipes, menus, and create ingredients. Has access to most operational features.',
    User: 'Standard operator role for daily tasks: logging sales, physical counts, creating POs, and logging production.',
    Supervisor: 'This role is being phased out in favor of the more distinct Manager and Chef roles.',
    Pending: 'New user who cannot access any part of the application until their role is changed by an Admin.',
}

export function UserFormSheet({
  open,
  user,
  onClose,
}: UserFormSheetProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'User',
    },
  });

  useEffect(() => {
    if (open && user) {
        form.reset({
            role: user.role
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
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { role: values.role });
        toast({
            title: 'User Updated',
            description: `${user.displayName}'s role has been set to ${values.role}.`,
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
            className="grid gap-4 py-4"
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
                      {UserRoles.filter(r => r !== 'Supervisor').map(role => (
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
