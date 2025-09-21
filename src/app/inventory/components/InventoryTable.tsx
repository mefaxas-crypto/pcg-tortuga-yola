
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
import type { InventoryItem } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { DeleteInventoryItemDialog } from './DeleteInventoryItemDialog';
import { allUnits } from '@/lib/conversions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type InventoryTableProps = {
  onEdit: (item: InventoryItem) => void;
};

export function InventoryTable({ onEdit }: InventoryTableProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'inventory'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const items: InventoryItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as InventoryItem);
        });
        setInventoryItems(items.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching inventory:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    if (!inventoryItems) return [];
    const uniqueCategories = new Set(inventoryItems.map(item => item.category));
    return ['all', ...Array.from(uniqueCategories).sort()];
  }, [inventoryItems]);

  const filteredItems = useMemo(() => {
    if (!inventoryItems) return [];
    if (categoryFilter === 'all') return inventoryItems;
    return inventoryItems.filter(item => item.category === categoryFilter);
  }, [inventoryItems, categoryFilter]);
  
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
                <TableHead>Material</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>On Hand Qty</TableHead>
                <TableHead>Purchase Unit</TableHead>
                <TableHead>Conversion</TableHead>
                <TableHead className="text-right">Purchase Price</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
              ))}
              {!loading && filteredItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className='text-muted-foreground'>{item.materialCode}</TableCell>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className='text-muted-foreground'>{item.category}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn('capitalize', getStatusBadge(item.status))}
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.quantity} {getUnitLabel(item.purchaseUnit)}
                  </TableCell>
                   <TableCell>{item.purchaseQuantity} {getUnitLabel(item.purchaseUnit)}</TableCell>
                   <TableCell>
                     {item.recipeUnitConversion ? `1 ${getUnitLabel(item.purchaseUnit)} = ${item.recipeUnitConversion} ${getUnitLabel(item.recipeUnit)}` : 'N/A'}
                   </TableCell>
                  <TableCell className="text-right">
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
