
'use client';

import { Inter, Playfair_Display } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { cn } from '@/lib/utils';
import { OutletProvider, useOutletContext } from '@/context/OutletContext';
import { Toaster } from '@/components/ui/toaster';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/layout/SidebarNav';
import { Header } from '@/components/layout/Header';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import './globals.css';
import { useEffect } from 'react';

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

const THEMES = ['theme-bamboo', 'theme-ocean'];

function ThemedLayout({ children }: { children: React.ReactNode }) {
  const { selectedOutlet } = useOutletContext();

  useEffect(() => {
    const root = document.documentElement;
    
    root.classList.remove(...THEMES);
    
    const theme = selectedOutlet?.theme || 'theme-bamboo';
    
    if (theme) {
      root.classList.add(theme);
    }
  }, [selectedOutlet]);

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
        <SidebarProvider>
          <Sidebar>
            <SidebarNav />
          </Sidebar>
          <SidebarInset>
            <Header />
            <main className="p-4 lg:p-6 max-w-7xl mx-auto">
              <AuthGuard>{children}</AuthGuard>
            </main>
          </SidebarInset>
          <Toaster />
        </SidebarProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[400px]">
        <div className="flex flex-col items-center gap-1 text-center">
          <h3 className="text-2xl mt-4 font-bold tracking-tight">
            Loading...
          </h3>
          <p className="text-sm text-muted-foreground">
            Authenticating your session.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    // The sidebar will show the sign-in button.
    // We render nothing in the main content area to prevent data fetching.
    return null;
  }
  
  // If we have a user, render the page.
  return <>{children}</>;
}


export default function RootLayout({ children }: Props) {
  return (
    <AuthProvider>
      <OutletProvider>
        <ThemedLayout>
            {children}
        </ThemedLayout>
      </OutletProvider>
    </AuthProvider>
  );
}
