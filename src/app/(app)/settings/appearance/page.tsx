
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Palette } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';

export default function AppearanceSettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/settings">
            <ArrowLeft />
            <span className="sr-only">Back to Settings</span>
          </Link>
        </Button>
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            {t('theme_appearance_title')}
          </h1>
          <p className="text-muted-foreground">
            {t('theme_appearance_desc')}
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('appearance')}</CardTitle>
          <CardDescription>
            {t('appearance_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <h3 className="font-medium">{t('theme_mode')}</h3>
              <p className="text-sm text-muted-foreground">{t('theme_mode_desc')}</p>
            </div>
            <ThemeToggle />
          </div>
           <Card className="bg-muted/50">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
               <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Palette className="size-6" />
                </div>
              <div>
                <CardTitle className="text-lg">{t('color_customization')}</CardTitle>
                <CardDescription>
                  {t('color_customization_desc')}
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </CardContent>
      </Card>

    </div>
  );
}
