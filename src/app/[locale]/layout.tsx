
import {notFound} from 'next/navigation';
import {NextIntlClientProvider, useMessages} from 'next-intl';
import {Inter, Playfair_Display} from 'next/font/google';

import {cn} from '@/lib/utils';
import {OutletProvider} from '@/context/OutletContext';
import {Toaster} from '@/components/ui/toaster';
import {Sidebar, SidebarInset, SidebarProvider} from '@/components/ui/sidebar';
import {SidebarNav} from '@/components/layout/SidebarNav';
import {Header} from '@/components/layout/Header';
import '../globals.css';

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

type Props = {
  children: React.ReactNode;
  params: {locale: string};
};

export default function LocaleLayout({children, params: {locale}}: Props) {
  // Validate that the locale parameter is valid
  if (!['en', 'es', 'fr'].includes(locale)) notFound();

  const messages = useMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${playfairDisplay.variable}`}
    >
      <head>
        <title>PCG Kitchen Manager</title>
        <meta
          name="description"
          content="A comprehensive kitchen management system."
        />
      </head>
      <body className={cn('font-body antialiased min-h-screen')}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <OutletProvider>
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
          </OutletProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
