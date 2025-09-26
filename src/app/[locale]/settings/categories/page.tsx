
'use client';

import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { CategoryFormSheet } from '@/app/settings/categories/components/CategoryFormSheet';
import { CategoriesTable } from '@/app/settings/categories/components/CategoriesTable';

export default function CategoriesPage() {
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleAdd = () => {
    setSheetOpen(true);
  };

  const handleClose = () => {
    setSheetOpen(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Category Management">
        <Button onClick={handleAdd}>
          <PlusCircle className="mr-2" />
          Add New Category
        </Button>
      </PageHeader>
      
      <CategoriesTable />

      <CategoryFormSheet
        open={sheetOpen}
        onClose={handleClose}
      />
    </div>
  );
}
