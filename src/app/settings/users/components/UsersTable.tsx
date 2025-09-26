

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
import type { AppUser } from '@/lib/types';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { UserFormSheet } from './UserFormSheet';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';


export function UsersTable() {
  const { firestore } = useFirebase();
  const [sheetState, setSheetState] = useState<{ open: boolean; user?: AppUser }>({
    open: false,
  });

  const usersQuery = useMemoFirebase(() => query(collection(firestore, 'users'), orderBy('displayName', 'asc')), [firestore]);
  const { data: users, isLoading: loading } = useCollection<AppUser>(usersQuery);

  const handleEdit = (user: AppUser) => {
    setSheetState({ open: true, user });
  };

  const handleClose = () => {
    setSheetState({ open: false });
  };

  return (
    <>
    <Card>
        <CardHeader>
            <CardTitle>Application Users</CardTitle>
            <CardDescription>
                Manage application users.
            </CardDescription>
        </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
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
                    <TableCell><Skeleton className="h-8 w-8 rounded-full ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {!loading &&
                users?.map((user) => {
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
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                            <FilePenLine className="mr-2 h-4 w-4" />
                            Edit
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
