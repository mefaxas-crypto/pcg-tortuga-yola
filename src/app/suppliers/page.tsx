import PageHeader from '@/components/PageHeader';
import { SuppliersTable } from './components/SuppliersTable';
import { AddSupplierSheet } from './components/AddSupplierSheet';

export default function SuppliersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Suppliers">
        <AddSupplierSheet />
      </PageHeader>
      <SuppliersTable />
    </div>
  );
}
