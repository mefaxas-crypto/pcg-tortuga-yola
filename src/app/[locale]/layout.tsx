
'use client';

import '../globals.css';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { Header } from '@/components/layout/Header';
import { Inter, Playfair_Display } from 'next/font/google';
import { OutletProvider, useOutletContext } from '@/context/OutletContext';
import { useEffect } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, useMessages } from 'next-intl';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair-display',
});

function AppBody({ children }: { children: React.ReactNode }) {
  const { selectedOutlet } = useOutletContext();

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove('theme-layola', 'theme-bamboo');
    
    if (selectedOutlet?.name.toLowerCase().includes('yola')) {
      html.classList.add('theme-layola');
    } else if (selectedOutlet?.name.toLowerCase().includes('bamboo')) {
      html.classList.add('theme-bamboo');
    } else {
      // Default theme if no match, or for Tortuga Bay
      html.classList.add('theme-layola');
    }
  }, [selectedOutlet]);

  return (
    <body className={cn('font-body antialiased min-h-screen')}>
      <SidebarProvider>
        <Sidebar>
          <SidebarNav />
        </Sidebar>
        <SidebarInset>
          <Header />
          <main className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</main>
        </SidebarInset>
        <Toaster />
      </SidebarProvider>
    </body>
  );
}

type Props = {
  children: React.ReactNode;
  params: {locale: string};
};

export default function LocaleLayout({
  children,
  params: {locale},
}: Props) {
  const messages = useMessages();
  
  return (
    <html lang={locale} className={`${inter.variable} ${playfairDisplay.variable}`}>
      <head>
        <title>PCG Kitchen Manager</title>
        <meta name="description" content="A comprehensive kitchen management system." />
      </head>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <OutletProvider>
            <AppBody>{children}</AppBody>
        </OutletProvider>
      </NextIntlClientProvider>
    </html>
  );
}
