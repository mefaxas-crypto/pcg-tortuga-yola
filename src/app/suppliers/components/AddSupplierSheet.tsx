'use client';

import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

type AddSupplierSheetProps = {
  onOpen: () => void;
};

export function AddSupplierSheet({ onOpen }: AddSupplierSheetProps) {
  return (
    <Button onClick={onOpen}>
      <PlusCircle className="mr-2" />
      Add New Supplier
    </Button>
  );
}
