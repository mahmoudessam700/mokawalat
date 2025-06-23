
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Logo } from '@/components/icons';

// Types from other modules
type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Void';

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
};

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

type Client = {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
};

type Project = {
  id: string;
  name: string;
};

type CompanyProfile = {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
};

const statusVariant: { [key in InvoiceStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Draft: 'outline',
  Sent: 'default',
  Paid: 'secondary',
  Void: 'destructive',
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'EGP', // Or use a variable if currency can change
        minimumFractionDigits: 2,
    });
    return formatter.format(value).replace('EGP', 'LE');
};

function InvoicePageContent() {
    const { invoice, client, project, company } = useInvoiceData();

    if (!invoice) {
        return null;
    }

    return (
         <Card className="max-w-4xl mx-auto print:shadow-none print:border-none" id="invoice-content">
            <CardHeader className="grid grid-cols-2 gap-6 p-8">
                <div>
                    {company?.logoUrl ? (
                        <img src={company.logoUrl} alt={company.name} className="h-16 w-auto object-contain" />
                    ) : (
                        <Logo className="h-12 w-12 text-primary" />
                    )}
                    <h2 className="mt-4 text-xl font-bold text-primary">{company?.name || 'Mokawalat ERP'}</h2>
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
                        {client ? (
                            <>
                            <p className="font-bold">{client.name}</p>
                            <p className="text-sm text-muted-foreground">{client.company}</p>
                            <p className="text-sm text-muted-foreground">{client.email}</p>
                            <p className="text-sm text-muted-foreground">{client.phone}</p>
                            </>
                        ) : <Skeleton className="h-20 w-48"/>}
                    </div>
                    <div className="text-right">
                        <p className="font-semibold">Issue Date: <span className="font-normal">{format(invoice.issueDate.toDate(), 'PPP')}</span></p>
                        <p className="font-semibold">Due Date: <span className="font-normal">{format(invoice.dueDate.toDate(), 'PPP')}</span></p>
                        {project && (
                            <p className="font-semibold mt-2">Project: <span className="font-normal">{project.name}</span></p>
                        )}
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[60%]">Description</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoice.lineItems.map((item, index) => (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{item.description}</TableCell>
                                <TableCell className="text-center">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Separator className="my-6" />
                <div className="flex justify-end">
                    <div className="w-full max-w-sm space-y-4">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{formatCurrency(invoice.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg">
                            <span className="text-foreground">Total</span>
                            <span className="text-primary">{formatCurrency(invoice.totalAmount)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
            <CardFooter className="p-8 text-center text-xs text-muted-foreground">
                <p>Thank you for your business. Please contact us with any questions regarding this invoice.</p>
            </CardFooter>
        </Card>
    );
}


// A new context to hold invoice data
const InvoiceDataContext = React.createContext<{
  invoice: Invoice | null;
  client: Client | null;
  project: Project | null;
  company: CompanyProfile | null;
}>({ invoice: null, client: null, project: null, company: null });

// Custom hook to access the context
const useInvoiceData = () => React.useContext(InvoiceDataContext);


export default function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const invoiceId = params.id;

  useEffect(() => {
    if (!invoiceId) return;

    const unsubscribes: (() => void)[] = [];
    
    const companyRef = doc(firestore, 'company', 'main');
    unsubscribes.push(onSnapshot(companyRef, (doc) => {
        setCompany(doc.exists() ? doc.data() as CompanyProfile : null);
    }));

    const invoiceRef = doc(firestore, 'invoices', invoiceId);
    unsubscribes.push(onSnapshot(invoiceRef, (invoiceDoc) => {
      if (invoiceDoc.exists()) {
        const invoiceData = { id: invoiceDoc.id, ...invoiceDoc.data() } as Invoice;
        setInvoice(invoiceData);

        const clientRef = doc(firestore, 'clients', invoiceData.clientId);
        unsubscribes.push(onSnapshot(clientRef, (clientDoc) => {
            setClient(clientDoc.exists() ? { id: clientDoc.id, ...clientDoc.data() } as Client : null);
        }));

        if (invoiceData.projectId) {
            const projectRef = doc(firestore, 'projects', invoiceData.projectId);
            unsubscribes.push(onSnapshot(projectRef, (projectDoc) => {
                setProject(projectDoc.exists() ? { id: projectDoc.id, ...projectDoc.data() } as Project : null);
            }));
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
     <InvoiceDataContext.Provider value={{ invoice, client, project, company }}>
        <div className="space-y-6">
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="icon">
                        <Link href="/invoices">
                            <ArrowLeft />
                            <span className="sr-only">Back to Invoices</span>
                        </Link>
                    </Button>
                    <div>
                        <h1 className="font-headline text-3xl font-bold tracking-tight">
                            Invoice {invoice.invoiceNumber}
                        </h1>
                        <p className="text-muted-foreground">
                            Issued to {client?.name || '...'} on {format(invoice.issueDate.toDate(), 'PPP')}
                        </p>
                    </div>
                </div>
                <Button onClick={() => window.print()}><Printer className="mr-2"/> Print Invoice</Button>
            </div>
            
            <InvoicePageContent />
            
            <style jsx global>{`
                @media print {
                body {
                    background-color: white;
                }
                .app-container, .main-container, .page-container, .sidebar-container {
                    display: block !important;
                    height: auto !important;
                    overflow: visible !important;
                }
                .print-container > :not(#invoice-content) {
                    display: none;
                }
                #invoice-content {
                    box-shadow: none !important;
                    border: none !important;
                }
                }
                @page {
                    size: auto;
                    margin: 0mm;
                }
            `}</style>
             <div className="print-container">
                <div className="hidden">
                    <InvoicePageContent/>
                </div>
            </div>
        </div>
    </InvoiceDataContext.Provider>
  )
}
