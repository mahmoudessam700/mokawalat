'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Reporting & Analytics
        </h1>
        <p className="text-muted-foreground">
          Generate and view detailed reports on all business activities.
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
            <BarChart3 className="size-16" />
            <p>
              Advanced reporting and analytics features will be available here soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
