
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { AllergenFormSheet } from './components/AllergenFormSheet';
import { AllergensTable } from './components/AllergensTable';

export default function AllergensPage() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleAdd = () => {
    setSheetOpen(true);
  };

  const handleClose = () => {
    setSheetOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Allergen Management">
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2" />
          Add New Allergen
        </Button>
      </PageHeader>
      
      <AllergensTable />

      <AllergenFormSheet
        open={sheetOpen}
        onClose={handleClose}
      />
    </div>
  );
}
