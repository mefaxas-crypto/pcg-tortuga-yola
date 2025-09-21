
'use client';

import {
  Card,
  CardContent,
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
import { db } from '@/lib/firebase';
import type { InventoryItem } from '@/lib/types';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { BarChart3, Bot, Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type LowStockItemsProps = {
    showTable?: boolean;
}

export function LowStockItems({ showTable = false }: LowStockItemsProps) {
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'inventory'),
      where('status', 'in', ['Low Stock', 'Out of Stock'])
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: InventoryItem[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as InventoryItem);
        });
        setLowStockItems(items.sort((a,b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching low stock items:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (showTable) {
    if (loading) {
        return <div className="py-12 text-center text-muted-foreground">Loading...</div>
    }
    if (lowStockItems.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          All items are well-stocked!
        </div>
      );
    }
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className='text-right'>Quantity</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {lowStockItems.map(item => (
                    <TableRow key={item.id}>
                        <TableCell className='font-medium'>{item.name}</TableCell>
                        <TableCell className='text-right'>{item.quantity} {item.unit}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
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
          <div className="text-2xl font-bold">$4,291.37</div>
          <p className="text-xs text-muted-foreground">
            +12.1% from yesterday
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sales Count</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+212</div>
          <p className="text-xs text-muted-foreground">+15% from last hour</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{loading ? '...' : lowStockItems.length}</div>
          <Link href="/inventory">
            <p className="text-xs text-muted-foreground hover:underline">
                Items below par level
            </p>
          </Link>
        </CardContent>
      </Card>
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
