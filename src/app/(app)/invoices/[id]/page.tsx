
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot, type Timestamp, collection, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer, Edit, Send, CheckCircle, X, ChevronDown, PlusCircle, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/icons';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateInvoice, updateInvoiceStatus, type InvoiceFormValues } from '../actions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';

// Types
type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Void';
type LineItem = { description: string; quantity: number; unitPrice: number; };
type Invoice = {
  id: string;
  invoiceNumber: string;
  clientId: string;
  projectId?: string;
  totalAmount: number;
  issueDate: Timestamp;
  dueDate: Timestamp;
  status: InvoiceStatus;
  lineItems: LineItem[];
};
type Client = { id: string; name: string; company?: string; email?: string; phone?: string; };
type Project = { id: string; name: string; clientId: string; };
type CompanyProfile = { name: string; address?: string; phone?: string; email?: string; logoUrl?: string; };

// Form Schema
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required."),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.coerce.number().min(0, "Unit price must be a non-negative number."),
});

const invoiceFormSchema = z.object({
  clientId: z.string().min(1, "A client is required."),
  projectId: z.string().optional(),
  issueDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Please select a valid issue date.' }),
  dueDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Please select a valid due date.' }),
  lineItems: z.array(lineItemSchema).min(1, "At least one line item is required."),
});

// Constants and Helpers
const statusVariant: { [key in InvoiceStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Draft: 'outline',
  Sent: 'default',
  Paid: 'secondary',
  Void: 'destructive',
};
const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP', minimumFractionDigits: 2 });
    return formatter.format(value).replace('EGP', 'LE');
};


export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [allClients, setAllClients] = useState<Client[]>([]);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const invoiceId = params.id;

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: { clientId: '', projectId: '', issueDate: '', dueDate: '', lineItems: [] },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lineItems" });

  useEffect(() => {
    if (!invoiceId) return;
    const unsubscribes: (() => void)[] = [];
    
    // Fetch related data
    unsubscribes.push(onSnapshot(doc(firestore, 'company', 'main'), (doc) => setCompany(doc.exists() ? doc.data() as CompanyProfile : null)));
    unsubscribes.push(onSnapshot(query(collection(firestore, 'clients'), orderBy('name')), (snap) => setAllClients(snap.docs.map(d => ({id: d.id, ...d.data()} as Client)))));
    unsubscribes.push(onSnapshot(query(collection(firestore, 'projects'), orderBy('name')), (snap) => setAllProjects(snap.docs.map(d => ({id: d.id, ...d.data()} as Project)))));

    // Fetch main invoice document and its direct relations
    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    unsubscribes.push(onSnapshot(invoiceRef, (invoiceDoc) => {
      if (invoiceDoc.exists()) {
        const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice;
        setInvoice(invoiceData);
        if (invoiceData.clientId) {
          unsubscribes.push(onSnapshot(doc(firestore, 'clients', invoiceData.clientId), (clientDoc) => setClient(clientDoc.exists() ? { id: clientDoc.id, ...clientDoc.data() } as Client : null)));
        }
        if (invoiceData.projectId) {
            unsubscribes.push(onSnapshot(doc(firestore, 'projects', invoiceData.projectId), (projectDoc) => setProject(projectDoc.exists() ? { id: projectDoc.id, ...projectDoc.data() } as Project : null)));
        } else {
            setProject(null);
        }
      } else {
        setError('Invoice not found.');
      }
      setIsLoading(false);
    }, (err) => {
      console.error("Error fetching invoice:", err);
      setError('Failed to fetch invoice details.');
      setIsLoading(false);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [invoiceId]);

  const watchedClientId = form.watch('clientId');
  const filteredProjects = useMemo(() => {
    if (!watchedClientId) return [];
    return allProjects.filter(p => p.clientId === watchedClientId);
  }, [watchedClientId, allProjects]);
  
  async function onSubmit(values: InvoiceFormValues) {
    const result = await updateInvoice(invoiceId, values);
    if (result.errors) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      setIsFormDialogOpen(false);
    }
  }

  async function handleStatusUpdate(id: string, status: 'Sent' | 'Paid' | 'Void') {
    const result = await updateInvoiceStatus(id, status);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }

  const handleEditClick = () => {
    if (!invoice) return;
    form.reset({
      clientId: invoice.clientId,
      projectId: invoice.projectId || '',
      issueDate: format(invoice.issueDate.toDate(), 'yyyy-MM-dd'),
      dueDate: format(invoice.dueDate.toDate(), 'yyyy-MM-dd'),
      lineItems: invoice.lineItems,
    });
    setIsFormDialogOpen(true);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Card><CardContent className="p-10"><Skeleton className="h-[700px] w-full" /></CardContent></Card>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[50vh]">
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{error || 'Could not load invoice.'}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/invoices"><ArrowLeft className="mr-2" />Back to Invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between print:hidden">
            <div className="flex items-center gap-4">
                <Button asChild variant="outline" size="icon"><Link href="/invoices"><ArrowLeft /><span className="sr-only">Back</span></Link></Button>
                <div>
                    <h1 className="font-headline text-3xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
                    <p className="text-muted-foreground">Issued to {client?.name || '...'} on {format(invoice.issueDate.toDate(), 'PPP')}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {profile?.role === 'admin' && invoice.status === 'Draft' && (
                    <Button onClick={handleEditClick} variant="outline"><Edit className="mr-2"/> Edit</Button>
                )}
                {profile?.role === 'admin' && invoice.status !== 'Paid' && invoice.status !== 'Void' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline">Update Status <ChevronDown className="ml-2"/></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator/>
                        {invoice.status === 'Draft' && <DropdownMenuItem onSelect={() => handleStatusUpdate(invoice.id, 'Sent')}><Send className="mr-2"/>Mark as Sent</DropdownMenuItem>}
                        {invoice.status === 'Sent' && <DropdownMenuItem onSelect={() => handleStatusUpdate(invoice.id, 'Paid')}><CheckCircle className="mr-2"/>Mark as Paid</DropdownMenuItem>}
                        <DropdownMenuItem className="text-destructive" onSelect={() => handleStatusUpdate(invoice.id, 'Void')}><X className="mr-2"/>Void Invoice</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button onClick={() => window.print()}><Printer className="mr-2"/> Print Invoice</Button>
            </div>
        </div>
        
        <Card className="max-w-4xl mx-auto print:shadow-none print:border-none" id="invoice-content">
            <CardHeader className="grid grid-cols-2 gap-6 p-8">
                <div>
                    {company?.logoUrl ? <img src={company.logoUrl} alt={company.name} className="h-16 w-auto object-contain" /> : <Logo className="h-12 w-12 text-primary" />}
                    <h2 className="mt-4 text-xl font-bold text-primary">{company?.name || 'Mokawalat'}</h2>
                    <p className="text-sm text-muted-foreground">{company?.address}</p>
                    <p className="text-sm text-muted-foreground">{company?.email} &middot; {company?.phone}</p>
                </div>
                <div className="text-right">
                    <h1 className="text-4xl font-bold text-foreground tracking-tight">INVOICE</h1>
                    <p className="text-muted-foreground mt-2"># {invoice.invoiceNumber}</p>
                    <Badge variant={statusVariant[invoice.status]} className="mt-4 text-lg px-4 py-1">{invoice.status}</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-8">
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                        <h3 className="font-semibold mb-2">Bill To</h3>
                        {client ? (<><p className="font-bold">{client.name}</p><p className="text-sm text-muted-foreground">{client.company || ''}</p><p className="text-sm text-muted-foreground">{client.email || ''}</p><p className="text-sm text-muted-foreground">{client.phone || ''}</p></>) : <Skeleton className="h-20 w-48"/>}
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">Issue Date: <span className="font-normal">{format(invoice.issueDate.toDate(), 'PPP')}</span></p>
                        <p className="font-semibold">Due Date: <span className="font-normal">{format(invoice.dueDate.toDate(), 'PPP')}</span></p>
                        {project && <p className="font-semibold mt-2">Project: <span className="font-normal">{project.name}</span></p>}
                    </div>
                </div>
                <Table>
                    <TableHeader><TableRow><TableHead className="w-[60%]">Description</TableHead><TableHead className="text-center">Quantity</TableHead><TableHead className="text-right">Unit Price</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>{invoice.lineItems.map((item, index) => (<TableRow key={index}><TableCell className="font-medium">{item.description}</TableCell><TableCell className="text-center">{item.quantity}</TableCell><TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell><TableCell className="text-right">{formatCurrency(item.quantity * item.unitPrice)}</TableCell></TableRow>))}</TableBody>
                </Table>
                <Separator className="my-6" />
                <div className="flex justify-end"><div className="w-full max-w-sm space-y-4"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(invoice.totalAmount)}</span></div><div className="flex justify-between font-bold text-lg"><span className="text-foreground">Total</span><span className="text-primary">{formatCurrency(invoice.totalAmount)}</span></div></div></div>
            </CardContent>
            <CardFooter className="p-8 text-center text-xs text-muted-foreground"><p>Thank you for your business. Please contact us with any questions regarding this invoice.</p></CardFooter>
        </Card>
        
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogContent className="max-w-3xl">
                <DialogHeader><DialogTitle>Edit Invoice</DialogTitle><DialogDescription>Make changes to this draft invoice. This cannot be done after it has been sent.</DialogDescription></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="clientId" render={({ field }) => (<FormItem><FormLabel>Client</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger></FormControl><SelectContent>{allClients.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /><FormField control={form.control} name="projectId" render={({ field }) => (<FormItem><FormLabel>Project (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value || ''} disabled={!watchedClientId}><FormControl><SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger></FormControl><SelectContent>{filteredProjects.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} /></div>
                        <div className="grid grid-cols-2 gap-4"><FormField control={form.control} name="issueDate" render={({ field }) => (<FormItem><FormLabel>Issue Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name="dueDate" render={({ field }) => (<FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} /></div>
                        <Card><CardHeader><CardTitle className="text-lg">Line Items</CardTitle></CardHeader><CardContent><ScrollArea className="h-[200px] w-full"><div className="space-y-4 pr-4">{fields.map((field, index) => (<div key={field.id} className="grid grid-cols-[1fr,100px,120px,auto] items-start gap-2"><FormField control={form.control} name={`lineItems.${index}.description`} render={({ field }) => (<FormItem><FormLabel className="sr-only">Description</FormLabel><FormControl><Input placeholder="Item Description" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name={`lineItems.${index}.quantity`} render={({ field }) => (<FormItem><FormLabel className="sr-only">Quantity</FormLabel><FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={form.control} name={`lineItems.${index}.unitPrice`} render={({ field }) => (<FormItem><FormLabel className="sr-only">Unit Price</FormLabel><FormControl><Input type="number" placeholder="Unit Price" {...field} /></FormControl><FormMessage /></FormItem>)} /><Button type="button" variant="ghost" size="icon" className="mt-1" onClick={() => remove(index)}><Trash2 className="size-4 text-destructive" /></Button></div>))}</div ></ScrollArea><Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })}><PlusCircle className="mr-2"/>Add Line Item</Button></CardContent></Card>
                        <DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Changes'}</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </div>
  )
}
