
'use client';

import PageHeader from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PurchaseOrderForm } from './components/PurchaseOrderForm';
import { PurchaseOrdersTable } from './components/PurchaseOrdersTable';

export default function PurchasingPage() {

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Purchasing" />
      <Tabs defaultValue="create">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create">Create New PO</TabsTrigger>
          <TabsTrigger value="list">Existing POs</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <PurchaseOrderForm />
        </TabsContent>
        <TabsContent value="list">
          <PurchaseOrdersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
