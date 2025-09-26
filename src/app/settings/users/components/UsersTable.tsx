

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FilePenLine } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { collection, query, orderBy } from 'firebase/firestore';
import type { AppUser, Outlet } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserFormSheet } from './UserFormSheet';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';


export function UsersTable() {
  const { firestore } = useFirebase();
  const [sheetState, setSheetState] = useState<{ open: boolean; user?: AppUser }>({
    open: false,
  });

  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), orderBy('displayName', 'asc')), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<AppUser>(usersQuery);

  const outletsQuery = useMemoFirebase(() => query(collection(firestore, 'outlets')), [firestore]);
  const { data: outlets, isLoading: outletsLoading } = useCollection<Outlet>(outletsQuery);

  const loading = usersLoading || outletsLoading;

  const handleEdit = (user: AppUser) => {
    setSheetState({ open: true, user });
  };

  const handleClose = () => {
    setSheetState({ open: false });
  };
  
  const getRoleBadgeClass = (role: AppUser['role']) => {
    switch (role) {
      case 'Admin':
        return 'bg-primary/20 text-primary-foreground border-primary/50';
      case 'Manager':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/50';
      case 'Chef':
        return 'bg-green-500/20 text-green-700 border-green-500/50';
      case 'Clerk':
      case 'Cook':
        return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
      case 'Pending':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
      default:
        return 'bg-secondary';
    }
  };


  return (
    <>
    <Card>
        <CardHeader>
            <CardTitle>Application Users</CardTitle>
            <CardDescription>
                Manage user roles and approve new accounts. New users will have a &quot;Pending&quot; role by default and must be approved by an Admin to access the app.
            </CardDescription>
        </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role & Assignment</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {!loading &&
                users?.map((user) => {
                  const assignedOutlet = outlets?.find(o => o.id === user.assignedOutletId);
                  return (
                  <TableRow key={user.uid}>
                    <TableCell>
                        <div className='flex items-center gap-3'>
                            <Avatar>
                                <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                                <AvatarFallback>
                                    <User />
                                </AvatarFallback>
                            </Avatar>
                             <div className="font-medium">{user.displayName}</div>
                        </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                     <TableCell>
                        <div className='flex flex-col gap-1'>
                            <Badge variant="outline" className={cn('capitalize w-fit', getRoleBadgeClass(user.role))}>
                                {user.role}
                            </Badge>
                            {assignedOutlet && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Store className="h-3 w-3" />
                                    <span>{assignedOutlet.name}</span>
                                </div>
                            )}
                        </div>
                     </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                            <FilePenLine className="mr-2 h-4 w-4" />
                            Edit Role
                        </Button>
                    </TableCell>
                  </TableRow>
                )})}
            </TableBody>
          </Table>
        </div>
        {!loading && users?.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No users found.
          </div>
        )}
      </CardContent>
    </Card>

    {sheetState.open && (
         <UserFormSheet
            open={sheetState.open}
            user={sheetState.user}
            onClose={handleClose}
        />
    )}
    </>
  );
}
