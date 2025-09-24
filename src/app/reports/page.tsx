
'use client';

import PageHeader from '@/components/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SalesAndProfitability } from './components/SalesAndProfitability';
import { VarianceAnalysis } from './components/VarianceAnalysis';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

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
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
              <SalesAndProfitability />
            </Suspense>
        </TabsContent>
        <TabsContent value="variance">
            <Suspense fallback={<Skeleton className="h-[600px] w-full" />}>
              <VarianceAnalysis />
            </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
