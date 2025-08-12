
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, type Timestamp, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Mail, Phone, Building, ShoppingCart, Truck, Star, FileText, PlusCircle, Trash2, Loader2, DollarSign, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { EvaluateSupplierDialog } from './evaluate-supplier-dialog';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { addContract, deleteContract } from './actions';
import { SupplierAiSummary } from './supplier-ai-summary';
import { useLanguage } from '@/hooks/use-language';


type SupplierStatus = 'Active' | 'Inactive';
type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Ordered' | 'Received';

type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: SupplierStatus;
  rating?: number;
  evaluationNotes?: string;
};

type PurchaseRequest = {
  id: string;
  itemName: string;
  quantity: number;
  status: RequestStatus;
  requestedAt: Timestamp;
  projectId: string;
};

type Contract = {
  id: string;
  title: string;
  effectiveDate: Timestamp;
  fileUrl?: string;
};

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  date: Timestamp;
};

type Project = {
    id: string;
    name: string;
}

const statusVariant: { [key in SupplierStatus]: 'secondary' | 'destructive' } = {
  Active: 'secondary',
  Inactive: 'destructive',
};

const requestStatusVariant: { [key in RequestStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Pending: 'default',
  Approved: 'secondary',
  Ordered: 'outline',
  Received: 'secondary',
  Rejected: 'destructive',
};

const contractFormSchema = z.object({
  title: z.string().min(3, 'Contract title must be at least 3 characters long.'),
  effectiveDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  file: z.any().optional(),
});
type ContractFormValues = z.infer<typeof contractFormSchema>;

const formatCurrency = (value: number) => {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
  });
  return `LE ${formatter.format(value)}`;
};


export default function SupplierDetailPage({ params }: { params: { id: string } }) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();
  const supplierId = params.id;
  const { t } = useLanguage();

  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);
  const [isDeletingContract, setIsDeletingContract] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);

  useEffect(() => {
    if (!supplierId) return;
    setIsLoading(true);
    setError(null);

    const unsubscribes: (() => void)[] = [];

    const supplierRef = doc(firestore, 'suppliers', supplierId);
    unsubscribes.push(onSnapshot(supplierRef, (doc) => {
        if (doc.exists()) {
            setSupplier({ id: doc.id, ...doc.data() } as Supplier);
        } else {
            setError('Supplier not found.');
        }
        setIsLoading(false);
    }, (err) => {
        console.error('Error fetching supplier:', err);
        setError('Failed to fetch supplier details.');
        setIsLoading(false);
    }));

    const requestsQuery = query(collection(firestore, 'procurement'), where('supplierId', '==', supplierId));
    unsubscribes.push(onSnapshot(requestsQuery, (snapshot) => {
        const requestsData: PurchaseRequest[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseRequest));
        setRequests(requestsData);
    }));

    const contractsQuery = query(collection(firestore, 'suppliers', supplierId, 'contracts'), orderBy('effectiveDate', 'desc'));
     unsubscribes.push(onSnapshot(contractsQuery, (snapshot) => {
        const contractsData: Contract[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
        setContracts(contractsData);
    }));

    const projectsQuery = query(collection(firestore, 'projects'));
    unsubscribes.push(onSnapshot(projectsQuery, (snapshot) => {
        const projectMap = new Map<string, string>();
        snapshot.forEach(doc => {
            projectMap.set(doc.id, (doc.data() as Project).name);
        });
        setProjects(projectMap);
    }));
    
    const transactionsQuery = query(collection(firestore, 'transactions'), where('supplierId', '==', supplierId), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(transactionsQuery, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (err) => {
        console.error('Error fetching transactions:', err);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [supplierId]);

  const contractForm = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      title: '',
      effectiveDate: new Date().toISOString().split('T')[0],
    },
  });

  async function onContractSubmit(values: ContractFormValues) {
    if (!supplier) return;
    
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('effectiveDate', values.effectiveDate);
    if (values.file && values.file.length > 0) {
        formData.append('file', values.file[0]);
    }

    const result = await addContract(supplier.id, formData);
    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      contractForm.reset();
      setIsContractDialogOpen(false);
    }
  }

  async function handleDeleteContract() {
    if (!supplier || !contractToDelete) return;
    setIsDeletingContract(true);
    const result = await deleteContract(supplier.id, contractToDelete.id);
    setIsDeletingContract(false);

    if (result.success) {
      toast({ title: t('success'), description: result.message });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
    setContractToDelete(null);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48 mt-2" />
            </div>
        </div>
        <Skeleton className="h-10 w-64" />
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[50vh]">
        <Truck className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/suppliers">
            <ArrowLeft className="mr-2" />
            {t('suppliers.back_to_suppliers')}
          </Link>
        </Button>
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/suppliers">
                    <ArrowLeft />
                    <span className="sr-only">{t('suppliers.back_to_suppliers')}</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {supplier.name}
                </h1>
                <p className="text-muted-foreground">
                    {t('suppliers.detail_page_desc')}
                </p>
            </div>
        </div>

       <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">{t('clients.overview_tab')}</TabsTrigger>
                <TabsTrigger value="contracts">{t('clients.contracts_tab')}</TabsTrigger>
                <TabsTrigger value="procurement">{t('suppliers.procurement_history_tab')}</TabsTrigger>
                <TabsTrigger value="financials">{t('clients.financials_tab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
                 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-1">
                        <CardHeader>
                            <CardTitle>{t('suppliers.info_card_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <User className="size-4 text-muted-foreground" />
                                <span className="text-sm">{supplier.contactPerson}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Mail className="size-4 text-muted-foreground" />
                                <a href={`mailto:${supplier.email}`} className="text-sm hover:underline">{supplier.email}</a>
                            </div>
                            <div className="flex items-center gap-4">
                                <Phone className="size-4 text-muted-foreground" />
                                <span className="text-sm">{supplier.phone}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Building className="size-4 text-muted-foreground" />
                                <Badge variant={statusVariant[supplier.status]}>{t(`suppliers.status.${supplier.status}`)}</Badge>
                            </div>
                        </CardContent>
                    </Card>
                     <div className="lg:col-span-2">
                        <SupplierAiSummary
                            supplierId={supplier.id}
                            supplierName={supplier.name}
                            headerActions={
                                profile?.role === 'admin' ? <EvaluateSupplierDialog supplier={supplier} /> : null
                            }
                        />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="contracts" className="pt-4">
                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('clients.contract_management_title')}</CardTitle>
                            <CardDescription>{t('suppliers.contract_management_desc')}</CardDescription>
                        </div>
                        {profile?.role === 'admin' && (
                            <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2" /> {t('clients.add_contract_button')}</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>{t('clients.add_new_contract_title')}</DialogTitle>
                                        <DialogDescription>{t('suppliers.add_new_contract_desc', { name: supplier.name })}</DialogDescription>
                                    </DialogHeader>
                                    <Form {...contractForm}>
                                        <form onSubmit={contractForm.handleSubmit(onContractSubmit)} className="space-y-4 py-4">
                                            <FormField
                                                control={contractForm.control}
                                                name="title"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>{t('clients.contract_title_label')}</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder={t('suppliers.contract_title_placeholder')} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={contractForm.control}
                                                name="effectiveDate"
                                                render={({ field }) => (
                                                    <FormItem>
                                                    <FormLabel>{t('clients.effective_date_label')}</FormLabel>
                                                    <FormControl>
                                                        <Input type="date" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                             <FormField
                                                control={contractForm.control}
                                                name="file"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>{t('document')}</FormLabel>
                                                        <FormControl>
                                                            <Input type="file" {...contractForm.register('file')} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <DialogFooter>
                                                <Button type="submit" disabled={contractForm.formState.isSubmitting}>
                                                    {contractForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</> : t('clients.save_contract_button')}
                                                </Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardHeader>
                    <CardContent>
                        {contracts.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('clients.contract_title_header')}</TableHead>
                                        <TableHead>{t('clients.effective_date_header')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {contracts.map(contract => (
                                        <TableRow key={contract.id}>
                                            <TableCell className="font-medium">{contract.title}</TableCell>
                                            <TableCell>{contract.effectiveDate ? format(contract.effectiveDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {contract.fileUrl && (
                                                        <Button asChild variant="outline" size="icon" className="h-8 w-8">
                                                            <Link href={contract.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                <ExternalLink className="size-4" />
                                                                <span className="sr-only">View Contract</span>
                                                            </Link>
                                                        </Button>
                                                    )}
                                                    {profile?.role === 'admin' && (
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => setContractToDelete(contract)}>
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <FileText className="size-12" />
                                <p>{t('clients.no_contracts_found')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="procurement" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('suppliers.procurement_history_title')}</CardTitle>
                        <CardDescription>{t('suppliers.procurement_history_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {requests.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('item')}</TableHead>
                                        <TableHead>{t('project')}</TableHead>
                                        <TableHead>{t('date')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map(request => (
                                        <TableRow key={request.id}>
                                            <TableCell className="font-medium">{request.itemName} (x{request.quantity})</TableCell>
                                            <TableCell>
                                                <Link href={`/projects/${request.projectId}`} className="hover:underline">
                                                    {projects.get(request.projectId) || 'N/A'}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{request.requestedAt ? format(request.requestedAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant={requestStatusVariant[request.status]}>
                                                    {request.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <ShoppingCart className="size-12" />
                                <p>{t('suppliers.no_procurement_requests')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="financials" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('clients.financial_history_title')}</CardTitle>
                        <CardDescription>{t('suppliers.financial_history_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {transactions.length > 0 ? (
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>{t('date')}</TableHead>
                                       <TableHead>{t('description')}</TableHead>
                                       <TableHead>{t('type')}</TableHead>
                                       <TableHead className="text-right">{t('amount')}</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {transactions.map(transaction => (
                                       <TableRow key={transaction.id}>
                                           <TableCell>{transaction.date ? format(transaction.date.toDate(), 'PPP') : 'N/A'}</TableCell>
                                           <TableCell className="font-medium">{transaction.description}</TableCell>
                                           <TableCell>
                                                <Badge variant={transaction.type === 'Income' ? 'secondary' : 'destructive'}>
                                                    {transaction.type}
                                                </Badge>
                                           </TableCell>
                                            <TableCell className={`text-right font-semibold ${transaction.type === 'Income' ? 'text-success' : ''}`}>
                                                {formatCurrency(transaction.amount)}
                                            </TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                        ) : (
                             <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <DollarSign className="size-12" />
                                <p>{t('clients.no_financial_records')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>

    <AlertDialog open={!!contractToDelete} onOpenChange={(open) => !open && setContractToDelete(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('clients.delete_contract_confirm_desc', { title: contractToDelete?.title ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setContractToDelete(null)}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteContract} disabled={isDeletingContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {isDeletingContract ? (
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
