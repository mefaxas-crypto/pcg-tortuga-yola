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
import { useOutletContext } from '@/context/OutletContext';

export function OutletSelector() {
  const { outlets, setOutlets, selectedOutlet, setSelectedOutlet } = useOutletContext();
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
        const sortedOutlets = data.sort((a, b) => a.name.localeCompare(b.name));
        setOutlets(sortedOutlets);

        if (!selectedOutlet && sortedOutlets.length > 0) {
          setSelectedOutlet(sortedOutlets[0]);
        } else if (selectedOutlet) {
          // Ensure the selected outlet is still valid
          const stillExists = sortedOutlets.find(o => o.id === selectedOutlet.id);
          if (!stillExists) {
            setSelectedOutlet(sortedOutlets[0] || null);
          }
        }
        
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching outlets:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChange = (outletId: string) => {
    const outlet = outlets.find(o => o.id === outletId);
    setSelectedOutlet(outlet || null);
  };

  if (loading) {
    return <Skeleton className='h-9 w-48' />
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-5 w-5 text-muted-foreground" />
      <Select value={selectedOutlet?.id || ''} onValueChange={handleSelectChange}>
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
