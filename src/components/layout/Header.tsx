
'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { placeholderImages } from '@/lib/placeholder-images.json';
import { LogOut, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { OutletSelector } from './OutletSelector';
import { useAuth } from '@/context/AuthContext';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';


export function Header() {
  const userImage = placeholderImages.find(p => p.id === 'user-avatar');
  const { user, appUser, logout } = useAuth();

  const getRoleBadgeClass = (role: string | undefined) => {
    if (!role) return '';
    switch (role) {
      case 'Admin':
        return 'bg-primary/20 text-primary-foreground border-primary/50';
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
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6">
      <SidebarTrigger className="md:hidden" />

      {user && <OutletSelector />}

      <div className="flex-1" />
      
      {user && appUser && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-9 w-9">
                {userImage && <AvatarImage src={user.photoURL || userImage.imageUrl} alt="User Avatar" data-ai-hint={userImage.imageHint} />}
                <AvatarFallback>
                  <User />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
                    <Badge variant="outline" className={cn('capitalize text-xs', getRoleBadgeClass(appUser.role))}>
                        {appUser.role}
                    </Badge>
                </div>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
