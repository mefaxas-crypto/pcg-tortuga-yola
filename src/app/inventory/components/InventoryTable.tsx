
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FilePenLine,
  MoreVertical,
  Search,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { InventoryItem, InventoryStockItem } from '@/lib/types';
import { useState, useMemo } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteInventoryItemDialog } from './DeleteInventoryItemDialog';
import { allUnits } from '@/lib/conversions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCollection, useFirebase } from '@/firebase';

type InventoryTableProps = {
  onEdit: (item: InventoryItem) => void;
};

export function InventoryTable({ onEdit }: InventoryTableProps) {
  const { firestore } = useFirebase();
  const [categoryFilter, setCategoryFilter] = useState('all');

  const inventoryQuery = useMemo(() => firestore ? query(collection(firestore, 'inventory'), orderBy('name', 'asc')) : null, [firestore]);
  const { data: inventorySpecs, isLoading: specsLoading } = useCollection<InventoryItem>(inventoryQuery);

  const stockQuery = useMemo(() => {
      if (!firestore) return null;
      return query(collection(firestore, 'inventoryStock'));
    }, [firestore]);
  const { data: stockLevels, isLoading: stockLoading } = useCollection<InventoryStockItem>(stockQuery);

  const loading = specsLoading || stockLoading;

  // Memoized combination of specs and stock levels
  const combinedInventory = useMemo(() => {
    if (!inventorySpecs || !stockLevels) return null;
    
    return inventorySpecs.map(spec => {
      const stock = stockLevels.find(s => s.inventoryId === spec.id);
      return {
        ...spec,
        quantity: stock?.quantity ?? 0,
        status: stock?.status ?? 'Out of Stock',
      };
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [inventorySpecs, stockLevels]);
  

  const categories = useMemo(() => {
    if (!combinedInventory) return [];
    const uniqueCategories = new Set(combinedInventory.map(item => item.category));
    return ['all', ...Array.from(uniqueCategories).sort()];
  }, [combinedInventory]);

  const filteredItems = useMemo(() => {
    if (!combinedInventory) return [];
    if (categoryFilter === 'all') return combinedInventory;
    return combinedInventory.filter(item => item.category === categoryFilter);
  }, [combinedInventory, categoryFilter]);
  
  const getStatusBadge = (status: InventoryItem['status']) => {
    switch (status) {
      case 'In Stock':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200/80';
      case 'Low Stock':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200/80';
      case 'Out of Stock':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200/80';
      default:
        return 'bg-secondary';
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 0.01) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 4 }).format(value);
  }
  
  const getUnitLabel = (unitKey: string | undefined) => {
    if (!unitKey) return '';
    return allUnits[unitKey as keyof typeof allUnits]?.name || unitKey;
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 flex flex-col md:flex-row gap-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search items..."
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
            />
          </div>
          <div className='w-full md:w-64'>
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                    <SelectValue placeholder="Filter by category..." />
                </SelectTrigger>
                <SelectContent>
                    {categories.map(category => (
                        <SelectItem key={category} value={category} className='capitalize'>
                            {category === 'all' ? 'All Categories' : category}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </div>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className='border-b-0'>
                <TableHead>Item</TableHead>
                <TableHead className='hidden md:table-cell'>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>On Hand</TableHead>
                <TableHead className="hidden lg:table-cell">Purchase Unit</TableHead>
                <TableHead className="hidden lg:table-cell text-right">Purchase Price</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell className='hidden md:table-cell'><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className='hidden lg:table-cell'><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell className='hidden lg:table-cell'><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
              ))}
              {!loading && filteredItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className='font-medium'>{item.name}</div>
                    <div className='text-xs text-muted-foreground md:hidden'>{item.category}</div>
                    <div className='text-xs text-muted-foreground'>{item.materialCode}</div>
                  </TableCell>
                  <TableCell className='hidden md:table-cell text-muted-foreground'>{item.category}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('capitalize', getStatusBadge(item.status))}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {(item.quantity ?? 0).toFixed(2)} {getUnitLabel(item.purchaseUnit)}
                  </TableCell>
                   <TableCell className="hidden lg:table-cell">{item.purchaseQuantity} {getUnitLabel(item.purchaseUnit)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-right">
                    {formatCurrency(item.purchasePrice || 0)}
                  </TableCell>
                  <TableCell>
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
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <FilePenLine className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DeleteInventoryItemDialog itemId={item.id} itemName={item.name}>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive-foreground focus:text-destructive-foreground focus:bg-destructive/90">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DeleteInventoryItemDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
         {!loading && filteredItems?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
             {categoryFilter === 'all' ? 'No ingredients found. Add your first one!' : `No ingredients found in the "${categoryFilter}" category.`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
