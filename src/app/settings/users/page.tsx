
'use client';

import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { UsersTable } from './components/UsersTable';
import { useEffect } from 'react';
import { useRouter } from 'next-intl';

export default function UsersPage() {
  const { appUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth is done loading and the user is not an Admin, redirect them.
    if (!loading && appUser?.role !== 'Admin') {
      router.push('/settings');
    }
  }, [appUser, loading, router]);
  
  // Render nothing or a loading spinner while we check the role.
  if (loading || !appUser || appUser.role !== 'Admin') {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader title="User Management" />
             <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
                <div className="flex flex-col items-center gap-1 text-center">
                <h3 className="text-2xl mt-4 font-bold tracking-tight">
                    Access Denied
                </h3>
                <p className="text-sm text-muted-foreground">
                    You do not have permission to manage users.
                </p>
                </div>
            </div>
        </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="User Management" />
      <UsersTable />
    </div>
  );
}
