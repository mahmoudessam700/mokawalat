
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
import { useLanguage } from '@/hooks/use-language';

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
  const { t } = useLanguage();

  useEffect(() => {
    if (!requestId) return;
    setIsLoading(true);
    setError(null);

    const unsubscribes: (() => void)[] = [];
    
    const requestRef = doc(firestore, 'procurement', requestId);
    const unsubRequest = onSnapshot(requestRef, (requestDoc) => {
        if (requestDoc.exists()) {
            const requestData = { id: requestDoc.id, ...requestDoc.data() } as PurchaseOrder;
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
            setError(t('procurement.detail.not_found'));
        }
        setIsLoading(false);
    }, (err) => {
        console.error('Error fetching purchase order:', err);
        setError(t('procurement.detail.fetch_error'));
        setIsLoading(false);
    });

    unsubscribes.push(unsubRequest);

    const qTransactions = query(collection(firestore, 'transactions'), where('purchaseOrderId', '==', requestId));
    unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }));
    
    return () => unsubscribes.forEach(unsub => unsub());
  }, [requestId, t]);

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
        <h2 className="text-2xl font-bold">{t('error')}</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/procurement">
            <ArrowLeft className="mr-2" />
            {t('procurement.detail.back_button')}
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
                    <span className="sr-only">{t('procurement.detail.back_button')}</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {t('procurement.detail.title', { name: request.itemName })}
                </h1>
                <p className="text-muted-foreground">
                    {t('procurement.detail.page_desc')}
                </p>
            </div>
        </div>
        
        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">{t('procurement.detail.details_tab')}</TabsTrigger>
                <TabsTrigger value="financials">{t('clients.financials_tab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('procurement.detail.order_details_title')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Activity className="size-4 text-muted-foreground" />
                                <Badge variant={requestStatusVariant[request.status]}>{t(`procurement.status.${request.status}`)}</Badge>
                            </div>
                            <div className="flex items-center gap-4">
                                <Hash className="size-4 text-muted-foreground" />
                                <span className="text-sm">{t('inventory.quantity_label')}: <strong>{request.quantity}</strong></span>
                            </div>
                            <div className="flex items-center gap-4">
                                <Calendar className="size-4 text-muted-foreground" />
                                <span className="text-sm">{t('procurement.detail.requested_on', { date: request.requestedAt ? format(request.requestedAt.toDate(), 'PPP') : 'N/A' })}</span>
                            </div>
                            <div className="flex items-center gap-4 border-t pt-4 mt-4">
                                <DollarSign className="size-4 text-muted-foreground" />
                                <div className="text-sm">
                                    <span>
                                        {t('procurement.detail.cost_breakdown', { unitCost: formatCurrency(request.unitCost), totalCost: formatCurrency(request.totalCost) })}
                                    </span>
                                    
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('project')}</CardTitle>
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
                                        <span className="text-sm">{t('status')}: {t(`project_status_${project.status.toLowerCase().replace(' ', '_')}`)}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">{t('procurement.detail.no_project_linked')}</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('supplier')}</CardTitle>
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
                                        <span className="text-sm">{t('status')}: {t(`suppliers.status.${supplier.status}`)}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">{t('procurement.detail.no_supplier_linked')}</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="financials" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('procurement.detail.linked_financials_title')}</CardTitle>
                        <CardDescription>{t('procurement.detail.linked_financials_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-24 w-full" />
                        ) : transactions.length > 0 ? (
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
                                            <TableCell><Badge variant={transaction.type === 'Income' ? 'secondary' : 'destructive'}>{t(`financials.${transaction.type.toLowerCase()}`)}</Badge></TableCell>
                                            <TableCell className={`text-right font-semibold ${transaction.type === 'Income' ? 'text-success' : ''}`}>{formatCurrency(transaction.amount)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <DollarSign className="size-12" />
                                <p>{t('procurement.detail.no_financial_records')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}

    