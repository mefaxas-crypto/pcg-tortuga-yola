
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Store } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useOutletContext } from '@/context/OutletContext';
import { useAuth } from '@/context/AuthContext';

export function OutletSelector() {
  const { outlets, selectedOutlet, setSelectedOutlet, isLoading } = useOutletContext();
  const { appUser } = useAuth();

  const isRestrictedUser = appUser && (appUser.role === 'Clerk' || appUser.role === 'Cook');

  const handleSelectChange = (outletId: string) => {
    if (isRestrictedUser) return; // Prevent changing if restricted
    const outlet = outlets.find(o => o.id === outletId);
    setSelectedOutlet(outlet || null);
  };

  if (isLoading) {
    return <Skeleton className='h-9 w-48' />;
  }
  
  if (isRestrictedUser && !selectedOutlet) {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive font-medium">
         <Store className="h-5 w-5" />
         <span>No Outlet Assigned</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="h-5 w-5 text-muted-foreground" />
      <Select value={selectedOutlet?.id || ''} onValueChange={handleSelectChange} disabled={isRestrictedUser || outlets.length === 0}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={outlets.length === 0 ? "No outlets found" : "Select Outlet"} />
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
