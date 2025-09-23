
'use client';

import PageHeader from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
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
          <Card>
            <CardHeader>
                <CardTitle>Existing Purchase Orders</CardTitle>
                <CardDescription>
                    Manage active and view historical purchase orders.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="active" className='w-full'>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="active">Active</TabsTrigger>
                        <TabsTrigger value="history">History</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active">
                        <PurchaseOrdersTable status="active" />
                    </TabsContent>
                    <TabsContent value="history">
                        <PurchaseOrdersTable status="history" />
                    </TabsContent>
                </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
