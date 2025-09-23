'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/firebase';
import type { Outlet } from '@/lib/types';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Store } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

export function OutletSelector() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'outlets'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Outlet[] = [];
        snapshot.forEach((doc) =>
          data.push({ id: doc.id, ...doc.data() } as Outlet)
        );
        setOutlets(data.sort((a, b) => a.name.localeCompare(b.name)));
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching outlets:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <Skeleton className='h-9 w-48' />
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-5 w-5 text-muted-foreground" />
      <Select defaultValue={outlets[0]?.id}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select Outlet" />
        </SelectTrigger>
        <SelectContent>
          {outlets.map((outlet) => (
            <SelectItem key={outlet.id} value={outlet.id}>
              {outlet.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
