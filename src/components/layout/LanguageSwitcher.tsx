'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next-intl/client';
import { useState, useTransition } from 'react';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (nextLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleLocaleChange('en')} disabled={locale === 'en'}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLocaleChange('es')} disabled={locale === 'es'}>
          Español
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLocaleChange('fr')} disabled={locale === 'fr'}>
          Français
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
