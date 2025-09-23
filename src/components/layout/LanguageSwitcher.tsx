
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
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (nextLocale: string) => {
    // This removes the current locale from the pathname
    const newPathname = pathname.startsWith(`/${locale}`) ? pathname.substring(`/${locale}`.length) || '/' : pathname;
    
    startTransition(() => {
      router.replace(`/${nextLocale}${newPathname}`);
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
