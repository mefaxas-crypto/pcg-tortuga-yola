'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/link';
import { Languages } from 'lucide-react';

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const changeLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Change language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => changeLocale('en')}
          disabled={locale === 'en'}
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLocale('es')}
          disabled={locale === 'es'}
        >
          Español
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLocale('fr')}
          disabled={locale === 'fr'}
        >
          Français
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
