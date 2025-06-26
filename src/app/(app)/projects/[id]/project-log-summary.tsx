
'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Sparkles, Lightbulb } from 'lucide-react';
import { getDailyLogSummary } from '../actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';

interface SummarizeDailyLogsOutput {
  summary: string;
}

interface ProjectLogSummaryProps {
  projectId: string;
}

export function ProjectLogSummary({ projectId }: ProjectLogSummaryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummarizeDailyLogsOutput | null>(null);
  const { t } = useLanguage();

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      const result = await getDailyLogSummary(projectId);
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
  }, [projectId]);
  
  return (
    <Card className="bg-muted/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-5 text-primary"/>
            {t('projects.ai_log_summary_title')}
        </CardTitle>
        <CardDescription>
            {t('projects.ai_log_summary_desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
            <div className="space-y-3 p-4 border rounded-md">
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
            </div>
        )}

        {error && !isLoading && (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('projects.summary_failed')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {summary && !isLoading && (
             <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>{t('projects.generated_summary')}</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{summary.summary}</AlertDescription>
            </Alert>
        )}
        
        <div className="flex justify-end">
            <Button onClick={fetchSummary} variant="outline" disabled={isLoading}>
                {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('generating')}...</>
                ) : (
                    summary ? t('projects.regenerate_summary') : t('projects.generate_summary')
                )}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
