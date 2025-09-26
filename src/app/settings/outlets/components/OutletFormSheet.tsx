
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
import { addOutlet, editOutlet } from '@/lib/actions';
import { useEffect, useState } from 'react';
import type { Outlet } from '@/lib/types';
import { useOutletContext } from '@/context/OutletContext';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const outletSchema = z.object({
  name: z.string().min(2, 'Outlet name must be at least 2 characters.'),
  address: z.string().optional(),
  theme: z.string().optional(),
});

type OutletFormSheetProps = {
  open: boolean;
  mode: 'add' | 'edit';
  outlet?: Outlet;
  onClose: () => void;
};

const themes = [
  { name: 'Bamboo', class: 'theme-bamboo', color: 'bg-[#8F9988]' },
  { name: 'Default', class: '', color: 'bg-primary' },
];


export function OutletFormSheet({
  open,
  mode,
  outlet,
  onClose,
}: OutletFormSheetProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { setSelectedOutlet } = useOutletContext();
  const form = useForm<z.infer<typeof outletSchema>>({
    resolver: zodResolver(outletSchema),
    defaultValues: {
      name: '',
      address: '',
      theme: 'theme-bamboo'
    },
  });
  
  const activeTheme = form.watch('theme');

  useEffect(() => {
    if (open) {
        if (mode === 'edit' && outlet) {
            form.reset({
              name: outlet.name,
              address: outlet.address || '',
              theme: outlet.theme || 'theme-bamboo',
            });
        } else {
            form.reset({
                name: '',
                address: '',
                theme: 'theme-bamboo',
            });
        }
    }
  }, [outlet, mode, form, open]);

  async function onSubmit(values: z.infer<typeof outletSchema>) {
    setLoading(true);
    try {
        if (mode === 'edit' && outlet) {
            await editOutlet(outlet.id, values);
            setSelectedOutlet({ ...outlet, ...values });
            toast({
                title: 'Outlet Updated',
                description: `"${values.name}" has been updated.`,
            });
        } else {
            await addOutlet(values);
            toast({
                title: 'Outlet Added',
                description: `"${values.name}" has been added.`,
            });
        }
      form.reset();
      onClose();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to ${mode === 'add' ? 'add' : 'update'} outlet. Please try again.`,
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
            {mode === 'add' ? 'Add a New Outlet' : 'Edit Outlet'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'add'
              ? "Enter the details and choose a theme for the new location. Click save when you're done."
              : "Update the details and theme for this location. Click save when you're done."
            }
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid gap-6 py-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Outlet Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., La Yola Restaurant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 123 Marina Drive" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
             <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color Theme</FormLabel>
                   <div className="grid grid-cols-3 gap-2 pt-2">
                    {themes.map((theme) => (
                      <div key={theme.name} className="flex flex-col items-center gap-2">
                        <Button
                          type='button'
                          variant={'outline'}
                          className={cn(
                            'h-12 w-full flex items-center justify-center',
                            activeTheme === theme.class && 'border-primary border-2'
                          )}
                          onClick={() => field.onChange(theme.class)}
                        >
                          <div
                            className={cn('h-6 w-6 rounded-full', theme.color)}
                          />
                        </Button>
                        <span className="text-xs text-muted-foreground">{theme.name}</span>
                      </div>
                    ))}
                  </div>
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
