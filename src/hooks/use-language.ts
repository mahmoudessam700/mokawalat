'use client';

import { useContext } from 'react';
import { I18nContext } from '@/lib/i18n/i18n-provider';

export function useLanguage() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within an I18nProvider');
  }
  return context;
}
