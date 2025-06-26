'use client';

import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { Header } from '@/components/header';
import { Sidebar, SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useLanguage } from '@/hooks/use-language';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { locale } = useLanguage();
  const sidebarSide = locale === 'ar' ? 'right' : 'left';

  return (
    <SidebarProvider side={sidebarSide}>
      <Sidebar side={sidebarSide}>
        <AppSidebar />
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="p-4 lg:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
