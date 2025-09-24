import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SalesForm } from './components/SalesForm';
import { RecentSales } from './components/RecentSales';

export default function SalesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Sales Logging" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Log a New Sale</CardTitle>
              <CardDescription>
                Select a menu and item to record a sale.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesForm />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Recent Sales</CardTitle>
                    <CardDescription>
                        A list of your most recent transactions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales />
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
