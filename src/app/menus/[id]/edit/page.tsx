
'use client';

import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import type { Menu } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuForm } from '../../components/MenuForm';
import { useDoc, useFirebase } from '@/firebase';
import { useMemo } from 'react';

export default function EditMenuPage({ params }: { params: { id: string } }) {
  const { firestore } = useFirebase();
  const { id } = params;
  const docRef = useMemo(() => firestore ? doc(firestore, 'menus', id) : null, [firestore, id]);
  const { data: menu, isLoading: loading } = useDoc<Menu>(docRef);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={loading ? 'Loading...' : `Edit Menu: ${menu?.name}`}
      />
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-1/2" />
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          ) : menu ? (
            <MenuForm mode="edit" menu={menu} />
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Menu not found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
