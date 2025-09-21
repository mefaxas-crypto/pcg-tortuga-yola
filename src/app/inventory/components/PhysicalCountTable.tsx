
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
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { InventoryItem, PhysicalCountItem } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { allUnits, Unit, convert } from '@/lib/conversions';
import { Save } from 'lucide-react';
import { updatePhysicalInventory } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type PhysicalCountState = {
    [itemId: string]: {
        count?: number;
        unit: Unit;
    }
}

export function PhysicalCountTable() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[] | null>(null);
  const [physicalCounts, setPhysicalCounts] = useState<PhysicalCountState>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'inventory'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const items: InventoryItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as InventoryItem);
        });
        const sortedItems = items.sort((a, b) => a.name.localeCompare(b.name));
        setInventoryItems(sortedItems);

        // Initialize physical counts state
        const initialCounts: PhysicalCountState = {};
        sortedItems.forEach(item => {
            initialCounts[item.id] = { unit: item.unit as Unit };
        });
        setPhysicalCounts(initialCounts);

        setLoading(false);
      },
      (error) => {
        console.error('Error fetching inventory:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleCountChange = (itemId: string, value: string) => {
    const parsedValue = parseFloat(value);
    setPhysicalCounts(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        count: isNaN(parsedValue) ? undefined : parsedValue,
      }
    }));
  };

  const handleUnitChange = (itemId: string, unit: Unit) => {
    setPhysicalCounts(prev => ({
        ...prev,
        [itemId]: {
            ...prev[itemId],
            unit,
        }
    }));
  };

  const getUnitLabel = (unitKey: string | undefined) => {
    if (!unitKey) return '';
    return allUnits[unitKey as keyof typeof allUnits]?.name || unitKey;
  }
  
  const getCompatibleUnits = (baseUnit: Unit) => {
    const baseUnitType = allUnits[baseUnit]?.type;
    if (!baseUnitType) return [{ value: baseUnit, label: getUnitLabel(baseUnit) }];

    return Object.entries(allUnits)
        .filter(([, unitDetails]) => unitDetails.type === baseUnitType)
        .map(([unitKey, unitDetails]) => ({
            value: unitKey,
            label: unitDetails.name,
        }));
  }

  const changedItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems
      .map(item => {
        const physicalCountData = physicalCounts[item.id];
        if (physicalCountData?.count === undefined) return null;

        const countInBaseUnit = convert(physicalCountData.count, physicalCountData.unit, item.unit as Unit);

        // Only include if there's an actual change
        if (Math.abs(countInBaseUnit - item.quantity) < 0.001) return null;

        return {
            id: item.id,
            name: item.name,
            physicalQuantity: countInBaseUnit,
            theoreticalQuantity: item.quantity,
            unit: item.unit,
        }
      })
      .filter(item => item !== null) as PhysicalCountItem[];
  }, [inventoryItems, physicalCounts]);
  
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


  const handleSaveChanges = async () => {
    if (changedItems.length === 0) {
        toast({
            title: "No changes to save",
            description: "You haven't entered any new physical counts that differ from the theoretical count.",
        });
        return;
    }
    setIsSaving(true);
    try {
        await updatePhysicalInventory(changedItems);
        toast({
            title: "Inventory Updated",
            description: "Your physical counts have been saved successfully.",
        });
        // Reset only the count, keep the unit selection
        setPhysicalCounts(prev => {
            const newCounts = { ...prev };
            Object.keys(newCounts).forEach(key => {
                delete newCounts[key].count;
            });
            return newCounts;
        });

    } catch (error) {
        console.error("Error updating physical inventory:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to save physical counts. Please try again.",
        });
    } finally {
        setIsSaving(false);
    }
  }


  return (
    <Card>
      <CardHeader>
        <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
            <div>
                <CardTitle>Physical Inventory Count</CardTitle>
                <CardDescription className='mt-2'>
                    Enter the physical quantity for each item to calculate the variance. You can change the unit for easier counting.
                </CardDescription>
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
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader className='sticky top-0 bg-card z-10'>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className='w-[150px] text-right'>Theoretical</TableHead>
                <TableHead className='w-[150px]'>Physical Count</TableHead>
                <TableHead className='w-[150px]'>Count Unit</TableHead>
                <TableHead className='w-[150px] text-right'>Variance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                  </TableRow>
              ))}
              {!loading && filteredItems?.map((item) => {
                const theoretical = item.quantity;
                const physicalCountData = physicalCounts[item.id];
                const physicalCountValue = physicalCountData?.count;
                const countUnit = physicalCountData?.unit || item.unit as Unit;
                
                let variance = 0;
                if (physicalCountValue !== undefined) {
                    try {
                        const physicalInBaseUnit = convert(physicalCountValue, countUnit, item.unit as Unit);
                        variance = physicalInBaseUnit - theoretical;
                    } catch (e) {
                        console.error(e);
                        // In case of a conversion error, variance is not shown
                    }
                }
                
                const compatibleUnits = getCompatibleUnits(item.unit as Unit);

                return (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.category}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{theoretical.toFixed(2)} {getUnitLabel(item.unit)}</TableCell>
                        <TableCell>
                            <Input 
                                type="number"
                                step="any"
                                value={physicalCountValue ?? ''}
                                onChange={(e) => handleCountChange(item.id, e.target.value)}
                                className="text-right"
                            />
                        </TableCell>
                        <TableCell>
                            <Select value={countUnit} onValueChange={(u) => handleUnitChange(item.id, u as Unit)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {compatibleUnits.map(u => (
                                        <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </TableCell>
                        <TableCell className={cn(
                            'text-right font-medium',
                            variance > 0 && 'text-green-600',
                            variance < 0 && 'text-destructive'
                        )}>
                            {physicalCountValue !== undefined ? `${variance.toFixed(2)} ${getUnitLabel(item.unit)}` : '-'}
                        </TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!loading && filteredItems?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            {categoryFilter === 'all' ? 'No ingredients found.' : `No ingredients found in the "${categoryFilter}" category.`}
          </div>
        )}
      </CardContent>
      <CardFooter className='justify-end'>
        <Button onClick={handleSaveChanges} disabled={isSaving || loading || changedItems.length === 0}>
            {isSaving ? 'Saving...' : 'Save Counts'}
            <Save className='ml-2 h-4 w-4' />
        </Button>
      </CardFooter>
    </Card>
  );
}
