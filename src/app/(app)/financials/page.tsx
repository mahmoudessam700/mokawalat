
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
import { Loader2, MoreHorizontal, PlusCircle, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
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
import { useState, useEffect, useMemo } from 'react';
import { addTransaction, deleteTransaction, updateTransaction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

type TransactionType = 'Income' | 'Expense';

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  date: Timestamp;
  createdAt: Timestamp;
  projectId?: string;
  clientId?: string;
  supplierId?: string;
};

type Project = { id: string; name: string; };
type Client = { id: string; name: string; };
type Supplier = { id: string; name: string; };

const transactionFormSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters long."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  type: z.enum(["Income", "Expense"]),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  supplierId: z.string().optional(),
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
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const qTransactions = query(collection(firestore, 'transactions'), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching transactions: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch financial data.' });
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
    }
  }, [projects, clients, suppliers]);


  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      description: '',
      amount: 0,
      type: 'Expense',
      date: new Date().toISOString().split('T')[0],
      projectId: '',
      clientId: '',
      supplierId: '',
    },
  });

  useEffect(() => {
    if (transactionToEdit) {
      form.reset({
        ...transactionToEdit,
        date: transactionToEdit.date ? format(transactionToEdit.date.toDate(), 'yyyy-MM-dd') : '',
        projectId: transactionToEdit.projectId || '',
        clientId: transactionToEdit.clientId || '',
        supplierId: transactionToEdit.supplierId || '',
      });
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [transactionToEdit, form]);

  async function onSubmit(values: TransactionFormValues) {
    const result = transactionToEdit
      ? await updateTransaction(transactionToEdit.id, values)
      : await addTransaction(values);

    if (result.errors) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
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
        title: 'Success',
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }

  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) {
      setTransactionToEdit(null);
    }
    setIsFormDialogOpen(open);
  }

  const getLinkedEntity = (transaction: Transaction) => {
    if (transaction.clientId) {
      return { name: nameMaps.clients.get(transaction.clientId) || 'N/A', url: `/clients/${transaction.clientId}`, type: 'Client' };
    }
    if (transaction.supplierId) {
      return { name: nameMaps.suppliers.get(transaction.supplierId) || 'N/A', url: `/suppliers/${transaction.supplierId}`, type: 'Supplier' };
    }
    if (transaction.projectId) {
      return { name: nameMaps.projects.get(transaction.projectId) || 'N/A', url: `/projects/${transaction.projectId}`, type: 'Project' };
    }
    return null;
  };

  return (
    <>
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Financial & Accounting Management
        </h1>
        <p className="text-muted-foreground">
          Track income, expenses, and manage financial records.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <TrendingUp className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalIncome)}</div>
            </CardContent>
        </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <TrendingDown className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
            </CardContent>
        </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
                <Minus className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(netBalance)}</div>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>A list of all income and expense records.</CardDescription>
          </div>
          {profile?.role === 'admin' && (
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setTransactionToEdit(null)}>
                <PlusCircle className="mr-2" />
                Add Transaction
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>{transactionToEdit ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
                <DialogDescription>
                    {transactionToEdit ? "Update the transaction's details below." : 'Fill in the details below to add a new financial record.'}
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Input placeholder="e.g., Payment from Client X" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount (LE)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1500.00" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Income">Income</SelectItem><SelectItem value="Expense">Expense</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="date" render={({ field }) => (<FormItem><FormLabel>Transaction Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField control={form.control} name="clientId" render={({ field }) => (<FormItem><FormLabel>Client (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Link to a client" /></SelectTrigger></FormControl><SelectContent><SelectItem value="">None</SelectItem>{clients.map(client => (<SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="supplierId" render={({ field }) => (<FormItem><FormLabel>Supplier (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Link to a supplier" /></SelectTrigger></FormControl><SelectContent><SelectItem value="">None</SelectItem>{suppliers.map(supplier => (<SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="projectId" render={({ field }) => (<FormItem><FormLabel>Project (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Link to a project" /></SelectTrigger></FormControl><SelectContent><SelectItem value="">None</SelectItem>{projects.map(project => (<SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <DialogFooter>
                        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (transactionToEdit ? 'Save Changes' : 'Save Transaction')}</Button>
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
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="hidden md:table-cell">Linked To</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
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
                        <TableCell className="hidden md:table-cell">
                            {linkedEntity ? <Link href={linkedEntity.url} className="hover:underline">{linkedEntity.name} <span className="text-muted-foreground text-xs">({linkedEntity.type})</span></Link> : 'N/A'}
                        </TableCell>
                        <TableCell><Badge variant={transaction.type === 'Income' ? 'secondary' : 'destructive'}>{transaction.type}</Badge></TableCell>
                        <TableCell className={`text-right font-semibold ${transaction.type === 'Income' ? 'text-success' : ''}`}>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>
                        {profile?.role === 'admin' && (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => { setTransactionToEdit(transaction); setIsFormDialogOpen(true); }}>Edit</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => { setTransactionToDelete(transaction); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        </TableCell>
                    </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No transactions found. Add one to get started.</TableCell>
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
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This action cannot be undone. This will permanently delete the transaction: "{transactionToDelete?.description}".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTransactionToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTransaction} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
