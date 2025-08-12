
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { getSupplierPerformanceSummary } from '../actions';
import type { SummarizeSupplierPerformanceOutput } from '@/ai/flows/summarize-supplier-performance';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';

interface SupplierAiSummaryProps {
  supplierId: string;
  supplierName: string;
  headerActions?: React.ReactNode;
}

export function SupplierAiSummary({ supplierId, supplierName, headerActions }: SupplierAiSummaryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummarizeSupplierPerformanceOutput | null>(null);
  const { t } = useLanguage();

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getSupplierPerformanceSummary(supplierId);
      if (result.error || !result.data) {
        throw new Error(result.message || 'Failed to get summary.');
      }
      setSummary(result.data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
            <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary"/>
                {t('suppliers.ai_summary_title')}
            </CardTitle>
            <CardDescription>
              {t('suppliers.ai_summary_desc', { supplierName })}
            </CardDescription>
        </div>
        {headerActions}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
            <div className="space-y-3">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        )}

        {error && !isLoading && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('clients.summary_failed')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <div className="flex justify-end mt-4">
                    <Button onClick={fetchSummary} variant="outline" size="sm" disabled={isLoading}>
                       {t('clients.regenerate')}
                    </Button>
                </div>
            </Alert>
        )}

        {summary && !isLoading && (
            <div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{summary.summary}</p>
                <div className="flex justify-end mt-4">
                    <Button onClick={fetchSummary} variant="outline" size="sm" disabled={isLoading}>
                        {isLoading ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('clients.regenerating')}</>
                        ) : ( t('clients.regenerate') )}
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
