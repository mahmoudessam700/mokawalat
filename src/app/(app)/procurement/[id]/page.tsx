
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Timestamp, collection, query, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Truck, Calendar, Hash, Activity, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Ordered' | 'Received';
type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';
type SupplierStatus = 'Active' | 'Inactive';

type PurchaseOrder = {
  id: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  status: RequestStatus;
  requestedAt: Timestamp;
  projectId: string;
  supplierId: string;
};

type Project = {
    id: string;
    name: string;
    status: ProjectStatus;
};

type Supplier = {
    id: string;
    name: string;
    status: SupplierStatus;
};

type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  date: Timestamp;
};


const requestStatusVariant: { [key in RequestStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Pending: 'default',
  Approved: 'secondary',
  Ordered: 'outline',
  Received: 'secondary',
  Rejected: 'destructive',
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};

export default function ProcurementDetailPage({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<PurchaseOrder | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = params.id;

  useEffect(() => {
    if (!requestId) return;
    setIsLoading(true);
    setError(null);

    const unsubscribes: (() => void)[] = [];
    
    const requestRef = doc(firestore, 'procurement', requestId);
    const unsubRequest = onSnapshot(requestRef, (doc) => {
        if (doc.exists()) {
            const requestData = { id: doc.id, ...doc.data() } as PurchaseOrder;
            setRequest(requestData);

            if (requestData.projectId) {
                // Fetch related project
                const projectRef = doc(firestore, 'projects', requestData.projectId);
                unsubscribes.push(onSnapshot(projectRef, (projectDoc) => {
                    if (projectDoc.exists()) {
                        setProject({ id: projectDoc.id, ...projectDoc.data() } as Project);
                    }
                }));
            }
            
            if (requestData.supplierId) {
                // Fetch related supplier
                const supplierRef = doc(firestore, 'suppliers', requestData.supplierId);
                unsubscribes.push(onSnapshot(supplierRef, (supplierDoc) => {
                     if (supplierDoc.exists()) {
                        setSupplier({ id: supplierDoc.id, ...supplierDoc.data() } as Supplier);
                    }
                }));
            }

        } else {
            setError('Purchase Order not found.');
        }
        setIsLoading(false);
    }, (err) => {
        console.error('Error fetching purchase order:', err);
        setError('Failed to fetch purchase order details.');
        setIsLoading(false);
    });

    unsubscribes.push(unsubRequest);

    const qTransactions = query(collection(firestore, 'transactions'), where('purchaseOrderId', '==', requestId));
    unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }));
    
    return () => unsubscribes.forEach(unsub => unsub());
  }, [requestId]);

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
        <Skeleton className="h-10 w-48" />
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
          <Link href="/procurement">
            <ArrowLeft className="mr-2" />
            Back to Purchase Orders
          </Link>
        </Button>
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/procurement">
                    <ArrowLeft />
                    <span className="sr-only">Back to Purchase Orders</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    PO for: {request.itemName}
                </h1>
                <p className="text-muted-foreground">
                    Detailed view of the purchase order.
                </p>
            </div>
        </div>
        
        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">Details</TabsTrigger>
                <TabsTrigger value="financials">Financials</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Activity className="size-4 text-muted-foreground" />
                                <Badge variant={requestStatusVariant[request.status]}>{request.status}</Badge>
                            </div>
                            <div className="flex items-center gap-4">
                                <Hash className="size-4 text-muted-foreground" />
                                <span className="text-sm">Quantity: <strong>{request.quantity}</strong></span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Calendar className="size-4 text-muted-foreground" />
                                <span className="text-sm">Requested on {request.requestedAt ? format(request.requestedAt.toDate(), 'PPP') : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-4 border-t pt-4 mt-4">
                                <DollarSign className="size-4 text-muted-foreground" />
                                <div className="text-sm">
                                    <span>
                                        {formatCurrency(request.unitCost)} per unit &middot;{' '}
                                        <strong>Total: {formatCurrency(request.totalCost)}</strong>
                                    </span>
                                    
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Project</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {project ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Briefcase className="size-4 text-muted-foreground" />
                                        <Link href={`/projects/${project.id}`} className="font-semibold hover:underline">{project.name}</Link>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Activity className="size-4 text-muted-foreground" />
                                        <span className="text-sm">Status: {project.status}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No project linked.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Supplier</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {supplier ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <Truck className="size-4 text-muted-foreground" />
                                        <Link href={`/suppliers/${supplier.id}`} className="font-semibold hover:underline">{supplier.name}</Link>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Activity className="size-4 text-muted-foreground" />
                                        <span className="text-sm">Status: {supplier.status}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">No supplier linked.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="financials" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Linked Financials</CardTitle>
                        <CardDescription>Payments and other transactions linked to this purchase order.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-24 w-full" />
                        ) : transactions.length > 0 ? (
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
                                            <TableCell><Badge variant={transaction.type === 'Income' ? 'secondary' : 'destructive'}>{transaction.type}</Badge></TableCell>
                                            <TableCell className={`text-right font-semibold ${transaction.type === 'Income' ? 'text-success' : ''}`}>{formatCurrency(transaction.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <DollarSign className="size-12" />
                                <p>No financial records found for this purchase order.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
