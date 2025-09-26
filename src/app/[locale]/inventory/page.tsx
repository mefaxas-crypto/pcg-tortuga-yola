
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
import { useOutletContext } from '@/context/OutletContext';

export default function InventoryPage() {
  const { selectedOutlet } = useOutletContext();
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

  if (!selectedOutlet) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Inventory">
          <Button onClick={handleAdd} className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            Add New Ingredient
          </Button>
        </PageHeader>
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl mt-4 font-bold tracking-tight">
              No Outlet Selected
            </h3>
            <p className="text-sm text-muted-foreground">
              Please select an outlet from the header to manage inventory.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory">
        <Button onClick={handleAdd} className="rounded-full">
          <Plus className="mr-2 h-4 w-4" />
          Add New Ingredient
        </Button>
      </PageHeader>

      <Tabs defaultValue="list" className="w-full">
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
        <TabsContent value="transfers">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-1">
              <TransferForm />
            </div>
            <div className="lg:col-span-2">
              <TransferHistory />
            </div>
          </div>
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
