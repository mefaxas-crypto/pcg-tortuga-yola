'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { InventoryTable } from './components/InventoryTable';
import { useState } from 'react';
import { InventoryItemFormSheet } from './components/InventoryItemFormSheet';
import type { InventoryItem } from '@/lib/types';

export default function InventoryPage() {
  const [sheetState, setSheetState] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    item?: InventoryItem;
  }>({
    open: false,
    mode: 'add',
  });

  const handleAdd = () => {
    setSheetState({ open: true, mode: 'add' });
  };

  const handleEdit = (item: InventoryItem) => {
    setSheetState({ open: true, mode: 'edit', item });
  };

  const handleClose = () => {
    setSheetState({ open: false, mode: sheetState.mode });
  };


  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory">
        <Button onClick={handleAdd} className='rounded-full'>
          <Plus className="mr-2 h-4 w-4" />
          Add New Ingredient
        </Button>
      </PageHeader>
      <InventoryTable onEdit={handleEdit} />
      <InventoryItemFormSheet
        open={sheetState.open}
        mode={sheetState.mode}
        item={sheetState.item}
        onClose={handleClose}
      />
    </div>
  );
}
