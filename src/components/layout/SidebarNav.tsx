
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '../ui/sidebar';
import {
  BarChart3,
  BookOpen,
  Bot,
  LayoutDashboard,
  Settings,
  ShoppingCart,
  Truck,
  Warehouse,
  UtensilsCrossed,
  PackagePlus,
  ClipboardList,
  ChromeIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export function SidebarNav() {
  const pathname = usePathname();
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [signInLoading, setSignInLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setSignInLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Sign In Failed',
        description:
          err instanceof Error ? err.message : 'An unknown error occurred. Please try again.',
      });
    } finally {
      setSignInLoading(false);
    }
  };

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/inventory', label: 'Inventory', icon: Warehouse },
    { href: '/suppliers', label: 'Suppliers', icon: Truck },
    { href: '/recipes', label: 'Recipes', icon: BookOpen },
    { href: '/menus', label: 'Menus', icon: ClipboardList },
    { href: '/purchasing', label: 'Purchasing', icon: PackagePlus },
    { href: '/sales', label: 'Sales', icon: ShoppingCart },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/ai-tools', label: 'AI Tools', icon: Bot },
  ];
  
  const isLoading = authLoading || signInLoading;

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tighter font-headline">
              PCG Kitchen Manager
            </h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {user ? (
            <SidebarMenu>
            {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))}
                    icon={<item.icon />}
                    tooltip={item.label}
                >
                    <Link href={item.href}>
                    {item.label}
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
            </SidebarMenu>
        ) : (
            <div className='p-4'>
                <p className='text-sm text-sidebar-foreground/80 mb-4'>
                    Please sign in to access the application.
                </p>
                 <Button
                    variant="secondary"
                    onClick={handleGoogleSignIn}
                    disabled={isLoading}
                    className='w-full'
                >
                    <ChromeIcon className="mr-2 h-4 w-4" />
                    {isLoading ? 'Signing in...' : 'Sign in with Google'}
                </Button>
            </div>
        )}
      </SidebarContent>
      {user && (
        <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith('/settings')}
                    icon={<Settings />}
                    tooltip={'Settings'}
                >
                    <Link href="/settings">
                    {'Settings'}
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
      )}
    </>
  );
}
