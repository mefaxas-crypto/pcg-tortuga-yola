
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useOutletContext } from '@/context/OutletContext';
import type { Sale, VarianceLog } from '@/lib/types';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { useCollection, useFirebase } from '@/firebase';

const chartConfig = {
  variance: {
    label: 'Variance',
  },
  positive: {
    label: 'Positive Variance',
    color: 'hsl(var(--chart-2))',
  },
  negative: {
    label: 'Negative Variance',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;


export function VarianceAnalysis() {
  const { firestore } = useFirebase();
  const { selectedOutlet } = useOutletContext();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const salesQuery = useMemo(() => {
      if (!firestore || !selectedOutlet || !date?.from || !date?.to) return null;
      const toDate = new Date(date.to);
      toDate.setHours(23, 59, 59, 999);
      return query(
          collection(firestore, 'sales'),
          where('outletId', '==', selectedOutlet.id),
          where('saleDate', '>=', Timestamp.fromDate(date.from)),
          where('saleDate', '<=', Timestamp.fromDate(toDate))
      );
    }, [firestore, selectedOutlet, date]);

  const varianceQuery = useMemo(() => {
      if (!firestore || !selectedOutlet || !date?.from || !date?.to) return null;
      const toDate = new Date(date.to);
      toDate.setHours(23, 59, 59, 999);
      return query(
          collection(firestore, 'varianceLogs'),
          where('outletId', '==', selectedOutlet.id),
          where('logDate', '>=', Timestamp.fromDate(date.from)),
          where('logDate', '<=', Timestamp.fromDate(toDate)),
          orderBy('logDate', 'desc')
      );
    }, [firestore, selectedOutlet, date]);

  const { data: sales, isLoading: salesLoading } = useCollection<Sale>(salesQuery);
  const { data: varianceLogs, isLoading: varianceLoading } = useCollection<VarianceLog>(varianceQuery);
  
  const loading = salesLoading || varianceLoading;

  const { theoreticalCost, actualCost, varianceAmount, variancePercentage, dailyVariance } = useMemo(() => {
    if (!sales || !varianceLogs) return { theoreticalCost: 0, actualCost: 0, varianceAmount: 0, variancePercentage: 0, dailyVariance: [] };

    const theoreticalCost = sales.reduce((acc, sale) => acc + sale.totalCost, 0);
    const totalVarianceValue = varianceLogs.reduce((sum, log) => sum + (log.totalVarianceValue || 0), 0);
    const actualCost = theoreticalCost + totalVarianceValue;
    
    const varianceAmount = actualCost - theoreticalCost;
    const variancePercentage = theoreticalCost > 0 ? (varianceAmount / theoreticalCost) * 100 : 0;
    
    const daily: {[key: string]: number} = {};
    for (const log of varianceLogs) {
        const day = format(log.logDate, 'yyyy-MM-dd');
        if (!daily[day]) {
            daily[day] = 0;
        }
        daily[day] += log.totalVarianceValue || 0;
    }
    const dailyVarianceData = Object.keys(daily).map(day => ({
        date: day,
        variance: daily[day],
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return { theoreticalCost, actualCost, varianceAmount, variancePercentage, dailyVariance: dailyVarianceData };
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
    if (!selectedOutlet) {
        return (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[200px]">
                <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl mt-4 font-bold tracking-tight">
                    No Outlet Selected
                </h3>
                <p className="text-sm text-muted-foreground">
                    Please select an outlet from the header to view reports.
                </p>
                </div>
            </div>
        )
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
                <CardTitle>Daily Variance Trend</CardTitle>
                <CardDescription>Daily total variance from physical counts. Negative is good (gain), positive is bad (loss).</CardDescription>
            </CardHeader>
            <CardContent className='h-[300px]'>
                <ChartContainer config={chartConfig} className="w-full h-full">
                    <BarChart data={dailyVariance}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => format(new Date(value), "MMM d")}
                        />
                         <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                        />
                        <Bar
                            dataKey="variance"
                            radius={8}
                        >
                             {dailyVariance.map((entry) => (
                                <div key={entry.date} style={{ backgroundColor: entry.variance < 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))' }} />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>

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
