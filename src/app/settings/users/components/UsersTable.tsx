
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
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import type { AppUser } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { UserFormSheet } from './UserFormSheet';


export function UsersTable() {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheetState, setSheetState] = useState<{ open: boolean; user?: AppUser }>({
    open: false,
  });

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const data: AppUser[] = [];
        querySnapshot.forEach((doc) => {
          data.push({ uid: doc.id, ...doc.data() } as AppUser);
        });
        setUsers(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleEdit = (user: AppUser) => {
    setSheetState({ open: true, user });
  };

  const handleClose = () => {
    setSheetState({ open: false });
  };
  
  const getRoleBadgeClass = (role: AppUser['role']) => {
    switch (role) {
      case 'Admin':
        return 'bg-primary/20 text-primary border-primary/50';
      case 'Manager':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/50';
      case 'Supervisor':
        return 'bg-purple-500/20 text-purple-700 border-purple-500/50';
      case 'Chef':
        return 'bg-green-500/20 text-green-700 border-green-500/50';
      case 'User':
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
                <TableHead>Role</TableHead>
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
                users?.map((user) => (
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
                        <Badge variant="outline" className={cn('capitalize', getRoleBadgeClass(user.role))}>
                            {user.role}
                        </Badge>
                     </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(user)}>
                            <FilePenLine className="mr-2 h-4 w-4" />
                            Edit Role
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
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
