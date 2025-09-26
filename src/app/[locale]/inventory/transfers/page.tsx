
'use client';

import PageHeader from '@/components/PageHeader';
// Point to shared inventory components (non-localized folder)
import { TransferForm } from '@/app/inventory/components/TransferForm';
import { TransferHistory } from '@/app/inventory/components/TransferHistory';

export default function TransfersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Inventory Transfers" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1">
            <TransferForm />
        </div>
        <div className="lg:col-span-2">
            <TransferHistory />
        </div>
      </div>
    </div>
  );
}

