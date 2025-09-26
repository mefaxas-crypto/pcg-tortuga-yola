
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useOutletContext } from '@/context/OutletContext';
import { db } from '@/lib/firebase';
import type { Sale } from '@/lib/types';
import { collection, onSnapshot, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type AggregatedSale = {
  recipeId: string;
  recipeName: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  foodCostPercentage: number;
}

const chartConfig = {
  Revenue: {
    label: 'Revenue',
    color: 'hsl(var(--chart-2))',
  },
  Profit: {
    label: 'Profit',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;


export function SalesAndProfitability() {
  const { selectedOutlet } = useOutletContext();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [sales, setSales] = useState<Sale[] | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!selectedOutlet || !date?.from || !date?.to) {
      setSales([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // Set time to end of day for the 'to' date
    const toDate = new Date(date.to);
    toDate.setHours(23, 59, 59, 999);

    const q = query(
        collection(db, 'sales'),
        where('outletId', '==', selectedOutlet.id),
        where('saleDate', '>=', Timestamp.fromDate(date.from)),
        where('saleDate', '<=', Timestamp.fromDate(toDate)),
        orderBy('saleDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const salesData: Sale[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            salesData.push({
                ...data,
                id: doc.id,
                saleDate: (data.saleDate as Timestamp).toDate(),
            } as Sale);
        });
        setSales(salesData);
        setLoading(false);
    }, (err) => {
        console.error("Error fetching sales data:", err);
        setLoading(false);
    });

    return () => unsubscribe();

  }, [selectedOutlet, date]);

  const { totalRevenue, totalCost, totalProfit, foodCostPercentage, salesByDay } = useMemo(() => {
    if (!sales) return { totalRevenue: 0, totalCost: 0, totalProfit: 0, foodCostPercentage: 0, salesByDay: [] };

    const totals = sales.reduce((acc, sale) => {
        acc.totalRevenue += sale.totalRevenue;
        acc.totalCost += sale.totalCost;
        return acc;
    }, { totalRevenue: 0, totalCost: 0 });

    const totalProfit = totals.totalRevenue - totals.totalCost;
    const foodCostPercentage = totals.totalRevenue > 0 ? (totals.totalCost / totals.totalRevenue) * 100 : 0;
    
    const dailySales: {[key: string]: { totalRevenue: number, totalProfit: number }} = {};
    for (const sale of sales) {
        const day = format(sale.saleDate, 'yyyy-MM-dd');
        if (!dailySales[day]) {
            dailySales[day] = { totalRevenue: 0, totalProfit: 0 };
        }
        dailySales[day].totalRevenue += sale.totalRevenue;
        dailySales[day].totalProfit += (sale.totalRevenue - sale.totalCost);
    }
    const salesByDay = Object.keys(dailySales).map(day => ({
        date: day,
        Revenue: dailySales[day].totalRevenue,
        Profit: dailySales[day].totalProfit,
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());


    return { ...totals, totalProfit, foodCostPercentage, salesByDay };
  }, [sales]);

  const aggregatedSales = useMemo((): AggregatedSale[] => {
    if (!sales) return [];

    const map = new Map<string, AggregatedSale>();
    sales.forEach(sale => {
        const existing = map.get(sale.recipeId);
        if (existing) {
            existing.totalQuantity += sale.quantity;
            existing.totalRevenue += sale.totalRevenue;
            existing.totalCost += sale.totalCost;
        } else {
            map.set(sale.recipeId, {
                recipeId: sale.recipeId,
                recipeName: sale.recipeName,
                totalQuantity: sale.quantity,
                totalRevenue: sale.totalRevenue,
                totalCost: sale.totalCost,
                totalProfit: 0, // will calculate next
                foodCostPercentage: 0, // will calculate next
            });
        }
    });

    return Array.from(map.values()).map(item => {
        item.totalProfit = item.totalRevenue - item.totalCost;
        item.foodCostPercentage = item.totalRevenue > 0 ? (item.totalCost / item.totalRevenue) * 100 : 0;
        return item;
    }).sort((a,b) => b.totalRevenue - a.totalRevenue);

  }, [sales]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
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
    if (sales?.length === 0) {
        return (
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[200px]">
                <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl mt-4 font-bold tracking-tight">
                    No sales data for this period
                </h3>
                <p className="text-sm text-muted-foreground">
                    Try selecting a different date range or log new sales.
                </p>
                </div>
            </div>
        )
    }

    return (
    <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Total Cost (COGS)</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(totalCost)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Total Profit</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(totalProfit)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Food Cost %</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold">{foodCostPercentage.toFixed(2)}%</p>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Performance Over Time</CardTitle>
                <CardDescription>Daily revenue and profit for the selected period.</CardDescription>
            </CardHeader>
            <CardContent className='h-[400px]'>
                 <ChartContainer config={chartConfig} className="w-full h-full">
                    <LineChart data={salesByDay} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                        <YAxis tickFormatter={(val) => formatCurrency(val)} />
                        <Tooltip content={<ChartTooltipContent formatter={(value, name) => (<div><p>{name}</p><p>{formatCurrency(value as number)}</p></div>)} />} />
                        <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--chart-2))" />
                        <Line type="monotone" dataKey="Profit" stroke="hsl(var(--chart-1))" />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>Item Profit & Loss</CardTitle>
                <CardDescription>Detailed performance of each menu item sold in this period.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead className='text-right'>Units Sold</TableHead>
                            <TableHead className='text-right'>Revenue</TableHead>
                            <TableHead className='text-right'>Cost</TableHead>
                            <TableHead className='text-right'>Profit</TableHead>
                            <TableHead className='text-right'>FC %</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {aggregatedSales.map(item => (
                            <TableRow key={item.recipeId}>
                                <TableCell>{item.recipeName}</TableCell>
                                <TableCell className='text-right'>{item.totalQuantity}</TableCell>
                                <TableCell className='text-right'>{formatCurrency(item.totalRevenue)}</TableCell>
                                <TableCell className='text-right'>{formatCurrency(item.totalCost)}</TableCell>
                                <TableCell className='text-right font-medium text-primary'>{formatCurrency(item.totalProfit)}</TableCell>
                                <TableCell className='text-right'>{item.foodCostPercentage.toFixed(1)}%</TableCell>
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
                <CardTitle>Sales & Profitability Analysis</CardTitle>
                <CardDescription>Analyze your sales performance for the selected outlet and date range.</CardDescription>
            </CardHeader>
            <CardContent>
                <DateRangePicker date={date} onDateChange={setDate} />
            </CardContent>
        </Card>
        {renderContent()}
    </div>
  )
}
