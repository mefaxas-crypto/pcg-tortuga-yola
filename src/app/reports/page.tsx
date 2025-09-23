
'use client';

import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesAndProfitability } from './components/SalesAndProfitability';
import { VarianceAnalysis } from './components/VarianceAnalysis';

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Reports" />
       <Tabs defaultValue="sales">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sales">Sales & Profitability</TabsTrigger>
          <TabsTrigger value="variance">Variance Analysis</TabsTrigger>
        </TabsList>
        <TabsContent value="sales">
            <SalesAndProfitability />
        </TabsContent>
        <TabsContent value="variance">
            <VarianceAnalysis />
        </TabsContent>
      </Tabs>
    </div>
  );
}
