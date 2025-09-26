
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import PageHeader from '@/components/PageHeader';
import { LowStockItems } from './dashboard/components/LowStockItems';
import { Suspense } from 'react';
import { DashboardStats } from './dashboard/components/DashboardStats';
import { useOutletContext } from '@/context/OutletContext';
import { useAuth } from '@/context/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';


export default function Home() {
  const { selectedOutlet } = useOutletContext();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" />
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="text-2xl mt-4 font-bold tracking-tight">
              Loading...
            </h3>
          </div>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <LoginForm />
  }

  if (!selectedOutlet) {
    return (
       <div className="flex flex-col gap-6">
          <PageHeader title="Dashboard" />
           <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
              <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl mt-4 font-bold tracking-tight">
                  Loading Outlet Information...
              </h3>
              <p className="text-sm text-muted-foreground">
                  Please wait while we prepare the dashboard.
              </p>
              </div>
          </div>
       </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" />

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Low Stock Items</CardTitle>
            <CardDescription>
              These items are below their set par levels. Consider reordering.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Loading...</div>}>
                <LowStockItems showTable={true} />
            </Suspense>
          </CardContent>
        </Card>
        
         <DashboardStats showTopSelling={true} />
        
      </div>
    </div>
  );
}
