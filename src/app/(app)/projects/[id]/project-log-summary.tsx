'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Sparkles, Lightbulb } from 'lucide-react';
import { getDailyLogSummary } from '../actions';
import type { SummarizeDailyLogsOutput } from '@/ai/flows/summarize-daily-logs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface ProjectLogSummaryProps {
  projectId: string;
}

export function ProjectLogSummary({ projectId }: ProjectLogSummaryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummarizeDailyLogsOutput | null>(null);

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
            AI Daily Log Summary
        </CardTitle>
        <CardDescription>
            Click the button to generate an AI-powered summary of all daily logs for this project.
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
                <AlertTitle>Summary Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {summary && !isLoading && (
             <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertTitle>Generated Summary</AlertTitle>
                <AlertDescription className="whitespace-pre-wrap">{summary.summary}</AlertDescription>
            </Alert>
        )}
        
        <div className="flex justify-end">
            <Button onClick={fetchSummary} variant="outline" disabled={isLoading}>
                {isLoading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                    summary ? 'Regenerate Summary' : 'Generate Summary'
                )}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
