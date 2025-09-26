

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
import type { InventoryItem, PhysicalCountItem, InventoryStockItem } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { allUnits, Unit, convert } from '@/lib/conversions';
import { Save } from 'lucide-react';
import { updatePhysicalInventory } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOutletContext } from '@/context/OutletContext';

type PhysicalCountState = {
    [itemId: string]: {
        count?: number;
        unit: Unit;
    }
}

export function PhysicalCountTable() {
  const { selectedOutlet } = useOutletContext();
  const [inventorySpecs, setInventorySpecs] = useState<InventoryItem[] | null>(null);
  const [stockLevels, setStockLevels] = useState<InventoryStockItem[] | null>(null);
  const [physicalCounts, setPhysicalCounts] = useState<PhysicalCountState>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    if (!selectedOutlet) {
      setInventorySpecs([]);
      setStockLevels([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'inventory'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((doc) => items.push({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventorySpecs(items);
    });
    return () => unsubscribe();
  }, [selectedOutlet]);

  useEffect(() => {
    if (!selectedOutlet) {
      setStockLevels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, 'inventoryStock'), where('outletId', '==', selectedOutlet.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const stock: InventoryStockItem[] = [];
      snapshot.forEach((doc) => stock.push({ id: doc.id, ...doc.data() } as InventoryStockItem));
      setStockLevels(stock);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching stock levels:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [selectedOutlet]);

  const combinedInventory = useMemo(() => {
    if (!inventorySpecs || !stockLevels) return null;
    
    const combined = inventorySpecs.map(spec => {
      const stock = stockLevels.find(s => s.inventoryId === spec.id);
      return {
        ...spec,
        quantity: stock?.quantity ?? 0,
        status: stock?.status ?? 'Out of Stock',
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    
    // Initialize physical counts state once combined inventory is ready
    const initialCounts: PhysicalCountState = {};
    combined.forEach(item => {
        initialCounts[item.id] = { unit: item.purchaseUnit as Unit };
    });
    setPhysicalCounts(initialCounts);
    
    return combined;
  }, [inventorySpecs, stockLevels]);


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
        .filter(([, unitDetails]) => unitDetails.type === baseUnitType || unitDetails.type === 'each')
        .map(([unitKey, unitDetails]) => ({
            value: unitKey,
            label: unitDetails.name,
        }));
  }

  const changedItems = useMemo(() => {
    if (!combinedInventory) return [];
    return combinedInventory
      .map(item => {
        const physicalCountData = physicalCounts[item.id];
        if (physicalCountData?.count === undefined) return null;

        const countInPurchaseUnit = convert(physicalCountData.count, physicalCountData.unit, item.purchaseUnit as Unit);

        // Only include if there's an actual change in purchase units
        if (Math.abs(countInPurchaseUnit - (item.quantity ?? 0)) < 0.001) return null;

        return {
            id: item.id,
            name: item.name,
            physicalQuantity: countInPurchaseUnit, // This is the final quantity in the *purchase unit*
            theoreticalQuantity: item.quantity ?? 0,
            unit: item.purchaseUnit, // The unit is the purchase unit
        }
      })
      .filter(item => item !== null) as PhysicalCountItem[];
  }, [combinedInventory, physicalCounts]);
  
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


  const handleSaveChanges = async () => {
     if (!selectedOutlet) {
      toast({
        variant: "destructive",
        title: "No Outlet Selected",
        description: "Please select an outlet before saving counts.",
      });
      return;
    }
    if (changedItems.length === 0) {
        toast({
            title: "No changes to save",
            description: "You haven't entered any new physical counts that differ from the theoretical count.",
        });
        return;
    }
    setIsSaving(true);
    try {
        await updatePhysicalInventory(changedItems, selectedOutlet.id);
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
                const theoretical = item.quantity ?? 0;
                const physicalCountData = physicalCounts[item.id];
                const physicalCountValue = physicalCountData?.count;
                const countUnit = physicalCountData?.unit || item.purchaseUnit as Unit;
                
                let variance = 0;
                if (physicalCountValue !== undefined) {
                    try {
                        const physicalInPurchaseUnit = convert(physicalCountValue, countUnit, item.purchaseUnit as Unit);
                        variance = physicalInPurchaseUnit - theoretical;
                    } catch (e) {
                        console.error(e);
                        // In case of a conversion error, variance is not shown
                    }
                }
                
                const compatibleUnits = getCompatibleUnits(item.purchaseUnit as Unit);

                return (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">{item.category}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{theoretical.toFixed(2)} {getUnitLabel(item.purchaseUnit)}</TableCell>
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
                            {physicalCountValue !== undefined ? `${variance.toFixed(2)} ${getUnitLabel(item.purchaseUnit)}` : '-'}
                        </TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!loading && (!filteredItems || filteredItems.length === 0) && (
          <div className="py-12 text-center text-muted-foreground">
             {!selectedOutlet ? 'Please select an outlet to begin a physical count.' : categoryFilter === 'all' ? 'No ingredients found.' : `No ingredients found in the "${categoryFilter}" category.`}
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
