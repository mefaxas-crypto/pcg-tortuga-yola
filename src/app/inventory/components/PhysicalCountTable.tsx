
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
import { allUnits } from '@/lib/conversions';
import { Save } from 'lucide-react';
import { updatePhysicalInventory } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

export function PhysicalCountTable() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[] | null>(null);
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, number | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleCountChange = (itemId: string, value: string) => {
    const parsedValue = parseFloat(value);
    setPhysicalCounts(prev => ({
      ...prev,
      [itemId]: isNaN(parsedValue) ? undefined : parsedValue,
    }));
  };

  const getUnitLabel = (unitKey: string | undefined) => {
    if (!unitKey) return '';
    return allUnits[unitKey as keyof typeof allUnits]?.name || unitKey;
  }
  
  const changedItems = useMemo(() => {
    if (!inventoryItems) return [];
    return inventoryItems
      .map(item => ({
        id: item.id,
        name: item.name,
        physicalQuantity: physicalCounts[item.id],
        theoreticalQuantity: item.quantity,
        unit: item.unit,
      }))
      .filter(item => item.physicalQuantity !== undefined && item.physicalQuantity !== item.theoreticalQuantity) as PhysicalCountItem[];
  }, [inventoryItems, physicalCounts]);

  const handleSaveChanges = async () => {
    if (changedItems.length === 0) {
        toast({
            title: "No changes to save",
            description: "You haven't entered any new physical counts.",
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
        setPhysicalCounts({}); // Clear inputs after saving
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
        <CardTitle>Physical Inventory Count</CardTitle>
        <CardDescription>
            Enter the physical quantity for each item to calculate the variance against the theoretical (system) count.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader className='sticky top-0 bg-card z-10'>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className='w-[150px] text-right'>Theoretical Count</TableHead>
                <TableHead className='w-[150px] text-right'>Physical Count</TableHead>
                <TableHead className='w-[150px] text-right'>Variance</TableHead>
                <TableHead className='w-[100px]'>Unit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  </TableRow>
              ))}
              {!loading && inventoryItems?.map((item) => {
                const theoretical = item.quantity;
                const physical = physicalCounts[item.id];
                const variance = physical !== undefined ? physical - theoretical : 0;
                
                return (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{theoretical.toFixed(2)}</TableCell>
                        <TableCell>
                            <Input 
                                type="number"
                                step="any"
                                value={physicalCounts[item.id] ?? ''}
                                onChange={(e) => handleCountChange(item.id, e.target.value)}
                                className="text-right"
                            />
                        </TableCell>
                        <TableCell className={cn(
                            'text-right font-medium',
                            variance > 0 && 'text-green-600',
                            variance < 0 && 'text-destructive'
                        )}>
                            {physical !== undefined ? variance.toFixed(2) : '-'}
                        </TableCell>
                         <TableCell className='text-muted-foreground'>{getUnitLabel(item.unit)}</TableCell>
                    </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!loading && inventoryItems?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No ingredients found.
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
