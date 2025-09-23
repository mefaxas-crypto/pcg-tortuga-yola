
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { OutletsTable } from './components/OutletsTable';
import { OutletFormSheet } from './components/OutletFormSheet';
import type { Outlet } from '@/lib/types';


export default function OutletsPage() {
  const [sheetState, setSheetState] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    outlet?: Outlet;
  }>({
    open: false,
    mode: 'add',
  });

  const handleAdd = () => {
    setSheetState({ open: true, mode: 'add' });
  };

  const handleEdit = (outlet: Outlet) => {
    setSheetState({ open: true, mode: 'edit', outlet });
  };

  const handleClose = () => {
    setSheetState({ open: false, mode: sheetState.mode });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Outlet Management">
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2" />
          Add New Outlet
        </Button>
      </PageHeader>
      
      <OutletsTable onEdit={handleEdit} />

      <OutletFormSheet
        open={sheetState.open}
        mode={sheetState.mode}
        outlet={sheetState.outlet}
        onClose={handleClose}
      />
    </div>
  );
}
