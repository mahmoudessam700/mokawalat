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
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { adjustStock } from './actions';
import { useLanguage } from '@/hooks/use-language';

interface AdjustStockDialogProps {
  item: {
    id: string;
    name: string;
    quantity: number;
  };
  children: ReactNode;
}

const adjustStockFormSchema = z.object({
  adjustment: z.coerce.number().int().refine(val => val !== 0, { message: "Adjustment cannot be zero." }),
});

type AdjustStockFormValues = z.infer<typeof adjustStockFormSchema>;

export function AdjustStockDialog({ item, children }: AdjustStockDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<AdjustStockFormValues>({
    resolver: zodResolver(adjustStockFormSchema),
    defaultValues: {
      adjustment: 0,
    },
  });

  async function onSubmit(values: AdjustStockFormValues) {
    const result = await adjustStock(item.id, values);

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
      form.reset({ adjustment: 0 });
      setIsOpen(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('inventory.adjust_stock_for', { name: item.name })}</DialogTitle>
          <DialogDescription>
            {t('inventory.current_quantity')}: <strong>{item.quantity}</strong>. {t('inventory.adjust_stock_desc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="adjustment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('inventory.adjustment_amount')}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder={t('inventory.adjustment_placeholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  t('inventory.adjust_stock')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
