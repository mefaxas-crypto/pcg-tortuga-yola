
'use client';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { logSale } from '@/lib/actions';
import type { Menu, MenuItem as MenuItemType } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { collection, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useOutletContext } from '@/context/OutletContext';
import { useAuth } from '@/context/AuthContext';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';

const formSchema = z.object({
  menuId: z.string().min(1, 'Please select a menu.'),
  recipeId: z.string().min(1, 'Please select an item.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});

export function SalesForm() {
  const [loading, setLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const { toast } = useToast();
  const { selectedOutlet } = useOutletContext();
  const { user, appUser } = useAuth();
  const { firestore } = useFirebase();

  const menusQuery = useMemoFirebase(() => query(collection(firestore, 'menus')), [firestore]);
  const { data: menusData } = useCollection<Menu>(menusQuery);
  const menus = menusData || [];
  
  const canLogSales = appUser && ['Admin', 'Manager', 'Chef', 'Clerk'].includes(appUser.role);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      menuId: '',
      recipeId: '',
      quantity: 1,
    },
  });

  const selectedMenuId = form.watch('menuId');

  useEffect(() => {
    if (selectedMenuId) {
      const selectedMenu = menus.find((menu) => menu.id === selectedMenuId);
      setMenuItems(selectedMenu?.items || []);
      form.setValue('recipeId', ''); // Reset recipe selection
    } else {
      setMenuItems([]);
    }
  }, [selectedMenuId, menus, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!selectedOutlet) {
      toast({
        variant: 'destructive',
        title: 'No Outlet Selected',
        description: 'Please select an outlet from the header before logging a sale.',
      });
      return;
    }
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to log a sale.',
      });
      return;
    }
    setLoading(true);

    const selectedMenu = menus.find(menu => menu.id === values.menuId);
    const selectedItem = selectedMenu?.items.find(item => item.recipeId === values.recipeId);

    if (!selectedMenu || !selectedItem) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Selected menu or item not found.',
        });
        setLoading(false);
        return;
    }

    try {
        await logSale({
            outletId: selectedOutlet.id,
            menuId: values.menuId,
            menuName: selectedMenu.name,
            recipeId: values.recipeId,
            recipeName: selectedItem.name,
            quantity: values.quantity,
            totalRevenue: selectedItem.sellingPrice * values.quantity,
            totalCost: selectedItem.totalCost * values.quantity,
            saleDate: new Date(), // This will be replaced by serverTimestamp in action
            userId: user.uid,
        });

      toast({
        title: 'Sale Logged!',
        description: `${values.quantity} x "${selectedItem.name}" has been recorded.`,
      });
      form.reset({
        menuId: values.menuId,
        recipeId: '',
        quantity: 1,
      });
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }
  
  if (!canLogSales) {
    return (
      <div className="text-center text-muted-foreground p-4 border border-dashed rounded-md">
        You do not have permission to log sales.
      </div>
    );
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="menuId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Menu</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedOutlet}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a menu" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {menus.map((menu) => (
                    <SelectItem key={menu.id} value={menu.id}>
                      {menu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="recipeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Menu Item</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!selectedMenuId}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item to sell" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {menuItems.map((item) => (
                    <SelectItem key={item.recipeId} value={item.recipeId}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity Sold</FormLabel>
              <FormControl>
                <Input type="number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={loading || !selectedOutlet} className="w-full">
          {loading ? 'Logging Sale...' : 'Log Sale'}
        </Button>
      </form>
    </Form>
  );
}
