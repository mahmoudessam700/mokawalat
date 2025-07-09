
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
import { useState, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { type MarkAsPaidFormValues, markInvoiceAsPaid } from '../actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MarkAsPaidDialogProps {
  invoice: {
    id: string;
    invoiceNumber: string;
    totalAmount: number;
  };
  accounts: {
    id: string;
    name: string;
  }[];
  children: ReactNode;
}

const markAsPaidSchema = z.object({
  accountId: z.string().min(1, 'An account is required.'),
});

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};

export function MarkAsPaidDialog({ invoice, accounts, children }: MarkAsPaidDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<MarkAsPaidFormValues>({
    resolver: zodResolver(markAsPaidSchema),
    defaultValues: {
      accountId: '',
    },
  });

  async function onSubmit(values: MarkAsPaidFormValues) {
    const result = await markInvoiceAsPaid(invoice.id, values);

    if (result.success) {
      toast({ title: t('success'), description: result.message });
      form.reset();
      setIsOpen(false);
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('invoices.mark_as_paid_dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('invoices.mark_as_paid_dialog.desc', {
              number: invoice.invoiceNumber,
              amount: formatCurrency(invoice.totalAmount),
            })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
                control={form.control}
                name="accountId"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>{t('invoices.mark_as_paid_dialog.account_label')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder={t('employees.select_account_placeholder')} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {accounts.map(account => (
                                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</>
                ) : (
                  t('invoices.mark_as_paid_dialog.confirm_button')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
