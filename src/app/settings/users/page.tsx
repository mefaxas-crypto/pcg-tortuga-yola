
'use client';

import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/context/AuthContext';
import { UsersTable } from './components/UsersTable';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  if (loading || appUser?.role !== 'Admin') {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="User Management" />
      <UsersTable />
    </div>
  );
}
