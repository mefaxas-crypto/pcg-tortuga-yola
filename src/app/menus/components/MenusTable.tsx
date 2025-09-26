
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
import { collection, query, orderBy, where } from 'firebase/firestore';
import type { Menu } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteMenuDialog } from './DeleteMenuDialog';
import { useRouter } from 'next/navigation';
import { useCollection, useFirebase } from '@/firebase';
import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

export function MenusTable() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user, loading: authLoading } = useAuth();
  
  const menusQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'menus'),
      where('userId', '==', user.uid),
      orderBy('name', 'asc')
    );
  }, [firestore, user]);
  
  const { data: menus, isLoading: dataLoading } = useCollection<Menu>(menusQuery);

  const loading = authLoading || dataLoading;

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
             No menus found. Add your first one!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
