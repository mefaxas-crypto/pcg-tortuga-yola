'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { InventoryTable } from './components/InventoryTable';
import { useState } from 'react';
import { InventoryItemFormSheet } from './components/InventoryItemFormSheet';

export default function InventoryPage() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory">
        <Button onClick={() => setSheetOpen(true)}>
          <PlusCircle className="mr-2" />
          Add New Ingredient
        </Button>
      </PageHeader>
      <InventoryTable />
      <InventoryItemFormSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
