
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { CheckCircle2, PackageCheck, PackageX, ShoppingCart, ClipboardList, XCircle } from 'lucide-react';
import { updateMaterialRequestStatus } from '../material-requests/actions';
import { updatePurchaseRequestStatus } from '../procurement/actions';
import { useLanguage } from '@/hooks/use-language';

// Types from other modules
type MaterialRequest = {
  id: string;
  itemName: string;
  quantity: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: Timestamp;
  projectId: string;
};

type PurchaseOrder = {
  id: string;
  itemName: string;
  quantity: number;
  totalCost: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Ordered' | 'Received';
  requestedAt: Timestamp;
  projectId: string;
  supplierId: string;
};

type Project = {
  id: string;
  name: string;
};

type Supplier = {
  id: string;
  name: string;
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};


export default function ApprovalsPage() {
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (!isAuthLoading && !['admin', 'manager'].includes(profile?.role || '')) {
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You do not have permission to view this page.',
        });
        router.replace('/dashboard');
    }
  }, [profile, isAuthLoading, router, toast]);

  useEffect(() => {
    if (!['admin', 'manager'].includes(profile?.role || '')) return;

    const unsubscribes: (() => void)[] = [];

    const qMaterial = query(collection(firestore, 'materialRequests'), where('status', '==', 'Pending'));
    unsubscribes.push(onSnapshot(qMaterial, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialRequest));
      data.sort((a,b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0));
      setMaterialRequests(data);
    }, (err) => console.error("Error fetching pending material requests: ", err)));

    const qPOs = query(collection(firestore, 'procurement'), where('status', '==', 'Pending'));
    unsubscribes.push(onSnapshot(qPOs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder));
      data.sort((a,b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0));
      setPurchaseOrders(data);
    }, (err) => console.error("Error fetching pending purchase orders: ", err)));

    const qProjects = query(collection(firestore, 'projects'), where('status', '!=', 'Completed'));
    unsubscribes.push(onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }, (err) => console.error("Error fetching projects: ", err)));

    const qSuppliers = query(collection(firestore, 'suppliers'), where('status', '==', 'Active'));
    unsubscribes.push(onSnapshot(qSuppliers, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    }, (err) => console.error("Error fetching suppliers: ", err)));

    const timer = setTimeout(() => setIsLoading(false), 1500);
    unsubscribes.push(() => clearTimeout(timer));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [profile]);
  
  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);
  const supplierMap = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);
  
  async function handleMaterialRequestStatusUpdate(requestId: string, status: 'Approved' | 'Rejected') {
    const result = await updateMaterialRequestStatus(requestId, status);
    if (result.success) {
      toast({ title: t('success'), description: result.message });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
  }

  async function handlePOStatusUpdate(requestId: string, status: 'Approved' | 'Rejected') {
    const result = await updatePurchaseRequestStatus(requestId, status);
    if (result.success) {
        toast({ title: t('success'), description: result.message });
    } else {
        toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
  }

  if (isAuthLoading || !['admin', 'manager'].includes(profile?.role || '')) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div>
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="h-5 w-80 mt-2" />
                </div>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
                <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">{t('approvals.page_title')}</h1>
        <p className="text-muted-foreground">{t('approvals.page_desc')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ShoppingCart className="size-5 text-primary"/>
                    <CardTitle>{t('approvals.pending_po_title')}</CardTitle>
                </div>
                <CardDescription>{t('approvals.pending_po_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader><TableRow><TableHead>{t('item')}</TableHead><TableHead>{t('project')}</TableHead><TableHead className="text-right">{t('actions')}</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? (Array.from({ length: 2 }).map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-10 w-full"/></TableCell></TableRow>))
                        : purchaseOrders.length > 0 ? (
                            purchaseOrders.map(po => (
                                <TableRow key={po.id}>
                                    <TableCell>
                                        <div className="font-medium">{po.itemName} (x{po.quantity})</div>
                                        <div className="text-xs text-muted-foreground">{formatCurrency(po.totalCost)} from {supplierMap.get(po.supplierId) || 'N/A'}</div>
                                    </TableCell>
                                    <TableCell>{projectMap.get(po.projectId) || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="outline" className="text-success hover:text-success border-green-500 hover:bg-green-50" onClick={() => handlePOStatusUpdate(po.id, 'Approved')}><CheckCircle2 className="mr-2" /> {t('approvals.approve')}</Button>
                                            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive border-red-500 hover:bg-red-50" onClick={() => handlePOStatusUpdate(po.id, 'Rejected')}><XCircle className="mr-2" /> {t('approvals.reject')}</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (<TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">{t('approvals.no_pending_po')}</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ClipboardList className="size-5 text-primary"/>
                    <CardTitle>{t('approvals.pending_mr_title')}</CardTitle>
                </div>
                <CardDescription>{t('approvals.pending_mr_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader><TableRow><TableHead>{t('item')}</TableHead><TableHead>{t('project')}</TableHead><TableHead className="text-right">{t('actions')}</TableHead></TableRow></TableHeader>
                    <TableBody>
                        {isLoading ? (Array.from({ length: 2 }).map((_, i) => <TableRow key={i}><TableCell colSpan={3}><Skeleton className="h-10 w-full"/></TableCell></TableRow>))
                        : materialRequests.length > 0 ? (
                            materialRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>
                                        <div className="font-medium">{req.itemName}</div>
                                        <div className="text-xs text-muted-foreground">{t('inventory.quantity_label')}: {req.quantity}</div>
                                    </TableCell>
                                    <TableCell>{projectMap.get(req.projectId) || 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="outline" className="text-success hover:text-success border-green-500 hover:bg-green-50" onClick={() => handleMaterialRequestStatusUpdate(req.id, 'Approved')}><PackageCheck className="mr-2"/>{t('approvals.approve')}</Button>
                                            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive border-red-500 hover:bg-red-50" onClick={() => handleMaterialRequestStatusUpdate(req.id, 'Rejected')}><PackageX className="mr-2"/>{t('approvals.reject')}</Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (<TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">{t('approvals.no_pending_mr')}</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

      </div>

    </div>
  );
}

    