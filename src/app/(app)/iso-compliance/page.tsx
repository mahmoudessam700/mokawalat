
'use client';

import { IsoComplianceClient } from './iso-compliance-client';
import { useLanguage } from '@/hooks/use-language';

export default function IsoCompliancePage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          {t('iso_compliance_title')}
        </h1>
        <p className="text-muted-foreground">
          {t('iso_compliance_desc')}
        </p>
      </div>
      <IsoComplianceClient />
    </div>
  );
}
