import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { SuppliersTable } from './components/SuppliersTable';

export default function SuppliersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Suppliers">
        <Button>
          <PlusCircle className="mr-2" />
          Add New Supplier
        </Button>
      </PageHeader>
      <SuppliersTable />
    </div>
  );
}
