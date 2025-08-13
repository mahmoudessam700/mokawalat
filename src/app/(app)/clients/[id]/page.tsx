
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, collection, query, orderBy, Timestamp, where, addDoc, serverTimestamp, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { storage } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Phone, Mail, PlusCircle, Loader2, MessageSquare, Briefcase, PhoneCall, MailIcon, Users, NotepadText, Lightbulb, Sparkles, AlertCircle, FileText, Trash2, DollarSign, ExternalLink, Receipt } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
// Server actions are avoided to ensure Firestore rules see client auth
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import React from 'react';
import { ClientAiSummary } from './client-ai-summary';
import { useLanguage } from '@/hooks/use-language';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';


type ClientStatus = 'Lead' | 'Active' | 'Inactive';
type InteractionType = 'Call' | 'Email' | 'Meeting' | 'Note';
type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';
type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Void';

type Client = {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  status: ClientStatus;
};

type Interaction = {
  id: string;
  type: InteractionType;
  notes: string;
  date: Timestamp;
};

type Contract = {
  id: string;
  title: string;
  effectiveDate: Timestamp;
  value?: number;
  fileUrl?: string;
  filePath?: string;
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
  status: ProjectStatus;
  budget: number;
  progress?: number;
  startDate: Timestamp;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  issueDate: Timestamp;
  dueDate: Timestamp;
  status: InvoiceStatus;
};

const statusVariant: { [key in ClientStatus]: 'default' | 'secondary' | 'destructive' } = {
  Lead: 'default',
  Active: 'secondary',
  Inactive: 'destructive',
};

const projectStatusVariant: {
  [key in ProjectStatus]: 'secondary' | 'default' | 'outline' | 'destructive';
} = {
  'In Progress': 'secondary',
  Planning: 'default',
  Completed: 'outline',
  'On Hold': 'destructive',
};

const invoiceStatusVariant: { [key in InvoiceStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Draft: 'outline',
  Sent: 'default',
  Paid: 'secondary',
  Void: 'destructive',
};

const interactionIcons: { [key in InteractionType]: React.ReactNode } = {
    Call: <PhoneCall className="size-4 text-muted-foreground" />,
    Email: <MailIcon className="size-4 text-muted-foreground" />,
    Meeting: <Users className="size-4 text-muted-foreground" />,
    Note: <NotepadText className="size-4 text-muted-foreground" />,
};

const interactionFormSchema = z.object({
  type: z.enum(["Call", "Email", "Meeting", "Note"]),
  notes: z.string().min(5, "Notes must be at least 5 characters long."),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
});
type InteractionFormValues = z.infer<typeof interactionFormSchema>;

const contractFormSchema = z.object({
  title: z.string().min(3, 'Contract title must be at least 3 characters long.'),
  effectiveDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  value: z.coerce.number().optional(),
  file: z.any().optional(),
});
type ContractFormValues = z.infer<typeof contractFormSchema>;

const formatCurrency = (value: number) => {
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
  });
  return `LE ${formatter.format(value)}`;
};

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInteractionFormOpen, setIsInteractionFormOpen] = useState(false);
  const [isContractFormOpen, setIsContractFormOpen] = useState(false);
  const [contractToDelete, setContractToDelete] = useState<Contract | null>(null);
  const [isDeletingContract, setIsDeletingContract] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const clientId = params.id;
  const { t } = useLanguage();

  useEffect(() => {
    if (!clientId) return;
    setIsLoading(true);

    const unsubscribes: (() => void)[] = [];
    
    const clientRef = doc(firestore, 'clients', clientId);
    unsubscribes.push(onSnapshot(clientRef, (doc) => {
      if (doc.exists()) {
        setClient({ id: doc.id, ...doc.data() } as Client);
      } else {
        setError('Client not found.');
      }
    }, (err) => {
      console.error('Error fetching client:', err);
      setError('Failed to fetch client details.');
    }));

    const interactionsQuery = query(collection(firestore, 'clients', clientId, 'interactions'), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(interactionsQuery, (snapshot) => {
      setInteractions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Interaction)));
    }, (err) => {
       console.error('Error fetching interactions:', err);
    }));
    
    const contractsQuery = query(collection(firestore, 'clients', clientId, 'contracts'), orderBy('effectiveDate', 'desc'));
    unsubscribes.push(onSnapshot(contractsQuery, (snapshot) => {
      setContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract)));
    }, (err) => {
      console.error('Error fetching contracts:', err);
    }));

    const transactionsQuery = query(collection(firestore, 'transactions'), where('clientId', '==', clientId), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(transactionsQuery, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (err) => {
        console.error('Error fetching transactions:', err);
    }));

    // Query linked projects; support multiple historical shapes
    // 1) clientId: string (current)
    // 2) clientRef: DocumentReference (legacy)
    // 3) client.id: string (legacy nested object)
    const combineAndSet = (
      a: Project[],
      b: Project[],
      c: Project[]
    ) => {
      const map = new Map<string, Project>();
      [...a, ...b, ...c].forEach((p) => map.set(p.id, p));
      const list = Array.from(map.values());
      list.sort((x, y) => (x.name || '').localeCompare(y.name || ''));
      setProjects(list);
    };

    let setA: Project[] = [];
    let setB: Project[] = [];
    let setC: Project[] = [];

    const qA = query(collection(firestore, 'projects'), where('clientId', '==', clientId));
    unsubscribes.push(
      onSnapshot(qA, (snap) => {
        setA = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
        combineAndSet(setA, setB, setC);
      }, (err) => console.error('Error fetching projects (clientId):', err))
    );

    try {
      const clientRefForEq = doc(firestore, 'clients', clientId);
      const qB = query(collection(firestore, 'projects'), where('clientRef', '==', clientRefForEq as any));
      unsubscribes.push(
        onSnapshot(qB, (snap) => {
          setB = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
          combineAndSet(setA, setB, setC);
        }, (err) => console.error('Error fetching projects (clientRef):', err))
      );
    } catch (e) {
      console.warn('Skipping clientRef fallback query:', e);
    }

    try {
      const qC = query(collection(firestore, 'projects'), where('client.id', '==', clientId as any));
      unsubscribes.push(
        onSnapshot(qC, (snap) => {
          setC = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
          combineAndSet(setA, setB, setC);
        }, (err) => console.error('Error fetching projects (client.id):', err))
      );
    } catch (e) {
      console.warn('Skipping nested client.id fallback query:', e);
    }
    
    const invoicesQuery = query(collection(firestore, 'invoices'), where('clientId', '==', clientId), orderBy('issueDate', 'desc'));
    unsubscribes.push(onSnapshot(invoicesQuery, (snapshot) => {
        setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
    }, (err) => {
        console.error('Error fetching invoices:', err);
    }));

    const timer = setTimeout(() => setIsLoading(false), 1500);
    unsubscribes.push(() => clearTimeout(timer));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [clientId]);

  const interactionForm = useForm<InteractionFormValues>({
    resolver: zodResolver(interactionFormSchema),
    defaultValues: { type: 'Call', notes: '', date: new Date().toISOString().split('T')[0] },
  });

  const contractForm = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: { title: '', effectiveDate: new Date().toISOString().split('T')[0], value: 0 },
  });

  async function onInteractionSubmit(values: InteractionFormValues) {
    try {
      await addDoc(collection(firestore, 'clients', clientId, 'interactions'), {
        type: values.type,
        notes: values.notes,
        date: new Date(values.date),
        createdAt: serverTimestamp(),
      });
      toast({ title: 'Success', description: 'Interaction logged successfully.' });
      interactionForm.reset();
      setIsInteractionFormOpen(false);
    } catch (error) {
      console.error('Failed to log interaction:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to log interaction.' });
    }
  }

  async function onContractSubmit(values: ContractFormValues) {
    try {
      const newDocRef = doc(collection(firestore, 'clients', clientId, 'contracts'));
      let fileUrl = '';
      let filePath = '';

      const fileList = (values as any).file as FileList | undefined;
      const file = fileList && fileList.length > 0 ? fileList[0] : null;

      if (file && file.size > 0) {
        filePath = `contracts/clients/${clientId}/${newDocRef.id}/${file.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, file);
        fileUrl = await getDownloadURL(storageRef);
      }

      await setDoc(newDocRef, {
        title: values.title,
        effectiveDate: new Date(values.effectiveDate),
        value: values.value || undefined,
        fileUrl,
        filePath,
        createdAt: serverTimestamp(),
      });

      // Best-effort activity log
      addDoc(collection(firestore, 'activityLog'), {
        message: `New contract "${values.title}" added for client: ${client?.name || clientId}`,
        type: 'CONTRACT_ADDED',
        link: `/clients/${clientId}`,
        timestamp: serverTimestamp(),
      }).catch(() => {});

      toast({ title: 'Success', description: 'Contract added successfully.' });
      contractForm.reset();
      setIsContractFormOpen(false);
    } catch (error) {
      console.error('Failed to add contract:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add contract.' });
    }
  }

  async function handleDeleteContract() {
    if (!contractToDelete) return;
    setIsDeletingContract(true);
    try {
      // Delete associated file if present
      if (contractToDelete.filePath) {
        try {
          await deleteObject(ref(storage, contractToDelete.filePath));
        } catch (e) {
          console.warn('Failed to delete contract file from storage:', e);
        }
      }

      await deleteDoc(doc(firestore, 'clients', clientId, 'contracts', contractToDelete.id));

      // Best-effort activity log
      addDoc(collection(firestore, 'activityLog'), {
        message: `Contract "${contractToDelete.title}" deleted from client`,
        type: 'CONTRACT_DELETED',
        link: `/clients/${clientId}`,
        timestamp: serverTimestamp(),
      }).catch(() => {});

      toast({ title: 'Success', description: 'Contract deleted successfully.' });
    } catch (error) {
      console.error('Failed to delete contract:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete contract.' });
    } finally {
      setIsDeletingContract(false);
      setContractToDelete(null);
    }
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
        <Card><CardContent className="p-6"><Skeleton className="h-80 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[50vh]">
        <Users className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/clients">
            <ArrowLeft className="mr-2" />
            {t('clients.back_to_clients')}
          </Link>
        </Button>
      </div>
    );
  }

  if (!client) return null;

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/clients">
                    <ArrowLeft />
                    <span className="sr-only">{t('clients.back_to_clients')}</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {client.name}
                </h1>
                <p className="text-muted-foreground">
                    {t('clients.detail_page_desc')}
                </p>
            </div>
        </div>
        
        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">{t('clients.overview_tab')}</TabsTrigger>
                <TabsTrigger value="projects">{t('clients.projects_tab')}</TabsTrigger>
                <TabsTrigger value="invoices">{t('clients.invoices_tab')}</TabsTrigger>
                <TabsTrigger value="interactions">{t('clients.interactions_tab')}</TabsTrigger>
                <TabsTrigger value="contracts">{t('clients.contracts_tab')}</TabsTrigger>
                <TabsTrigger value="financials">{t('clients.financials_tab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
                 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>{t('clients.info_card_title')}</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4"><Briefcase className="size-4 text-muted-foreground" /><span className="text-sm">{client.company || 'N/A'}</span></div>
                                <div className="flex items-center gap-4"><Mail className="size-4 text-muted-foreground" /><a href={`mailto:${client.email}`} className="text-sm hover:underline">{client.email}</a></div>
                                <div className="flex items-center gap-4"><Phone className="size-4 text-muted-foreground" /><span className="text-sm">{client.phone}</span></div>
                                <div className="flex items-center gap-4"><User className="size-4 text-muted-foreground" /><Badge variant={statusVariant[client.status]}>{t(`clients.status.${client.status}`)}</Badge></div>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <ClientAiSummary clientId={client.id} clientName={client.name} />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="projects" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('clients.linked_projects_title')}</CardTitle>
                        <CardDescription>{t('clients.linked_projects_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {projects.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('clients.project_name_header')}</TableHead>
                                        <TableHead>{t('clients.project_status_header')}</TableHead>
                                        <TableHead className="text-right">{t('clients.project_budget_header')}</TableHead>
                                        <TableHead className="text-right">{t('actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.map(project => (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-medium">{project.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={projectStatusVariant[project.status]}>
                                                    {project.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">{formatCurrency(project.budget)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/projects/${project.id}`}>
                                                        {t('view_project')}
                                                    </Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <Briefcase className="size-12" />
                                <p>{t('clients.no_linked_projects')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="invoices" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('clients.invoices_title')}</CardTitle>
                        <CardDescription>{t('clients.invoices_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {invoices.length > 0 ? (
                            <Table>
                                <TableHeader><TableRow><TableHead>{t('clients.invoice_number_header')}</TableHead><TableHead>{t('clients.invoice_issue_date_header')}</TableHead><TableHead>{t('clients.invoice_due_date_header')}</TableHead><TableHead>{t('status')}</TableHead><TableHead className="text-right">{t('clients.invoice_amount_header')}</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {invoices.map(invoice => (
                                        <TableRow key={invoice.id}>
                                            <TableCell className="font-mono">
                                              <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                                                {invoice.invoiceNumber}
                                              </Link>
                                            </TableCell>
                                            <TableCell>{format(invoice.issueDate.toDate(), 'PPP')}</TableCell>
                                            <TableCell>{format(invoice.dueDate.toDate(), 'PPP')}</TableCell>
                                            <TableCell><Badge variant={invoiceStatusVariant[invoice.status]}>{invoice.status}</Badge></TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(invoice.totalAmount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <Receipt className="size-12" />
                                <p>{t('clients.no_invoices_found')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="interactions" className="pt-4">
                 <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('clients.interaction_history_title')}</CardTitle>
                            <CardDescription>{t('clients.interaction_history_desc')}</CardDescription>
                        </div>
                        <Dialog open={isInteractionFormOpen} onOpenChange={setIsInteractionFormOpen}>
                            <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2" /> {t('clients.log_interaction_button')}</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('clients.log_new_interaction_title')}</DialogTitle>
                                    <DialogDescription>{t('clients.log_new_interaction_desc')}</DialogDescription>
                                </DialogHeader>
                                <Form {...interactionForm}>
                                    <form onSubmit={interactionForm.handleSubmit(onInteractionSubmit)} className="space-y-4 py-4">
                                        <FormField control={interactionForm.control} name="date" render={({ field }) => (<FormItem><FormLabel>{t('date')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={interactionForm.control} name="type" render={({ field }) => (<FormItem><FormLabel>{t('type')}</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select interaction type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Call">Call</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="Meeting">Meeting</SelectItem><SelectItem value="Note">Note</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                        <FormField control={interactionForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>{t('notes')}</FormLabel><FormControl><Textarea placeholder={t('clients.interaction_notes_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <DialogFooter><Button type="submit" disabled={interactionForm.formState.isSubmitting}>{interactionForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</> : t('clients.log_interaction_button')}</Button></DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {interactions.length > 0 ? (
                            <Table><TableHeader><TableRow><TableHead className="w-[50px]">{t('type')}</TableHead><TableHead className="w-[150px]">{t('date')}</TableHead><TableHead>{t('notes')}</TableHead></TableRow></TableHeader><TableBody>{interactions.map(interaction => (<TableRow key={interaction.id}><TableCell>{interactionIcons[interaction.type]}</TableCell><TableCell>{interaction.date ? format(interaction.date.toDate(), 'PPP p') : 'N/A'}</TableCell><TableCell className="whitespace-pre-wrap">{interaction.notes}</TableCell></TableRow>))}</TableBody></Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"><MessageSquare className="size-12" /><p>{t('clients.no_interactions_logged')}</p><p className="text-xs">{t('clients.use_log_button')}</p></div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="contracts" className="pt-4">
                 <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('clients.contract_management_title')}</CardTitle>
                            <CardDescription>{t('clients.contract_management_desc')}</CardDescription>
                        </div>
                        {['admin', 'manager'].includes(profile?.role || '') && (
                            <Dialog open={isContractFormOpen} onOpenChange={setIsContractFormOpen}>
                                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2" /> {t('clients.add_contract_button')}</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>{t('clients.add_new_contract_title')}</DialogTitle><DialogDescription>{t('clients.add_new_contract_desc', { name: client.name })}</DialogDescription></DialogHeader>
                                    <Form {...contractForm}>
                                        <form onSubmit={contractForm.handleSubmit(onContractSubmit)} className="space-y-4 py-4">
                                            <FormField control={contractForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>{t('clients.contract_title_label')}</FormLabel><FormControl><Input placeholder={t('clients.contract_title_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={contractForm.control} name="effectiveDate" render={({ field }) => (<FormItem><FormLabel>{t('clients.effective_date_label')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={contractForm.control} name="value" render={({ field }) => (<FormItem><FormLabel>{t('clients.contract_value_label')}</FormLabel><FormControl><Input type="number" placeholder={t('clients.contract_value_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <FormField control={contractForm.control} name="file" render={({ field }) => (<FormItem><FormLabel>{t('document')}</FormLabel><FormControl><Input type="file" {...contractForm.register('file')} /></FormControl><FormMessage /></FormItem>)} />
                                            <DialogFooter><Button type="submit" disabled={contractForm.formState.isSubmitting}>{contractForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</> : t('clients.save_contract_button')}</Button></DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardHeader>
                    <CardContent>
                        {contracts.length > 0 ? (
                            <Table><TableHeader><TableRow><TableHead>{t('clients.contract_title_header')}</TableHead><TableHead>{t('clients.contract_value_header')}</TableHead><TableHead>{t('clients.effective_date_header')}</TableHead><TableHead className="text-right">{t('actions')}</TableHead></TableRow></TableHeader><TableBody>{contracts.map(contract => (<TableRow key={contract.id}><TableCell className="font-medium">{contract.title}</TableCell><TableCell>{contract.value ? formatCurrency(contract.value) : 'N/A'}</TableCell><TableCell>{contract.effectiveDate ? format(contract.effectiveDate.toDate(), 'PPP') : 'N/A'}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-2">{contract.fileUrl && (<Button asChild variant="outline" size="icon" className="h-8 w-8"><Link href={contract.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /><span className="sr-only">View Contract</span></Link></Button>)}{['admin', 'manager'].includes(profile?.role || '') && (<Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => setContractToDelete(contract)}><Trash2 className="size-4" /></Button>)}</div></TableCell></TableRow>))}</TableBody></Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"><FileText className="size-12" /><p>{t('clients.no_contracts_found')}</p></div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="financials" className="pt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>{t('clients.financial_history_title')}</CardTitle>
                        <CardDescription>{t('clients.financial_history_desc')}</CardDescription>
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
            <AlertDialogHeader><AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription>{t('clients.delete_contract_confirm_desc', { title: contractToDelete?.title ?? '' })}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setContractToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteContract} disabled={isDeletingContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeletingContract ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('deleting')}</> : <><Trash2 className="mr-2 h-4 w-4" /> {t('delete')}</>}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
