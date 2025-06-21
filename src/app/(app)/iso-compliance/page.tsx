import { IsoComplianceClient } from './iso-compliance-client';

export default function IsoCompliancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          AI-Driven ISO 9001 Compliance Suggestions
        </h1>
        <p className="text-muted-foreground">
          Get actionable suggestions to improve your ERP operations for better ISO 9001 alignment.
        </p>
      </div>
      <IsoComplianceClient />
    </div>
  );
}
