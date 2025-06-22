'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

export default function FinancialsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Financial & Accounting Management
        </h1>
        <p className="text-muted-foreground">
          Track income, expenses, and manage financial records.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            This module is currently under development.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
            <DollarSign className="size-16" />
            <p>
              Full financial tracking, including income, expenses, and
              reporting, will be available here soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
