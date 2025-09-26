
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { MenusTable } from './components/MenusTable';

export default function MenusPage() {
  
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Menus">
        <Button asChild>
          <Link href="/menus/new">
            <PlusCircle className="mr-2" />
            Add New Menu
          </Link>
        </Button>
      </PageHeader>
      <MenusTable />
    </div>
  );
}
