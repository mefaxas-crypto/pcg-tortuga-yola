
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useOutletContext } from '@/context/OutletContext';
import { db } from '@/lib/firebase';
import type { Sale, VarianceLog } from '@/lib/types';
import { collection, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';


export function VarianceAnalysis() {
  const { selectedOutlet } = useOutletContext();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [varianceLogs, setVarianceLogs] = useState<VarianceLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!selectedOutlet || !date?.from || !date?.to) {
      setSales([]);
      setVarianceLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const toDate = new Date(date.to);
    toDate.setHours(23, 59, 59, 999);

    const salesQuery = query(
        collection(db, 'sales'),
        where('outletId', '==', selectedOutlet.id),
        where('saleDate', '>=', Timestamp.fromDate(date.from)),
        where('saleDate', '<=', Timestamp.fromDate(toDate))
    );

     const varianceQuery = query(
        collection(db, 'varianceLogs'),
        where('outletId', '==', selectedOutlet.id),
        where('logDate', '>=', Timestamp.fromDate(date.from)),
        where('logDate', '<=', Timestamp.fromDate(toDate)),
        orderBy('logDate', 'desc')
    );

    let salesData: Sale[] = [];
    let varianceData: VarianceLog[] = [];

    const unsubSales = onSnapshot(salesQuery, (snapshot) => {
        salesData = snapshot.docs.map(doc => doc.data() as Sale);
        setSales(salesData);
        checkLoadingState();
    }, (err) => console.error("Error fetching sales data:", err));

    const unsubVariance = onSnapshot(varianceQuery, (snapshot) => {
        varianceData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                logDate: (data.logDate as Timestamp).toDate()
            } as VarianceLog;
        });
        setVarianceLogs(varianceData);
        checkLoadingState();
    }, (err) => console.error("Error fetching variance logs:", err));

    let salesLoaded = false;
    let varianceLoaded = false;
    const checkLoadingState = () => {
        if(salesLoaded && varianceLoaded) {
            setLoading(false);
        }
    }
    
    const salesPromise = new Promise<void>(resolve => onSnapshot(salesQuery, () => { salesLoaded = true; resolve(); }));
    const variancePromise = new Promise<void>(resolve => onSnapshot(varianceQuery, () => { varianceLoaded = true; resolve(); }));

    Promise.all([salesPromise, variancePromise]).then(() => setLoading(false));

    return () => {
        unsubSales();
        unsubVariance();
    };

  }, [selectedOutlet, date]);

  const { theoreticalCost, actualCost, varianceAmount, variancePercentage } = useMemo(() => {
    if (!sales || !varianceLogs) return { theoreticalCost: 0, actualCost: 0, varianceAmount: 0, variancePercentage: 0 };

    const theoreticalCost = sales.reduce((acc, sale) => acc + sale.totalCost, 0);
    const totalVarianceValue = varianceLogs.reduce((sum, log) => sum + (log.totalVarianceValue || 0), 0);
    const actualCost = theoreticalCost + totalVarianceValue;
    
    const varianceAmount = actualCost - theoreticalCost;
    const variancePercentage = theoreticalCost > 0 ? (varianceAmount / theoreticalCost) * 100 : 0;
    
    return { theoreticalCost, actualCost, varianceAmount, variancePercentage };
  }, [sales, varianceLogs]);


  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      );
    }
    if (!varianceLogs || varianceLogs.length === 0) {
        return (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[200px]">
                <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl mt-4 font-bold tracking-tight">
                    No physical count variances for this period
                </h3>
                <p className="text-sm text-muted-foreground">
                    Perform a physical count to start analyzing variance.
                </p>
                </div>
            </div>
        )
    }

    return (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Theoretical Cost (COGS)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{formatCurrency(theoreticalCost)}</p>
                    <p className="text-xs text-muted-foreground">Based on items sold.</p>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Actual Cost</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{formatCurrency(actualCost)}</p>
                    <p className="text-xs text-muted-foreground">Theoretical cost adjusted for inventory variance.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Variance</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className={cn("text-3xl font-bold", varianceAmount >= 0 ? 'text-destructive' : 'text-green-600')}>{formatCurrency(varianceAmount)}</p>
                     <p className={cn("text-xs", varianceAmount >= 0 ? 'text-destructive' : 'text-green-600')}>{variancePercentage.toFixed(2)}% of theoretical cost.</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Variance Log Details</CardTitle>
                <CardDescription>Item-level variances from physical counts in this period.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className='text-right'>Theoretical Qty</TableHead>
                            <TableHead className='text-right'>Physical Qty</TableHead>
                            <TableHead className='text-right'>Variance Qty</TableHead>
                            <TableHead className='text-right'>Variance Value</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {varianceLogs.flatMap(log => log.items).map((item, index) => (
                           <TableRow key={`${item.itemId}-${index}`}>
                                <TableCell>{item.itemName}</TableCell>
                                <TableCell className='text-right text-muted-foreground'>{item.theoreticalQuantity.toFixed(2)} {item.unit}</TableCell>
                                <TableCell className='text-right'>{item.physicalQuantity.toFixed(2)} {item.unit}</TableCell>
                                <TableCell className={cn('text-right font-medium', item.variance >= 0 ? 'text-green-600' : 'text-destructive')}>{item.variance.toFixed(2)} {item.unit}</TableCell>
                                <TableCell className={cn('text-right font-medium', (item.varianceValue || 0) <= 0 ? 'text-green-600' : 'text-destructive')}>{formatCurrency(item.varianceValue || 0)}</TableCell>
                           </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </>
    )
  }

  return (
    <div className='space-y-6'>
        <Card>
            <CardHeader>
                <CardTitle>Variance Analysis</CardTitle>
                <CardDescription>Analyze the difference between theoretical and actual food costs based on physical counts.</CardDescription>
            </CardHeader>
            <CardContent>
                <DateRangePicker date={date} onDateChange={setDate} />
            </CardContent>
        </Card>
        {renderContent()}
    </div>
  )
}
