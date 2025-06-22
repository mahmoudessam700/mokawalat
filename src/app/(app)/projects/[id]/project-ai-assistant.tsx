'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Lightbulb, Loader2, ShieldCheck } from 'lucide-react';
import { getProjectRiskAnalysis, type ProjectRiskAnalysisOutput } from '../actions';
import type { Project } from './page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface ProjectAiAssistantProps {
  project: Project;
}

const severityVariant: { [key: string]: 'destructive' | 'default' | 'secondary' } = {
  High: 'destructive',
  Medium: 'default',
  Low: 'secondary',
};

export function ProjectAiAssistant({ project }: ProjectAiAssistantProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProjectRiskAnalysisOutput | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      const result = await getProjectRiskAnalysis(project.id);
      if (result.error || !result.data) {
        throw new Error(result.message || 'Failed to get analysis.');
      }
      setAnalysis(result.data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Risk Analysis</CardTitle>
        <CardDescription>
          Use AI to analyze the project's details and identify potential risks and mitigation strategies.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!analysis && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted p-8 text-center">
                <Lightbulb className="size-12 text-muted-foreground" />
                <p className="text-muted-foreground">Ready to analyze potential risks for "{project.name}".</p>
                <Button onClick={handleAnalyze} disabled={isLoading}>
                    {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                    ) : ( 'Analyze Project Risks' )}
                </Button>
            </div>
        )}

        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-3/5" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Analysis Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {analysis?.risks && (
          <div className="space-y-4">
            <div className="flex justify-end">
                <Button onClick={handleAnalyze} variant="outline" disabled={isLoading}>
                    {isLoading ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Re-analyzing...</>
                    ) : ( 'Re-analyze' )}
                </Button>
            </div>
            {analysis.risks.map((risk, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base font-semibold">{risk.risk}</CardTitle>
                    <Badge variant={severityVariant[risk.severity]}>{risk.severity}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 pt-1 text-primary">
                            <ShieldCheck className="size-4" />
                        </div>
                        <p className="text-sm text-muted-foreground">{risk.mitigation}</p>
                    </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
