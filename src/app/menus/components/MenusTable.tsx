
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FilePenLine, MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import type { Menu } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteMenuDialog } from './DeleteMenuDialog';
import { useRouter } from 'next/navigation';
import { useOutletContext } from '@/context/OutletContext';

export function MenusTable() {
  const router = useRouter();
  const [menus, setMenus] = useState<Menu[] | null>(null);
  const [loading, setLoading] = useState(true);
  const { selectedOutlet } = useOutletContext();

  useEffect(() => {
    if (!selectedOutlet) {
      setMenus([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const q = query(collection(db, 'menus'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const menusData: Menu[] = [];
        querySnapshot.forEach((doc) => {
          menusData.push({ id: doc.id, ...doc.data() } as Menu);
        });
        setMenus(menusData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching menus:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedOutlet]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value || 0);
  }

  const calculateTotals = (items: Menu['items']) => {
    if (!items) return { totalCost: 0, totalRevenue: 0, totalProfit: 0 };
    const totalCost = items.reduce((acc, item) => acc + (item.totalCost || 0), 0);
    const totalRevenue = items.reduce((acc, item) => acc + (item.sellingPrice || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    return { totalCost, totalRevenue, totalProfit };
  }

  const handleEdit = (menu: Menu) => {
    router.push(`/menus/${menu.id}/edit`);
  };


  return (
    <Card>
      <CardContent className="pt-6">
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu Name</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Total Cost</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Total Revenue</TableHead>
                <TableHead className="text-right">Total Profit</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 2 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16" />
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      <Skeleton className="h-5 w-20 ml-auto" />
                    </TableCell>
                    <TableCell className='hidden sm:table-cell'>
                      <Skeleton className="h-5 w-20 ml-auto" />
                    </TableCell>
                     <TableCell>
                      <Skeleton className="h-5 w-20 ml-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading &&
                menus?.map((menu) => {
                  const { totalCost, totalRevenue, totalProfit } = calculateTotals(menu.items);
                  return (
                    <TableRow key={menu.id}>
                      <TableCell className="font-medium">
                        {menu.name}
                      </TableCell>
                      <TableCell>{menu.items?.length || 0}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">
                        {formatCurrency(totalCost)}
                      </TableCell>
                       <TableCell className="text-right text-green-600 hidden sm:table-cell">
                        {formatCurrency(totalRevenue)}
                      </TableCell>
                       <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(totalProfit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => handleEdit(menu)}>
                              <FilePenLine className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DeleteMenuDialog
                              menuId={menu.id}
                              menuName={menu.name}
                            >
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive-foreground focus:text-destructive-foreground focus:bg-destructive/90"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DeleteMenuDialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
            </TableBody>
          </Table>
        </div>
        {!loading && (!menus || menus.length === 0) && (
          <div className="py-12 text-center text-muted-foreground">
             {!selectedOutlet ? 'Please select an outlet to view menus.' : 'No menus found. Add your first one!'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
