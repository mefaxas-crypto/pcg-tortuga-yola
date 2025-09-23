
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
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type AggregatedSale = {
  recipeId: string;
  recipeName: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  foodCost: number;
}

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

    const q = query(
        collection(db, 'sales'),
        where('outletId', '==', selectedOutlet.id),
        where('saleDate', '>=', Timestamp.fromDate(date.from)),
        where('saleDate', '<=', Timestamp.fromDate(date.to)),
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

  const aggregatedSales = useMemo(() => {
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
                foodCost: 0, // will calculate next
            });
        }
    });

    return Array.from(map.values()).map(item => {
        item.totalProfit = item.totalRevenue - item.totalCost;
        item.foodCost = item.totalRevenue > 0 ? (item.totalCost / item.totalRevenue) * 100 : 0;
        return item;
    });

  }, [sales]);

  const topByRevenue = [...aggregatedSales].sort((a,b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
  const topByProfit = [...aggregatedSales].sort((a,b) => b.totalProfit - a.totalProfit).slice(0, 5);
  const topByQuantity = [...aggregatedSales].sort((a,b) => b.totalQuantity - a.totalQuantity).slice(0, 5);


  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      );
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
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={salesByDay} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM d')} />
                        <YAxis tickFormatter={(val) => formatCurrency(val)} />
                        <Tooltip content={<ChartTooltipContent formatter={(value, name) => &lt;div&gt;&lt;p&gt;{name}&lt;/p&gt;&lt;p&gt;{formatCurrency(value as number)}&lt;/p&gt;&lt;/div&gt;} />} />
                        <Line type="monotone" dataKey="Revenue" stroke="hsl(var(--chart-2))" />
                        <Line type="monotone" dataKey="Profit" stroke="hsl(var(--chart-1))" />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            <Card>
                <CardHeader>&lt;CardTitle&gt;Top 5 by Revenue&lt;/CardTitle&gt;&lt;/CardHeader&gt;
                &lt;CardContent&gt;
                    &lt;Table&gt;
                        &lt;TableHeader&gt;
                            &lt;TableRow&gt;&lt;TableHead&gt;Item&lt;/TableHead&gt;&lt;TableHead className='text-right'&gt;Revenue&lt;/TableHead&gt;&lt;/TableRow&gt;
                        &lt;/TableHeader&gt;
                        &lt;TableBody&gt;
                            {topByRevenue.map(item =&gt; &lt;TableRow key={item.recipeId}&gt;&lt;TableCell&gt;{item.recipeName}&lt;/TableCell&gt;&lt;TableCell className='text-right'&gt;{formatCurrency(item.totalRevenue)}&lt;/TableCell&gt;&lt;/TableRow&gt;)}
                        &lt;/TableBody&gt;
                    &lt;/Table&gt;
                &lt;/CardContent&gt;
            &lt;/Card&gt;
            &lt;Card&gt;
                &lt;CardHeader&gt;&lt;CardTitle&gt;Top 5 by Profit&lt;/CardTitle&gt;&lt;/CardHeader&gt;
                &lt;CardContent&gt;
                     &lt;Table&gt;
                        &lt;TableHeader&gt;
                            &lt;TableRow&gt;&lt;TableHead&gt;Item&lt;/TableHead&gt;&lt;TableHead className='text-right'&gt;Profit&lt;/TableHead&gt;&lt;/TableRow&gt;
                        &lt;/TableHeader&gt;
                        &lt;TableBody&gt;
                            {topByProfit.map(item =&gt; &lt;TableRow key={item.recipeId}&gt;&lt;TableCell&gt;{item.recipeName}&lt;/TableCell&gt;&lt;TableCell className='text-right'&gt;{formatCurrency(item.totalProfit)}&lt;/TableCell&gt;&lt;/TableRow&gt;)}
                        &lt;/TableBody&gt;
                    &lt;/Table&gt;
                &lt;/CardContent&gt;
            &lt;/Card&gt;
            &lt;Card&gt;
                &lt;CardHeader&gt;&lt;CardTitle&gt;Top 5 by Quantity&lt;/CardTitle&gt;&lt;/CardHeader&gt;
                &lt;CardContent&gt;
                     &lt;Table&gt;
                        &lt;TableHeader&gt;
                            &lt;TableRow&gt;&lt;TableHead&gt;Item&lt;/TableHead&gt;&lt;TableHead className='text-right'&gt;Sold&lt;/TableHead&gt;&lt;/TableRow&gt;
                        &lt;/TableHeader&gt;
                        &lt;TableBody&gt;
                            {topByQuantity.map(item =&gt; &lt;TableRow key={item.recipeId}&gt;&lt;TableCell&gt;{item.recipeName}&lt;/TableCell&gt;&lt;TableCell className='text-right'&gt;{item.totalQuantity}&lt;/TableCell&gt;&lt;/TableRow&gt;)}
                        &lt;/TableBody&gt;
                    &lt;/Table&gt;
                &lt;/CardContent&gt;
            &lt;/Card&gt;
        &lt;/div&gt;
    &lt;/&gt;
    )
  }

  return (
    &lt;div className='space-y-6'&gt;
        &lt;Card&gt;
            &lt;CardHeader&gt;
                &lt;CardTitle&gt;Sales &amp; Profitability Analysis&lt;/CardTitle&gt;
                &lt;CardDescription&gt;Analyze your sales performance for the selected outlet and date range.&lt;/CardDescription&gt;
            &lt;/CardHeader&gt;
            &lt;CardContent&gt;
                &lt;DateRangePicker date={date} onDateChange={setDate} /&gt;
            &lt;/CardContent&gt;
        &lt;/Card&gt;
        {renderContent()}
    &lt;/div&gt;
  )
}
