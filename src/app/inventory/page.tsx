
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { InventoryTable } from './components/InventoryTable';
import { useState } from 'react';
import { InventoryItemFormSheet } from './components/InventoryItemFormSheet';
import type { InventoryItem } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PhysicalCountTable } from './components/PhysicalCountTable';
import { TransferForm } from './components/TransferForm';
import { TransferHistory } from './components/TransferHistory';


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
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Ingredient
        </Button>
      </PageHeader>
      
      <Tabs defaultValue="list">
        <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="list">Inventory List</TabsTrigger>
            <TabsTrigger value="count">Physical Count</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
            <InventoryTable onEdit={handleEdit} />
        </TabsContent>
        <TabsContent value="count">
            <PhysicalCountTable />
        </TabsContent>
        <TabsContent value="transfers" className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <TransferForm />
            <TransferHistory />
        </TabsContent>
      </Tabs>

      <InventoryItemFormSheet
        open={sheetState.open}
        mode={sheetState.mode}
        item={sheetState.item}
        onClose={handleClose}
      />
    </div>
  );
}
