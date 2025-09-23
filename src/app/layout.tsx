

import {Inter, Playfair_Display} from 'next/font/google';

import {cn} from '@/lib/utils';
import {OutletProvider} from '@/context/OutletContext';
import {Toaster} from '@/components/ui/toaster';
import {Sidebar, SidebarInset, SidebarProvider} from '@/components/ui/sidebar';
import {SidebarNav} from '@/components/layout/SidebarNav';
import {Header} from '@/components/layout/Header';
import './globals.css';

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
};

export default async function RootLayout({children}: Props) {

  return (
    <html
      lang="en"
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
      </body>
    </html>
  );
}
