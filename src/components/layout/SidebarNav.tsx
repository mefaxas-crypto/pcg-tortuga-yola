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
  Users,
  UtensilsCrossed,
  Warehouse,
  Flame
} from 'lucide-react';
import Link from 'next/link';

export function SidebarNav() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/inventory', label: 'Ingredients', icon: Warehouse },
    { href: '/suppliers', label: 'Suppliers', icon: Truck },
    { href: '/recipes', label: 'Recipes', icon: BookOpen },
    { href: '/fabrication', label: 'Fabrication', icon: Flame },
    { href: '/sales', label: 'Sales', icon: ShoppingCart },
    { href: '/reports', label: 'Reports', icon: BarChart3 },
    { href: '/waste-prediction', label: 'AI Tools', icon: Bot },
  ];

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold tracking-tighter font-headline">
              Pantry Pilot
            </h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  icon={<item.icon />}
                  tooltip={item.label}
                >
                  {item.label}
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/settings" legacyBehavior passHref>
              <SidebarMenuButton
                isActive={pathname === '/settings'}
                icon={<Settings />}
                tooltip="Settings"
              >
                Settings
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
