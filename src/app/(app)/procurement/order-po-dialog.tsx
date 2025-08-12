
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
import { type OrderPoFormValues, orderAndPayPurchaseRequest } from './actions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OrderPoDialogProps {
  request: {
    id: string;
    itemName: string;
    totalCost: number;
  };
  accounts: {
    id: string;
    name: string;
  }[];
  children: ReactNode;
}

const orderPoFormSchema = z.object({
  accountId: z.string().min(1, 'A bank account is required.'),
});

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};

export function OrderPoDialog({ request, accounts, children }: OrderPoDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<OrderPoFormValues>({
    resolver: zodResolver(orderPoFormSchema),
    defaultValues: {
      accountId: '',
    },
  });

  async function onSubmit(values: OrderPoFormValues) {
    if (!accounts || accounts.length === 0) {
      toast({ variant: 'destructive', title: t('error'), description: t('financials.no_accounts_error_desc') });
      return;
    }
    const result = await orderAndPayPurchaseRequest(request.id, values);

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
      <DialogTrigger
        asChild
        onClick={() => {
          if (!accounts || accounts.length === 0) {
            toast({ variant: 'destructive', title: t('error'), description: t('financials.no_accounts_error_desc') });
          }
        }}
      >
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('procurement.order_dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('procurement.order_dialog.desc', {
              name: request.itemName,
              amount: formatCurrency(request.totalCost),
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
                        <FormLabel>{t('employees.payment_account_label')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={!accounts || accounts.length === 0}>
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
                        {(!accounts || accounts.length === 0) && (
                          <p className="text-xs text-muted-foreground mt-1">{t('financials.no_accounts_error_desc')}</p>
                        )}
                    </FormItem>
                )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting || !accounts || accounts.length === 0}>
                {form.formState.isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</>
                ) : (
                  t('procurement.order_dialog.confirm_button')
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
