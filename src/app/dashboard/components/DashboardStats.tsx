
'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from '@/components/ui/table';
import { db } from '@/lib/firebase';
import type { Sale } from '@/lib/types';
import { collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { BarChart3, Bot, Package, ArrowUpRight } from 'lucide-react';
import { Link } from 'next-intl';
import { useEffect, useState, useMemo } from 'react';
import { useOutletContext } from '@/context/OutletContext';
import { LowStockItems } from './LowStockItems';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

type DashboardStatsProps = {
    showTopSelling?: boolean;
}

type AggregatedSale = {
  recipeName: string;
  category: string;
  unitsSold: number;
}

export function DashboardStats({ showTopSelling = false }: DashboardStatsProps) {
  const { selectedOutlet } = useOutletContext();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedOutlet) {
      setSales([]);
      setLoading(false);
      return;
    };
    setLoading(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
      collection(db, 'sales'),
      where('outletId', '==', selectedOutlet.id),
      where('saleDate', '>=', Timestamp.fromDate(today)),
      where('saleDate', '<', Timestamp.fromDate(tomorrow))
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const salesData: Sale[] = [];
        snapshot.forEach((doc) => {
          salesData.push({ id: doc.id, ...doc.data() } as Sale);
        });
        setSales(salesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching today\'s sales:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [selectedOutlet]);

  const { totalRevenue, totalSales } = useMemo(() => {
    return sales.reduce((acc, sale) => {
        acc.totalRevenue += sale.totalRevenue;
        acc.totalSales += sale.quantity;
        return acc;
    }, { totalRevenue: 0, totalSales: 0 });
  }, [sales]);
  
  const topSellingItems = useMemo(() => {
    const itemMap = new Map<string, AggregatedSale>();
    sales.forEach(sale => {
        const existing = itemMap.get(sale.recipeId);
        if (existing) {
            existing.unitsSold += sale.quantity;
        } else {
            itemMap.set(sale.recipeId, {
                recipeName: sale.recipeName,
                category: sale.menuName,
                unitsSold: sale.quantity,
            });
        }
    });
    return Array.from(itemMap.values()).sort((a,b) => b.unitsSold - a.unitsSold).slice(0, 5);
  }, [sales]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  }

  if (showTopSelling) {
    return (
         <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Top Selling Items Today</CardTitle>
              <CardDescription>
                Today&apos;s most popular menu items for this outlet.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/sales">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
             {loading ? (
                <div className='space-y-2'>
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
             ) : topSellingItems.length > 0 ? (
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Units Sold</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {topSellingItems.map((item) => (
                    <TableRow key={item.recipeName}>
                        <TableCell>
                        <div className="font-medium">{item.recipeName}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">
                            {item.category}
                        </div>
                        </TableCell>
                        <TableCell className="text-right">{item.unitsSold}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
             ) : (
                <div className="py-12 text-center text-muted-foreground">
                    No sales logged today.
                </div>
             )}
          </CardContent>
        </Card>
    );
  }

  // Render stat cards
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <line x1="12" x2="12" y1="2" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-7 w-32 mt-1" /> : (
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          )}
          <p className="text-xs text-muted-foreground">
            {selectedOutlet?.name}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sales Count Today</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
           {loading ? <Skeleton className="h-7 w-16 mt-1" /> : (
             <div className="text-2xl font-bold">+{totalSales}</div>
           )}
          <p className="text-xs text-muted-foreground">Total items sold today</p>
        </CardContent>
      </Card>
      
      <LowStockItems />
      
      <Card className="bg-accent/20 border-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            AI Waste Prediction
          </CardTitle>
          <Bot className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">~ $125.50</div>
           <Link href="/ai-tools">
             <p className="text-xs text-muted-foreground hover:underline">
              Predicted waste for today
            </p>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
