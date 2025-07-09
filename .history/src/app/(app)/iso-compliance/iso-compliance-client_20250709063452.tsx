
'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { getComplianceSuggestions, type FormState } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/hooks/use-language';

const initialState: FormState = {
  message: null,
  data: null,
  error: false,
};

function SubmitButton({ pending }: { pending: boolean }) {
  const { t } = useLanguage();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {t('generating')}...
        </>
      ) : (
        t('get_suggestions')
      )}
    </Button>
  );
}

function Results({ state, pending }: { state: FormState; pending: boolean }) {
  const { t } = useLanguage();

  if (pending) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-7 w-2/5" />
          <Skeleton className="h-4 w-4/5" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-start gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!state.message) return null;

  return (
    <>
      <Alert variant={state.error ? 'destructive' : 'default'}>
        {state.error ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
        <AlertTitle>{state.error ? t('error') : t('status')}</AlertTitle>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>

      {state.data?.suggestions && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">{t('compliance_suggestions')}</CardTitle>
            <CardDescription>
              {t('compliance_suggestions_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {state.data.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle className="h-5 w-5" />
                  </span>
                  <p className="flex-1 pt-1">{suggestion}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}


export function IsoComplianceClient() {
  const [state, setState] = useState<FormState>(initialState);
  const [pending, setPending] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (formData: FormData) => {
    setPending(true);
    try {
      const result = await getComplianceSuggestions(initialState, formData);
      setState(result);
    } catch (error) {
      setState({
        message: 'An error occurred',
        data: null,
        error: true,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <form action={handleSubmit} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">{t('describe_erp_ops')}</CardTitle>
          <CardDescription>
            {t('describe_erp_ops_desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            name="erpDescription"
            placeholder={t('erp_ops_placeholder')}
            rows={8}
            required
            aria-label="ERP Operations Description"
          />
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-sm text-muted-foreground">
            {t('suggestions_by_ai')}
          </p>
          <SubmitButton pending={pending} />
        </CardFooter>
      </Card>

      <Results state={state} />
    </form>
  );
}
