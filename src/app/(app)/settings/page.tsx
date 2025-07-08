
'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Palette, Shapes, Warehouse, Building } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';

export default function SettingsPage() {
  const { profile, isLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  const settingsLinks = [
   {
    href: '/settings/company',
    title: t('settings_links.company_profile'),
    description: t('settings_links.company_profile_desc'),
    icon: <Building className="size-8" />,
    disabled: false,
  },
  {
    href: '/settings/users',
    title: t('settings_links.user_management'),
    description: t('settings_links.user_management_desc'),
    icon: <Users className="size-8" />,
    disabled: false,
  },
  {
    href: '/settings/appearance',
    title: t('settings_links.theme_appearance'),
    description: t('settings_links.theme_appearance_desc'),
    icon: <Palette className="size-8" />,
    disabled: false,
  },
  {
    href: '/settings/categories',
    title: t('settings_links.inventory_categories'),
    description: t('settings_links.inventory_categories_desc'),
    icon: <Shapes className="size-8" />,
    disabled: false,
  },
  {
    href: '/settings/warehouses',
    title: t('settings_links.warehouse_management'),
    description: t('settings_links.warehouse_management_desc'),
    icon: <Warehouse className="size-8" />,
    disabled: false,
  },
];


  useEffect(() => {
    if (!isLoading && profile?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [profile, isLoading, router]);

  if (isLoading || profile?.role !== 'admin') {
     return (
        <div className="space-y-6">
            <div>
                <Skeleton className="h-9 w-48" />
                <Skeleton className="h-5 w-80 mt-2" />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        </div>
    );
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          {t('settings')}
        </h1>
        <p className="text-muted-foreground">
          {t('settings_desc_page')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((link) => (
          <Link
            key={link.href}
            href={link.disabled ? '#' : link.href}
            className={link.disabled ? 'pointer-events-none' : ''}
          >
            <Card className={`h-full transition-shadow hover:shadow-md ${link.disabled ? 'opacity-50' : ''}`}>
              <CardHeader className="flex flex-row items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {link.icon}
                </div>
                <div>
                  <CardTitle>{link.title}</CardTitle>
                  <CardDescription>{link.description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
