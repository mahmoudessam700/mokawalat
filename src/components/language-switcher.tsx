'use client';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { Languages } from 'lucide-react';

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  const toggleLanguage = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    setLocale(newLocale);
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleLanguage} aria-label="Toggle language">
      <Languages className="h-[1.2rem] w-[1.2rem]" />
    </Button>
  );
}
