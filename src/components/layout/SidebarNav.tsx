
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
} from 'lucide-react';
import { Link } from 'next-intl';
import { useTranslations } from 'next-intl';

export function SidebarNav() {
  const pathname = usePathname();
  const t = useTranslations('SidebarNav');

  const menuItems = [
    { href: '/', label: t('Dashboard'), icon: LayoutDashboard },
    { href: '/inventory', label: t('Inventory'), icon: Warehouse },
    { href: '/suppliers', label: t('Suppliers'), icon: Truck },
    { href: '/recipes', label: t('Recipes'), icon: BookOpen },
    { href: '/menus', label: t('Menus'), icon: ClipboardList },
    { href: '/purchasing', label: t('Purchasing'), icon: PackagePlus },
    { href: '/sales', label: t('Sales'), icon: ShoppingCart },
    { href: '/reports', label: t('Reports'), icon: BarChart3 },
    { href: '/ai-tools', label: t('AITools'), icon: Bot },
  ];

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
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href) && (item.href === '/' ? pathname === '/' : true) && !pathname.startsWith('/settings')}
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
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith('/settings')}
                icon={<Settings />}
                tooltip={t('Settings')}
              >
                <Link href="/settings">
                  {t('Settings')}
                </Link>
              </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
