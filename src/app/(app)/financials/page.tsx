
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, PlusCircle, TrendingUp, TrendingDown, Minus, Trash2, Banknote, Landmark } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useMemo, type MouseEvent } from 'react';
import { addTransaction, deleteTransaction, updateTransaction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, type Timestamp, collectionGroup } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';

type TransactionType = 'Income' | 'Expense';

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: Timestamp;
  createdAt: Timestamp;
  accountId: string;
  projectId?: string;
  clientId?: string;
  supplierId?: string;
  purchaseOrderId?: string;
  contractId?: string;
  contractType?: string;
};

type Project = { id: string; name: string; };
type Client = { id: string; name: string; };
type Supplier = { id: string; name: string; };
type Account = { id: string; name: string; initialBalance: number; };
type PurchaseOrder = { id: string; itemName: string; supplierId: string; };
type Contract = { id: string; title: string; parentId: string; parentType: string; }


const transactionFormSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters long."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  type: z.enum(["Income", "Expense"]),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  accountId: z.string().min(1, "An account is required."),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  supplierId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  contractId: z.string().optional(),
  contractType: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};

export default function FinancialsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [allContracts, setAllContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const qTransactions = query(collection(firestore, 'transactions'), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching transactions: ", error);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to fetch financial data.' });
      setIsLoading(false);
    }));

    const qProjects = query(collection(firestore, 'projects'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qProjects, (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }));

    const qClients = query(collection(firestore, 'clients'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qClients, (snapshot) => {
        setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    }));

    const qSuppliers = query(collection(firestore, 'suppliers'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qSuppliers, (snapshot) => {
        setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    }));
    
    const qAccounts = query(collection(firestore, 'accounts'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qAccounts, (snapshot) => {
        setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
    }));

    const qPOs = query(collection(firestore, 'procurement'), orderBy('requestedAt', 'desc'));
    unsubscribes.push(onSnapshot(qPOs, (snapshot) => {
        setPurchaseOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)));
    }));

    const qContracts = query(collectionGroup(firestore, 'contracts'));
    unsubscribes.push(onSnapshot(qContracts, (snapshot) => {
        const contractsData: Contract[] = snapshot.docs.map(doc => {
            const path = doc.ref.path.split('/');
            const parentType = path[0].slice(0, -1); // 'client' or 'supplier'
            const parentId = path[1];
            return {
                id: doc.id,
                title: doc.data().title,
                parentType,
                parentId,
            };
        });
        setAllContracts(contractsData);
    }, (err) => {
      console.error("Error fetching contracts via collectionGroup:", err)
    }));


    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);

  const { totalIncome, totalExpenses, netBalance } = useMemo(() => {
    return transactions.reduce((acc, transaction) => {
      if (transaction.type === 'Income') {
        acc.totalIncome += transaction.amount;
      } else {
        acc.totalExpenses += transaction.amount;
      }
      acc.netBalance = acc.totalIncome - acc.totalExpenses;
      return acc;
    }, { totalIncome: 0, totalExpenses: 0, netBalance: 0 });
  }, [transactions]);
  
  const nameMaps = useMemo(() => {
    return {
      projects: new Map(projects.map(p => [p.id, p.name])),
      clients: new Map(clients.map(c => [c.id, c.name])),
      suppliers: new Map(suppliers.map(s => [s.id, s.name])),
      accounts: new Map(accounts.map(a => [a.id, a.name])),
      purchaseOrders: new Map(purchaseOrders.map(p => [p.id, p.itemName]))
    }
  }, [projects, clients, suppliers, accounts, purchaseOrders]);


  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      description: '',
      amount: 0,
      type: 'Expense',
      date: new Date().toISOString().split('T')[0],
      accountId: '',
      projectId: '',
      clientId: '',
      supplierId: '',
      purchaseOrderId: '',
      contractId: '',
      contractType: '',
    },
  });

  const selectedSupplierId = form.watch('supplierId');
  const selectedClientId = form.watch('clientId');
  const transactionType = form.watch('type');

  const selectableContracts = useMemo(() => {
    let parentId = '';
  if (transactionType === 'Income') parentId = selectedClientId ?? '';
  else if (transactionType === 'Expense') parentId = selectedSupplierId ?? '';
    
    if (!parentId) return [];
    
    return allContracts.filter(c => c.parentId === parentId);
  }, [selectedClientId, selectedSupplierId, transactionType, allContracts]);

  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        ...transactionToEdit,
        date: transactionToEdit.date ? format(transactionToEdit.date.toDate(), 'yyyy-MM-dd') : '',
        accountId: transactionToEdit.accountId || '',
        projectId: transactionToEdit.projectId || '',
        clientId: transactionToEdit.clientId || '',
        supplierId: transactionToEdit.supplierId || '',
        purchaseOrderId: transactionToEdit.purchaseOrderId || '',
        contractId: transactionToEdit.contractId || '',
        contractType: transactionToEdit.contractType || '',
      });
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [transactionToEdit, form]);

  useEffect(() => {
    form.setValue('contractId', '');
    if (transactionType === 'Income') {
        form.setValue('supplierId', '');
        form.setValue('purchaseOrderId', '');
        form.setValue('contractType', selectedClientId ? 'client' : '');
    } else { // Expense
        form.setValue('clientId', '');
        form.setValue('contractType', selectedSupplierId ? 'supplier' : '');
    }
  }, [transactionType, selectedClientId, selectedSupplierId, form]);

  async function onSubmit(values: TransactionFormValues) {
    const result = transactionToEdit
      ? await updateTransaction(transactionToEdit.id, values)
      : await addTransaction(values);

    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      setIsFormDialogOpen(false);
      setTransactionToEdit(null);
    }
  }

  async function handleDeleteTransaction() {
    if (!transactionToDelete) return;

    setIsDeleting(true);
    const result = await deleteTransaction(transactionToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      toast({
        title: t('success'),
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: result.message,
      });
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }

  const handleAddTransactionClick = (e: MouseEvent) => {
    if (accounts.length === 0) {
      e.preventDefault();
      toast({
        variant: 'destructive',
        title: t('financials.no_accounts_error_title'),
        description: t('financials.no_accounts_error_desc'),
      });
      return;
    }
    setTransactionToEdit(null);
  };
  
  const getLinkedEntity = (transaction: Transaction) => {
    if (transaction.contractId) {
        const contract = allContracts.find(c => c.id === transaction.contractId);
        if (contract) {
            const parentName = contract.parentType === 'client' 
                ? nameMaps.clients.get(contract.parentId) 
                : nameMaps.suppliers.get(contract.parentId);
            return { name: contract.title, url: `/${contract.parentType}s/${contract.parentId}`, type: t('financials.linked_to.contract'), context: `${t('financials.linked_to.for')}: ${parentName}` };
        }
    }
    if (transaction.purchaseOrderId && nameMaps.purchaseOrders.has(transaction.purchaseOrderId)) {
        return { name: `${t('financials.linked_to.po')}: ${nameMaps.purchaseOrders.get(transaction.purchaseOrderId)}`, url: `/procurement/${transaction.purchaseOrderId}`, type: t('financials.linked_to.po') };
    }
    if (transaction.clientId) {
      return { name: nameMaps.clients.get(transaction.clientId) || 'N/A', url: `/clients/${transaction.clientId}`, type: t('financials.linked_to.client') };
    }
    if (transaction.supplierId) {
      return { name: nameMaps.suppliers.get(transaction.supplierId) || 'N/A', url: `/suppliers/${transaction.supplierId}`, type: t('financials.linked_to.supplier') };
    }
    if (transaction.projectId) {
      return { name: nameMaps.projects.get(transaction.projectId) || 'N/A', url: `/projects/${transaction.projectId}`, type: t('financials.linked_to.project') };
    }
    return null;
  };

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          {t('financials.page_title')}
        </h1>
        <p className="text-muted-foreground">
          {t('financials.page_desc')}
        </p>
      </div>

      <div className="space-y-4">
        <CardTitle className="text-xl">{t('financials.summary_title')}</CardTitle>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('financials.total_income')}</CardTitle>
                    <TrendingUp className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('financials.total_expenses')}</CardTitle>
                    <TrendingDown className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{t('financials.net_balance')}</CardTitle>
                    <Minus className="size-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(netBalance)}</div>
                </CardContent>
            </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('financials.history_title')}</CardTitle>
            <CardDescription>{t('financials.history_desc')}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {['admin', 'manager'].includes(profile?.role || '') && (
                <Button asChild variant="outline">
                    <Link href="/financials/accounts">
                        <Landmark className="mr-2"/> {t('financials.manage_accounts')}
                    </Link>
                </Button>
            )}
            {['admin', 'manager'].includes(profile?.role || '') && (
              <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={handleAddTransactionClick}>
                    <PlusCircle className="mr-2" />
                    {t('financials.add_transaction_button')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                    <DialogTitle>{transactionToEdit ? t('financials.edit_transaction_title') : t('financials.add_transaction_title')}</DialogTitle>
                    <DialogDescription>
                        {transactionToEdit ? t('financials.edit_transaction_desc') : t('financials.add_transaction_desc')}
                    </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{t('description')}</FormLabel><FormControl><Input placeholder={t('financials.description_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>{t('financials.amount_label')}</FormLabel><FormControl><Input type="number" placeholder={t('financials.amount_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>{t('type')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('financials.type_placeholder')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="Income">{t('financials.income')}</SelectItem><SelectItem value="Expense">{t('financials.expense')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>{t('financials.date_label')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="accountId" render={({ field }) => (<FormItem><FormLabel>{t('financials.account_label')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('financials.account_placeholder')} /></SelectTrigger></FormControl><SelectContent>{accounts.map(acc => (<SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="projectId" render={({ field }) => (<FormItem><FormLabel>{t('financials.project_label')}</FormLabel><Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder={t('financials.project_placeholder')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">{t('projects.none')}</SelectItem>{projects.map(project => (<SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <FormField control={form.control} name="clientId" render={({ field }) => (<FormItem className={transactionType === 'Expense' ? 'hidden' : ''}><FormLabel>{t('financials.client_label')}</FormLabel><Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder={t('financials.client_placeholder')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">{t('projects.none')}</SelectItem>{clients.map(client => (<SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="supplierId" render={({ field }) => (<FormItem className={transactionType === 'Income' ? 'hidden' : ''}><FormLabel>{t('financials.supplier_label')}</FormLabel><Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} value={field.value || ''}><FormControl><SelectTrigger><SelectValue placeholder={t('financials.supplier_placeholder')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">{t('projects.none')}</SelectItem>{suppliers.map(supplier => (<SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        
                        <FormField control={form.control} name="contractId" render={({ field }) => (<FormItem><FormLabel>{t('financials.contract_label')}</FormLabel><Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} value={field.value || ''} disabled={selectableContracts.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={t('financials.contract_placeholder')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">{t('projects.none')}</SelectItem>{selectableContracts.map(contract => (<SelectItem key={contract.id} value={contract.id}>{contract.title}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />

                        <FormField control={form.control} name="purchaseOrderId" render={({ field }) => (<FormItem className={transactionType === 'Income' ? 'hidden' : ''}><FormLabel>{t('financials.po_label')}</FormLabel><Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} value={field.value || ''} disabled={!selectedSupplierId}><FormControl><SelectTrigger><SelectValue placeholder={t('financials.po_placeholder')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">{t('projects.none')}</SelectItem>{purchaseOrders.filter(po => po.supplierId === selectedSupplierId).map(po => (<SelectItem key={po.id} value={po.id}>{po.itemName} (...{po.id.slice(-5)})</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('saving')}</> : (transactionToEdit ? t('save_changes') : t('financials.save_transaction_button'))}</Button>
                        </DialogFooter>
                    </form>
                    </Form>
                </DialogContent>
              </Dialog>
            )}
           </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('description')}</TableHead>
                <TableHead>{t('financials.account_header')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('financials.linked_to_header')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
                <TableHead><span className="sr-only">{t('actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                     <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                    <TableCell><Button aria-haspopup="true" size="icon" variant="ghost" disabled><MoreHorizontal className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              ) : transactions.length > 0 ? (
                transactions.map((transaction) => {
                  const linkedEntity = getLinkedEntity(transaction);
                  return (
                    <TableRow key={transaction.id}>
                        <TableCell>{transaction.date ? format(transaction.date.toDate(), 'PPP') : 'N/A'}</TableCell>
                        <TableCell className="font-medium">{transaction.description}</TableCell>
                        <TableCell>{nameMaps.accounts.get(transaction.accountId) || 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                            {linkedEntity ? 
                                <div className="flex flex-col">
                                    <Link href={linkedEntity.url} className="hover:underline">
                                        {linkedEntity.name} <span className="text-muted-foreground text-xs">({linkedEntity.type})</span>
                                    </Link>
                                    {linkedEntity.context && <span className="text-xs text-muted-foreground">{linkedEntity.context}</span>}
                                </div>
                                : 'N/A'}
                        </TableCell>
                        <TableCell><Badge variant={transaction.type === 'Income' ? 'secondary' : 'destructive'}>{t(`financials.${transaction.type.toLowerCase()}`)}</Badge></TableCell>
                        <TableCell className={`text-right font-semibold ${transaction.type === 'Income' ? 'text-success' : ''}`}>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>
                        {['admin', 'manager'].includes(profile?.role || '') && (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">{t('toggle_menu')}</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => { 
                                    setTransactionToEdit(transaction); 
                                    setIsFormDialogOpen(true);
                                }}>{t('edit')}</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => { setTransactionToDelete(transaction); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t('delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        </TableCell>
                    </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">{t('financials.no_transactions_found')}</TableCell>
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
                <AlertDialogDescription>{t('financials.delete_confirm_desc', { description: transactionToDelete?.description ?? '' })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTransaction} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
    
