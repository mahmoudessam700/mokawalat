'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Mail, Phone, Building, ShoppingCart, Truck } from 'lucide-react';
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

type SupplierStatus = 'Active' | 'Inactive';
type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Ordered';

type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: SupplierStatus;
};

type PurchaseRequest = {
  id: string;
  itemName: string;
  quantity: number;
  status: RequestStatus;
  requestedAt: Timestamp;
  projectId: string;
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
  Rejected: 'destructive',
};

export default function SupplierDetailPage({ params }: { params: { id: string } }) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [projects, setProjects] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supplierId = params.id;

  useEffect(() => {
    if (!supplierId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const supplierRef = doc(firestore, 'suppliers', supplierId);
        const supplierDoc = await getDoc(supplierRef);

        if (supplierDoc.exists()) {
          setSupplier({ id: supplierDoc.id, ...supplierDoc.data() } as Supplier);

          // Query for purchase requests from this supplier
          const requestsQuery = query(
            collection(firestore, 'procurement'),
            where('supplierId', '==', supplierId)
          );
          const requestsSnapshot = await getDocs(requestsQuery);
          const requestsData: PurchaseRequest[] = [];
          const projectIds = new Set<string>();
          requestsSnapshot.forEach(doc => {
            const request = { id: doc.id, ...doc.data() } as PurchaseRequest;
            requestsData.push(request);
            if (request.projectId) {
                projectIds.add(request.projectId);
            }
          });
          setRequests(requestsData);

          // Fetch project names for display
          if (projectIds.size > 0) {
            const projectsQuery = query(collection(firestore, 'projects'), where('__name__', 'in', Array.from(projectIds)));
            const projectsSnapshot = await getDocs(projectsQuery);
            const projectMap = new Map<string, string>();
            projectsSnapshot.forEach(doc => {
                projectMap.set(doc.id, (doc.data() as Project).name);
            });
            setProjects(projectMap);
          }

        } else {
          setError('Supplier not found.');
        }
      } catch (err) {
        console.error('Error fetching supplier details:', err);
        setError('Failed to fetch supplier details. If you see a Firestore error in the console, you may need to create a composite index.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [supplierId]);

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
            <Card className="lg:col-span-1"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
            <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
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
          <Link href="/suppliers">
            <ArrowLeft className="mr-2" />
            Back to Suppliers
          </Link>
        </Button>
      </div>
    );
  }

  if (!supplier) return null;

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/suppliers">
                    <ArrowLeft />
                    <span className="sr-only">Back to Suppliers</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {supplier.name}
                </h1>
                <p className="text-muted-foreground">
                    Detailed supplier profile and procurement history.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
           <Card className="lg:col-span-1">
                <CardHeader>
                    <CardTitle>Supplier Information</CardTitle>
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
                        <Badge variant={statusVariant[supplier.status]}>{supplier.status}</Badge>
                    </div>
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                 <CardHeader>
                    <CardTitle>Procurement History</CardTitle>
                    <CardDescription>A list of all purchase requests made to this supplier.</CardDescription>
                </CardHeader>
                <CardContent>
                    {requests.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
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
                            <p>No purchase requests found for this supplier.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
