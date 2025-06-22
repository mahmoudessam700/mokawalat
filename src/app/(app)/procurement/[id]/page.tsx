
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Truck, Calendar, Hash, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';

type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Ordered';
type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';
type SupplierStatus = 'Active' | 'Inactive';

type PurchaseRequest = {
  id: string;
  itemName: string;
  quantity: number;
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


const requestStatusVariant: { [key in RequestStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Pending: 'default',
  Approved: 'secondary',
  Ordered: 'outline',
  Rejected: 'destructive',
};

export default function ProcurementDetailPage({ params }: { params: { id: string } }) {
  const [request, setRequest] = useState<PurchaseRequest | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
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
            const requestData = { id: doc.id, ...doc.data() } as PurchaseRequest;
            setRequest(requestData);

            // Fetch related project
            const projectRef = doc(firestore, 'projects', requestData.projectId);
            unsubscribes.push(onSnapshot(projectRef, (projectDoc) => {
                if (projectDoc.exists()) {
                    setProject({ id: projectDoc.id, ...projectDoc.data() } as Project);
                }
            }));
            
            // Fetch related supplier
            const supplierRef = doc(firestore, 'suppliers', requestData.supplierId);
            unsubscribes.push(onSnapshot(supplierRef, (supplierDoc) => {
                 if (supplierDoc.exists()) {
                    setSupplier({ id: supplierDoc.id, ...supplierDoc.data() } as Supplier);
                }
            }));

        } else {
            setError('Purchase Request not found.');
        }
        setIsLoading(false);
    }, (err) => {
        console.error('Error fetching purchase request:', err);
        setError('Failed to fetch purchase request details.');
        setIsLoading(false);
    });

    unsubscribes.push(unsubRequest);
    
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
        </div>
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
            Back to Procurement
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
                    <span className="sr-only">Back to Procurement</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    Request for: {request.itemName}
                </h1>
                <p className="text-muted-foreground">
                    Detailed view of the purchase request.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle>Request Details</CardTitle>
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
                        <Skeleton className="h-16 w-full" />
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
                        <Skeleton className="h-16 w-full" />
                    )}
                 </CardContent>
            </Card>
        </div>
    </div>
  );
}
