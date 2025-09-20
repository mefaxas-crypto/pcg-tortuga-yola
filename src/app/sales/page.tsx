import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

export default function SalesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sales" />
      <Card>
        <CardHeader>
          <CardTitle>Sales Logging & Live Depletion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
            <div className="flex flex-col items-center gap-1 text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-2xl mt-4 font-bold tracking-tight">
                Sales Integration Coming Soon
              </h3>
              <p className="text-sm text-muted-foreground">
                Log sales and automatically deplete inventory in real-time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
