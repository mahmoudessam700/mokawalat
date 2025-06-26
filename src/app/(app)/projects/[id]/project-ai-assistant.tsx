
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import { getProjectRiskAnalysis } from '../actions';
import type { ProjectRiskAnalysisOutput } from '@/ai/flows/project-risk-analysis';
import type { Project } from './page';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ProjectLogSummary } from './project-log-summary';
import { useLanguage } from '@/hooks/use-language';

interface ProjectAiAssistantProps {
  project: Project;
  onSuggestTasks: () => Promise<void>;
  isSuggestingTasks: boolean;
}

const severityVariant: { [key: string]: 'destructive' | 'default' | 'secondary' } = {
  High: 'destructive',
  Medium: 'default',
  Low: 'secondary',
};

export function ProjectAiAssistant({ project, onSuggestTasks, isSuggestingTasks }: ProjectAiAssistantProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ProjectRiskAnalysisOutput | null>(null);
  const { t } = useLanguage();

  const fetchAnalysis = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getProjectRiskAnalysis(project.id);
      if (result.error || !result.data) {
        throw new Error(result.message || 'Failed to get analysis.');
      }
      setAnalysis(result.data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setAnalysis(null);
    } finally {
      setIsLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <CardTitle>{t('projects.ai_project_actions')}</CardTitle>
            <CardDescription>{t('projects.ai_project_actions_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={onSuggestTasks} disabled={isSuggestingTasks}>
                {isSuggestingTasks ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2" />}
                {t('projects.suggest_full_task_list')}
            </Button>
        </CardContent>
      </Card>
        
      <ProjectLogSummary projectId={project.id} />

      <Card>
        <CardHeader>
          <CardTitle>{t('projects.project_risk_analysis_title')}</CardTitle>
          <CardDescription>
            {t('projects.project_risk_analysis_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {error && !isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('projects.analysis_failed')}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <div className="flex justify-end mt-4">
                  <Button onClick={fetchAnalysis} variant="outline" size="sm" disabled={isLoading}>
                      {t('projects.re_analyze')}
                  </Button>
              </div>
            </Alert>
          )}
          
          {analysis?.risks && !isLoading && (
            <div className="space-y-4">
              <div className="flex justify-end">
                  <Button onClick={fetchAnalysis} variant="outline" disabled={isLoading}>
                      {isLoading ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('projects.re_analyzing')}</>
                      ) : ( t('projects.re_analyze') )}
                  </Button>
              </div>
               {analysis.risks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted p-8 text-center">
                      <ShieldCheck className="size-12 text-muted-foreground" />
                      <p className="text-muted-foreground">{t('projects.no_risks_identified', { name: project.name })}</p>
                  </div>
              ) : (
                analysis.risks.map((risk, index) => (
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
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
