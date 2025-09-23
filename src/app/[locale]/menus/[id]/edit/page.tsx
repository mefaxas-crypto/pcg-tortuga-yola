
'use client';

import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import type { Menu } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { MenuForm } from '../../../components/MenuForm';

export default function EditMenuPage({ params }: { params: { id: string } }) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const { id } = params;

  useEffect(() => {
    const fetchMenu = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'menus', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setMenu({ id: docSnap.id, ...docSnap.data() } as Menu);
        } else {
          console.log('No such document!');
        }
      } catch (error) {
        console.error('Error fetching menu:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [id]);

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
