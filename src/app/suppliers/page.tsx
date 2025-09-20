'use client';

import PageHeader from '@/components/PageHeader';
import { SuppliersTable } from './components/SuppliersTable';
import { AddSupplierSheet } from './components/AddSupplierSheet';
import { useState } from 'react';
import { SupplierFormSheet } from './components/SupplierFormSheet';
import type { Supplier } from '@/lib/types';

export default function SuppliersPage() {
  const [sheetState, setSheetState] = useState<{
    open: boolean;
    mode: 'add' | 'edit';
    supplier?: Supplier;
  }>({
    open: false,
    mode: 'add',
  });

  const handleAdd = () => {
    setSheetState({ open: true, mode: 'add' });
  };

  const handleEdit = (supplier: Supplier) => {
    setSheetState({ open: true, mode: 'edit', supplier });
  };

  const handleClose = () => {
    setSheetState({ open: false, mode: sheetState.mode });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Suppliers">
        <AddSupplierSheet onOpen={handleAdd} />
      </PageHeader>
      
      <SuppliersTable onEdit={handleEdit} />

      <SupplierFormSheet
        open={sheetState.open}
        mode={sheetState.mode}
        supplier={sheetState.supplier}
        onClose={handleClose}
      />
    </div>
  );
}
