'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { addSupplier, editSupplier } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { Supplier } from '@/lib/types';

const formSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters.'),
  contactPerson: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email('Please enter a valid email address.').optional().or(z.literal('')),
});

type SupplierFormSheetProps = {
  open: boolean;
  mode: 'add' | 'edit';
  supplier?: Supplier;
  onClose: () => void;
};

export function SupplierFormSheet({
  open,
  mode,
  supplier,
  onClose,
}: SupplierFormSheetProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      phoneNumber: '',
      email: '',
    },
  });

  useEffect(() => {
    if (mode === 'edit' && supplier) {
      form.reset(supplier);
    } else {
      form.reset({
        name: '',
        contactPerson: '',
        phoneNumber: '',
        email: '',
      });
    }
  }, [supplier, mode, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
        if (mode === 'edit' && supplier) {
            await editSupplier(supplier.id, values);
            toast({
                title: 'Supplier Updated',
                description: `"${values.name}" has been updated.`,
            });
        } else {
            await addSupplier(values);
            toast({
                title: 'Supplier Added',
                description: `"${values.name}" has been added to your suppliers.`,
            });
        }
      form.reset();
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${mode === 'add' ? 'add' : 'update'} supplier. Please try again.`,
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
            {mode === 'add' ? 'Add a New Supplier' : 'Edit Supplier'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'add'
              ? "Enter the details of the new supplier. Click save when you're done."
              : "Update the details for this supplier. Click save when you're done."
            }
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-4 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Prime Cuts Co." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contactPerson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Person</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Meat" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 555-123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., sales@primecuts.com" {...field} />
                  </FormControl>
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
