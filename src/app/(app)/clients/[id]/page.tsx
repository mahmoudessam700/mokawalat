
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
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
import { addInteraction, getInteractionSummary, addContract, deleteContract } from './actions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import React from 'react';
import { ClientAiSummary } from './client-ai-summary';


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

    const projectsQuery = query(collection(firestore, 'projects'), where('clientId', '==', clientId), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(projectsQuery, (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }, (err) => {
        console.error('Error fetching projects for client:', err);
    }));
    
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
    const result = await addInteraction(clientId, values);
    if (result.errors) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      interactionForm.reset();
      setIsInteractionFormOpen(false);
    }
  }

  async function onContractSubmit(values: ContractFormValues) {
    const formData = new FormData();
    formData.append('title', values.title);
    formData.append('effectiveDate', values.effectiveDate);
    if (values.value) {
        formData.append('value', values.value.toString());
    }
    if (values.file && values.file.length > 0) {
        formData.append('file', values.file[0]);
    }

    const result = await addContract(clientId, formData);
    if (result.errors) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      contractForm.reset();
      setIsContractFormOpen(false);
    }
  }

  async function handleDeleteContract() {
    if (!contractToDelete) return;
    setIsDeletingContract(true);
    const result = await deleteContract(clientId, contractToDelete.id);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsDeletingContract(false);
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
            Back to Clients
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
                    <span className="sr-only">Back to Clients</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {client.name}
                </h1>
                <p className="text-muted-foreground">
                    Detailed client view and interaction history.
                </p>
            </div>
        </div>
        
        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="interactions">Interactions</TabsTrigger>
                <TabsTrigger value="contracts">Contracts</TabsTrigger>
                <TabsTrigger value="financials">Financials</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
                 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-6">
                        <Card>
                            <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-4"><Briefcase className="size-4 text-muted-foreground" /><span className="text-sm">{client.company || 'N/A'}</span></div>
                                <div className="flex items-center gap-4"><Mail className="size-4 text-muted-foreground" /><a href={`mailto:${client.email}`} className="text-sm hover:underline">{client.email}</a></div>
                                <div className="flex items-center gap-4"><Phone className="size-4 text-muted-foreground" /><span className="text-sm">{client.phone}</span></div>
                                <div className="flex items-center gap-4"><User className="size-4 text-muted-foreground" /><Badge variant={statusVariant[client.status]}>{client.status}</Badge></div>
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
                        <CardTitle>Linked Projects</CardTitle>
                        <CardDescription>All projects associated with this client.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {projects.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Name</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Budget</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
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
                                                        View Project
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
                                <p>No projects are linked to this client yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="invoices" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Invoices</CardTitle>
                        <CardDescription>All invoices issued to this client.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {invoices.length > 0 ? (
                            <Table>
                                <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Issue Date</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
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
                                <p>No invoices found for this client.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="interactions" className="pt-4">
                 <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>Interaction History</CardTitle>
                            <CardDescription>A log of all communications with this client.</CardDescription>
                        </div>
                        <Dialog open={isInteractionFormOpen} onOpenChange={setIsInteractionFormOpen}>
                            <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2" /> Log Interaction</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Log New Interaction</DialogTitle>
                                    <DialogDescription>Record a new call, email, or meeting.</DialogDescription>
                                </DialogHeader>
                                <Form {...interactionForm}>
                                    <form onSubmit={interactionForm.handleSubmit(onInteractionSubmit)} className="space-y-4 py-4">
                                        <FormField control={interactionForm.control} name="date" render={({ field }) => (<FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={interactionForm.control} name="type" render={({ field }) => (<FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select interaction type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Call">Call</SelectItem><SelectItem value="Email">Email</SelectItem><SelectItem value="Meeting">Meeting</SelectItem><SelectItem value="Note">Note</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                                        <FormField control={interactionForm.control} name="notes" render={({ field }) => (<FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Enter details about the interaction..." {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <DialogFooter><Button type="submit" disabled={interactionForm.formState.isSubmitting}>{interactionForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Log Interaction'}</Button></DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {interactions.length > 0 ? (
                            <Table><TableHeader><TableRow><TableHead className="w-[50px]">Type</TableHead><TableHead className="w-[150px]">Date</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader><TableBody>{interactions.map(interaction => (<TableRow key={interaction.id}><TableCell>{interactionIcons[interaction.type]}</TableCell><TableCell>{interaction.date ? format(interaction.date.toDate(), 'PPP p') : 'N/A'}</TableCell><TableCell className="whitespace-pre-wrap">{interaction.notes}</TableCell></TableRow>))}</TableBody></Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"><MessageSquare className="size-12" /><p>No interactions logged yet.</p><p className="text-xs">Use the "Log Interaction" button to add the first one.</p></div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="contracts" className="pt-4">
                 <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>Contract Management</CardTitle>
                            <CardDescription>A list of all contracts and agreements with this client.</CardDescription>
                        </div>
                        {profile?.role === 'admin' && (
                            <Dialog open={isContractFormOpen} onOpenChange={setIsContractFormOpen}>
                                <DialogTrigger asChild><Button size="sm"><PlusCircle className="mr-2" /> Add Contract</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Add New Contract</DialogTitle><DialogDescription>Record a new contract for {client.name}.</DialogDescription></DialogHeader>
                                    <Form {...contractForm}>
                                        <form onSubmit={contractForm.handleSubmit(onContractSubmit)} className="space-y-4 py-4">
                                            <FormField control={contractForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>Contract Title</FormLabel><FormControl><Input placeholder="e.g., Phase 1 Construction Agreement" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={contractForm.control} name="effectiveDate" render={({ field }) => (<FormItem><FormLabel>Effective Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField control={contractForm.control} name="value" render={({ field }) => (<FormItem><FormLabel>Value (LE) (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 500000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            </div>
                                            <FormField control={contractForm.control} name="file" render={({ field }) => (<FormItem><FormLabel>Document</FormLabel><FormControl><Input type="file" {...contractForm.register('file')} /></FormControl><FormMessage /></FormItem>)} />
                                            <DialogFooter><Button type="submit" disabled={contractForm.formState.isSubmitting}>{contractForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Contract'}</Button></DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </CardHeader>
                    <CardContent>
                        {contracts.length > 0 ? (
                            <Table><TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Value</TableHead><TableHead>Effective Date</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{contracts.map(contract => (<TableRow key={contract.id}><TableCell className="font-medium">{contract.title}</TableCell><TableCell>{contract.value ? formatCurrency(contract.value) : 'N/A'}</TableCell><TableCell>{contract.effectiveDate ? format(contract.effectiveDate.toDate(), 'PPP') : 'N/A'}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-2">{contract.fileUrl && (<Button asChild variant="outline" size="icon" className="h-8 w-8"><Link href={contract.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /><span className="sr-only">View Contract</span></Link></Button>)}{profile?.role === 'admin' && (<Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => setContractToDelete(contract)}><Trash2 className="size-4" /></Button>)}</div></TableCell></TableRow>))}</TableBody></Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"><FileText className="size-12" /><p>No contracts found for this client.</p></div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="financials" className="pt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Financial History</CardTitle>
                        <CardDescription>A list of all income and expense records for this client.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {transactions.length > 0 ? (
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Date</TableHead>
                                       <TableHead>Description</TableHead>
                                       <TableHead>Type</TableHead>
                                       <TableHead className="text-right">Amount</TableHead>
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
                                <p>No financial records found for this client.</p>
                            </div>
                        )}
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
    </div>

    <AlertDialog open={!!contractToDelete} onOpenChange={(open) => !open && setContractToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the contract "{contractToDelete?.title}".</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setContractToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteContract} disabled={isDeletingContract} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeletingContract ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : <><Trash2 className="mr-2 h-4 w-4" /> Delete</>}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
