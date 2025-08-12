
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, PlusCircle, Trash2, ArrowLeft, Banknote } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useMemo } from 'react';
import { addAccount, deleteAccount, updateAccount, type AccountFormValues } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';

const accountFormSchema = z.object({
  name: z.string().min(2, "Account name must be at least 2 characters long."),
  bankName: z.string().min(2, "Bank name is required."),
  accountNumber: z.string().optional(),
  initialBalance: z.coerce.number(),
});

type Account = {
  id: string;
  name: string;
  bankName: string;
  accountNumber?: string;
  initialBalance: number;
  createdAt: Timestamp;
};

type Transaction = {
    id: string;
    amount: number;
    type: 'Income' | 'Expense';
    accountId: string;
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const qAccounts = query(collection(firestore, 'accounts'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qAccounts, (snapshot) => {
      const data: Account[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
      setAccounts(data);
      setIsLoading(false);
    }));

    const qTransactions = query(collection(firestore, 'transactions'));
     unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const accountBalances = useMemo(() => {
    const balances = new Map<string, number>();
    accounts.forEach(acc => {
        let currentBalance = acc.initialBalance;
        transactions.forEach(t => {
            if (t.accountId === acc.id) {
                if (t.type === 'Income') currentBalance += t.amount;
                else currentBalance -= t.amount;
            }
        });
        balances.set(acc.id, currentBalance);
    });
    return balances;
  }, [accounts, transactions]);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      bankName: '',
      accountNumber: '',
      initialBalance: 0,
    },
  });

  useEffect(() => {
    if (accountToEdit) {
      form.reset(accountToEdit);
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [accountToEdit, form]);

  async function onSubmit(values: AccountFormValues) {
    const result = accountToEdit
      ? await updateAccount(accountToEdit.id, values)
      : await addAccount(values);

    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      setIsFormDialogOpen(false);
      setAccountToEdit(null);
    }
  }

  async function handleDeleteAccount() {
    if (!accountToDelete) return;
    setIsDeleting(true);
    const result = await deleteAccount(accountToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      toast({ title: t('success'), description: result.message });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
    setIsDeleteDialogOpen(false);
    setAccountToDelete(null);
  }
  
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) setAccountToEdit(null);
    setIsFormDialogOpen(open);
  }

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/financials">
                    <ArrowLeft />
                    <span className="sr-only">{t('financials.back_to_financials')}</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">{t('financials.accounts.page_title')}</h1>
                <p className="text-muted-foreground">{t('financials.accounts.page_desc')}</p>
            </div>
        </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('financials.accounts.list_title')}</CardTitle>
            <CardDescription>{t('financials.accounts.list_desc')}</CardDescription>
          </div>
          {['admin', 'manager'].includes(profile?.role || '') && (
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setAccountToEdit(null)}>
                <PlusCircle className="mr-2" />
                {t('financials.accounts.add_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{accountToEdit ? t('financials.accounts.edit_title') : t('financials.accounts.add_title')}</DialogTitle>
                    <DialogDescription>{accountToEdit ? t('financials.accounts.edit_desc') : t('financials.accounts.add_desc')}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('financials.accounts.nickname_label')}</FormLabel><FormControl><Input placeholder={t('financials.accounts.nickname_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="bankName" render={({ field }) => (<FormItem><FormLabel>{t('financials.accounts.bank_name_label')}</FormLabel><FormControl><Input placeholder={t('financials.accounts.bank_name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                             <FormField control={form.control} name="accountNumber" render={({ field }) => (<FormItem><FormLabel>{t('financials.accounts.number_label')}</FormLabel><FormControl><Input placeholder={t('financials.accounts.number_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="initialBalance" render={({ field }) => (<FormItem><FormLabel>{t('financials.accounts.balance_label')}</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('saving')}</> : (accountToEdit ? t('save_changes') : t('financials.accounts.save_button'))}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('financials.accounts.name_header')}</TableHead>
                <TableHead>{t('financials.accounts.bank_header')}</TableHead>
                <TableHead>{t('financials.accounts.number_header')}</TableHead>
                <TableHead className="text-right">{t('financials.accounts.initial_balance_header')}</TableHead>
                <TableHead className="text-right">{t('financials.accounts.current_balance_header')}</TableHead>
                <TableHead><span className="sr-only">{t('actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                     <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                    <TableCell><Button aria-haspopup="true" size="icon" variant="ghost" disabled><MoreHorizontal className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              ) : accounts.length > 0 ? (
                accounts.map((account) => (
                    <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.name}</TableCell>
                        <TableCell>{account.bankName}</TableCell>
                        <TableCell>{account.accountNumber || 'N/A'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(account.initialBalance)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(accountBalances.get(account.id) || 0)}</TableCell>
                        <TableCell>
                        {['admin', 'manager'].includes(profile?.role || '') && (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">{t('toggle_menu')}</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => { setAccountToEdit(account); setIsFormDialogOpen(true); }}>{t('edit')}</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => { setAccountToDelete(account); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t('delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Banknote className="size-12" />
                        {t('financials.accounts.no_accounts_found')}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                <AlertDialogDescription>{t('financials.accounts.delete_confirm_desc', { name: accountToDelete?.name ?? '' })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAccountToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('deleting')}</>
                  ) : (
                    <><Trash2 className="mr-2 h-4 w-4" /> {t('delete')}</>
                  )}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
    
