import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PackagePlus } from 'lucide-react';

export default function PurchasingPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Purchasing" />
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            Create and manage purchase orders for your suppliers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
            <div className="flex flex-col items-center gap-1 text-center">
              <PackagePlus className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-2xl mt-4 font-bold tracking-tight">
                Purchase Order System Coming Soon
              </h3>
              <p className="text-sm text-muted-foreground">
                You&apos;ll be able to create, receive, and track purchase orders here.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
