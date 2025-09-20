import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';

export default function FabricationPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fabrication" />
      <Card>
        <CardHeader>
          <CardTitle>Fabrication & Yield Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
            <div className="flex flex-col items-center gap-1 text-center">
              <Flame className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-2xl mt-4 font-bold tracking-tight">
                Fabrication Specs Coming Soon
              </h3>
              <p className="text-sm text-muted-foreground">
                Define specs for butchering and fabrication to calculate true cost and inventory.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
