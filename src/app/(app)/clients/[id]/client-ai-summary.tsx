
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { getInteractionSummary } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

interface ClientAiSummaryProps {
  clientId: string;
  clientName: string;
}

export function ClientAiSummary({ clientId, clientName }: ClientAiSummaryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ summary: string } | null>(null);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getInteractionSummary(clientId);
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
  }, [clientId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary"/>
            AI Interaction Summary
        </CardTitle>
        <CardDescription>
          An AI-generated summary of the interaction history with {clientName}.
        </CardDescription>
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
                <AlertTitle>Summary Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
                 <div className="flex justify-end mt-4">
                    <Button onClick={fetchSummary} variant="outline" size="sm" disabled={isLoading}>
                       Regenerate
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
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Regenerating...</>
                        ) : ( 'Regenerate' )}
                    </Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
