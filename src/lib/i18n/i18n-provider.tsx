
'use client';

import React, { createContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import dictionary from './dictionaries.json';

type Locale = 'en' | 'ar';

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, substitutions?: Record<string, string>) => string;
}

export const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const savedLocale = localStorage.getItem('locale') as Locale | null;
    if (savedLocale && (savedLocale === 'en' || savedLocale === 'ar')) {
      setLocaleState(savedLocale);
      document.documentElement.lang = savedLocale;
      document.documentElement.dir = savedLocale === 'ar' ? 'rtl' : 'ltr';
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
    document.documentElement.lang = newLocale;
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
  };

  const t = useCallback((key: string, substitutions?: Record<string, string>): string => {
    const keys = key.split('.');
    let result: any = dictionary[locale];
    
    // Traverse the dictionary for the current locale
    for (const k of keys) {
      result = result?.[k];
      if (result === undefined) {
        // If key not found, break and try the fallback
        break;
      }
    }

    // If the result is not a string, try the English fallback
    if (typeof result !== 'string') {
        let fallbackResult: any = dictionary['en'];
        for (const k of keys) {
            fallbackResult = fallbackResult?.[k];
            if (fallbackResult === undefined) {
                break;
            }
        }
        result = fallbackResult;
    }

    // If we still don't have a string, return the key itself as a last resort
    if (typeof result !== 'string') {
        return key;
    }

    // Perform substitutions
    if (substitutions) {
        Object.entries(substitutions).forEach(([subKey, subValue]) => {
            result = result.replace(`{${subKey}}`, subValue);
        });
    }

    return result;
  }, [locale]);

  const value = { locale, setLocale, t };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
