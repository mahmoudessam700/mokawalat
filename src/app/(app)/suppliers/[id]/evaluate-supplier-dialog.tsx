
'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star } from 'lucide-react';
import { evaluateSupplier } from '../actions';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';

type Supplier = {
  id: string;
  name: string;
  rating?: number;
  evaluationNotes?: string;
};

const evaluateSupplierFormSchema = z.object({
  rating: z.coerce.number().min(1, "Rating is required").max(5),
  evaluationNotes: z.string().optional(),
});

type EvaluateSupplierFormValues = z.infer<typeof evaluateSupplierFormSchema>;

interface EvaluateSupplierDialogProps {
  supplier: Supplier;
}

function StarRatingInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hoverValue, setHoverValue] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          onClick={() => onChange(star)}
          className="cursor-pointer"
        >
          <Star
            className={cn(
              'size-7 transition-colors',
              (hoverValue || value) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function EvaluateSupplierDialog({ supplier }: EvaluateSupplierDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<EvaluateSupplierFormValues>({
    resolver: zodResolver(evaluateSupplierFormSchema),
    defaultValues: {
      rating: supplier.rating || 0,
      evaluationNotes: supplier.evaluationNotes || '',
    },
  });

  async function onSubmit(values: EvaluateSupplierFormValues) {
    const result = await evaluateSupplier(supplier.id, values);

    if (result.errors) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    } else {
      toast({
        title: 'Success',
        description: result.message,
      });
      setIsOpen(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Star className="mr-2" /> {t('suppliers.evaluate_button')}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('suppliers.evaluate_dialog_title', { name: supplier.name })}</DialogTitle>
          <DialogDescription>
            {t('suppliers.evaluate_dialog_desc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.overall_rating_label')}</FormLabel>
                  <FormControl>
                    <StarRatingInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="evaluationNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('suppliers.evaluation_notes_label')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('suppliers.evaluation_notes_placeholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</>
                ) : (
                  t('suppliers.save_evaluation_button')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
