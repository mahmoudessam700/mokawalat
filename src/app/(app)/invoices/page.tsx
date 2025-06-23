
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
import { Loader2, FilePlus, Search } from 'lucide-react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useMemo } from 'react';
import { addInvoice, updateInvoiceStatus } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';
import { PlusCircle, Trash2 } from 'lucide-react';


type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Void';

type Invoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  totalAmount: number;
  issueDate: Timestamp;
  dueDate: Timestamp;
  status: InvoiceStatus;
};

type Client = { id: string; name: string; };
type Project = { id: string; name: string; clientId: string; };

const statusVariant: { [key in InvoiceStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Draft: 'outline',
  Sent: 'default',
  Paid: 'secondary',
  Void: 'destructive',
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};

const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.coerce.number().min(0, "Unit price must be a non-negative number."),
});

const invoiceFormSchema = z.object({
  clientId: z.string().min(1, "A client is required."),
  projectId: z.string().optional(),
  issueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid issue date.',
  }),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid due date.',
  }),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const qInvoices = query(collection(firestore, 'invoices'), orderBy('issueDate', 'desc'));
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice)));
      setIsLoading(false);
    });

    const qClients = query(collection(firestore, 'clients'), orderBy('name', 'asc'));
    const unsubscribeClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });

    const qProjects = query(collection(firestore, 'projects'), orderBy('name', 'asc'));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    return () => {
      unsubscribeInvoices();
      unsubscribeClients();
      unsubscribeProjects();
    };
  }, []);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientId: '',
      projectId: '',
      issueDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(new Date(new Date().setDate(new Date().getDate() + 30)), 'yyyy-MM-dd'),
      lineItems: [{ description: '', quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const watchedClientId = form.watch('clientId');
  const filteredProjects = useMemo(() => {
    if (!watchedClientId) return [];
    return projects.filter(p => p.clientId === watchedClientId);
  }, [watchedClientId, projects]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || invoice.invoiceNumber.toLowerCase().includes(lowercasedTerm) || (clientMap.get(invoice.clientId) || '').toLowerCase().includes(lowercasedTerm);
        const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter, clientMap]);

  async function onSubmit(values: InvoiceFormValues) {
    const result = await addInvoice(values);
    if (result.errors) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      form.reset();
      setIsFormDialogOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Invoicing</h1>
          <p className="text-muted-foreground">Create and manage client invoices.</p>
        </div>
        {profile?.role === 'admin' && (
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
                <Button><FilePlus className="mr-2" /> Create Invoice</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>New Invoice</DialogTitle>
                    <DialogDescription>Fill in the details to create a new invoice. The status will initially be set to "Draft".</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="clientId" render={({ field }) => (<FormItem><FormLabel>Client</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger></FormControl><SelectContent>{clients.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="projectId" render={({ field }) => (<FormItem><FormLabel>Project (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!watchedClientId}><FormControl><SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger></FormControl><SelectContent>{filteredProjects.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="issueDate" render={({ field }) => (<FormItem><FormLabel>Issue Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    
                    <Card><CardHeader><CardTitle className="text-lg">Line Items</CardTitle></CardHeader><CardContent>
                        <ScrollArea className="h-[200px] w-full">
                        <div className="space-y-4 pr-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-[1fr,100px,120px,auto] items-start gap-2">
                                    <FormField control={form.control} name={`lineItems.${index}.description`} render={({ field }) => (<FormItem><FormLabel className="sr-only">Description</FormLabel><FormControl><Input placeholder="Item Description" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel className="sr-only">Quantity</FormLabel><FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (<FormItem><FormLabel className="sr-only">Unit Price</FormLabel><FormControl><Input type="number" placeholder="Unit Price" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <Button type="button" variant="ghost" size="icon" className="mt-1" onClick={() => remove(index)}><Trash2 className="size-4 text-destructive" /></Button>
                                </div>
                            ))}
                        </div>
                        </ScrollArea>
                        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}><PlusCircle className="mr-2"/>Add Line Item</Button>
                    </CardContent></Card>
                    <DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating...</> : 'Create Invoice'}</Button></DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <CardTitle>Invoice List</CardTitle>
                    <CardDescription>A list of all invoices in the system.</CardDescription>
                </div>
                <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input type="search" placeholder="Search by number or client..." className="w-full pl-8 md:w-[250px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by status" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Statuses</SelectItem>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Sent">Sent</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Void">Void</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Client</TableHead><TableHead>Issue Date</TableHead><TableHead>Due Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className='text-right'>Action</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? (Array.from({ length: 5 }).map((_, index) => (<TableRow key={index}><TableCell colSpan={7}><Skeleton className="h-8 w-full"/></TableCell></TableRow>)))
              : filteredInvoices.length > 0 ? (filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                    <TableCell className="font-mono">
                      <Link href={`/invoices/${invoice.id}`} className="hover:underline">
                        {invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{clientMap.get(invoice.clientId) || 'N/A'}</TableCell>
                    <TableCell>{format(invoice.issueDate.toDate(), 'PPP')}</TableCell>
                    <TableCell>{format(invoice.dueDate.toDate(), 'PPP')}</TableCell>
                    <TableCell><Badge variant={statusVariant[invoice.status]}>{invoice.status}</Badge></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(invoice.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                       <Button asChild variant="outline" size="sm">
                          <Link href={`/invoices/${invoice.id}`}>View Details</Link>
                        </Button>
                    </TableCell>
                </TableRow>
              )))
              : (<TableRow><TableCell colSpan={7} className="h-24 text-center">No invoices found.</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
