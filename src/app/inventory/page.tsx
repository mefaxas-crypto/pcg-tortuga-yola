import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { InventoryTable } from './components/InventoryTable';

export default function InventoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory">
        <Button>
          <PlusCircle className="mr-2" />
          Add Item
        </Button>
      </PageHeader>
      <InventoryTable />
    </div>
  );
}
