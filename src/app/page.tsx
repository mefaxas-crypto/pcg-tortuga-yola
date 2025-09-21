
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { topSellingItems } from '@/lib/data';
import { ArrowUpRight, BarChart3, Bot, Package } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import { LowStockItems } from './dashboard/components/LowStockItems';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" />
      <Suspense fallback={
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      }>
        <LowStockItems />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>
              These items are below their set par levels. Consider reordering.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading...</div>}>
                <LowStockItems showTable={true} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Top Selling Items</CardTitle>
              <CardDescription>
                Today's most popular menu items.
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSellingItems.map((item) => (
                  <TableRow key={item.name}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        {item.category}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{item.unitsSold}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
