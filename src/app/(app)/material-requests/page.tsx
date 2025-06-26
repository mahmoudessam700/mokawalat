
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { PackageCheck, PackageX } from 'lucide-react';
import { updateMaterialRequestStatus } from './actions';
import { useLanguage } from '@/hooks/use-language';

type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

type MaterialRequest = {
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
};

const statusVariant: { [key in RequestStatus]: 'default' | 'secondary' | 'destructive' } = {
  Pending: 'default',
  Approved: 'secondary',
  Rejected: 'destructive',
};


export default function MaterialRequestsPage() {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const qRequests = query(collection(firestore, 'materialRequests'), orderBy('requestedAt', 'desc'));
    unsubscribes.push(onSnapshot(qRequests, (snapshot) => {
      const data: MaterialRequest[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialRequest));
      setRequests(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching material requests: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch material requests.' });
      setIsLoading(false);
    }));

    const qProjects = query(collection(firestore, 'projects'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qProjects, (snapshot) => {
      const data: Project[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(data);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      return statusFilter === 'All' || req.status === statusFilter;
    });
  }, [requests, statusFilter]);

  async function handleRequestStatusUpdate(requestId: string, status: 'Approved' | 'Rejected') {
    const result = await updateMaterialRequestStatus(requestId, status);
    if (result.success) {
      toast({ title: t('success'), description: result.message });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">{t('material_requests.page_title')}</h1>
        <p className="text-muted-foreground">{t('material_requests.page_desc')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>{t('material_requests.list_title')}</CardTitle>
              <CardDescription>{t('material_requests.list_desc')}</CardDescription>
            </div>
            <div className="w-[180px]">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('clients.filter_by_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('clients.all_statuses')}</SelectItem>
                  <SelectItem value="Pending">{t('material_requests.status.Pending')}</SelectItem>
                  <SelectItem value="Approved">{t('material_requests.status.Approved')}</SelectItem>
                  <SelectItem value="Rejected">{t('material_requests.status.Rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('item')}</TableHead>
                <TableHead>{t('inventory.quantity_label')}</TableHead>
                <TableHead>{t('project')}</TableHead>
                <TableHead>{t('procurement.requested_on')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                {['admin', 'manager'].includes(profile?.role || '') && <TableHead className="text-right">{t('actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                    {['admin', 'manager'].includes(profile?.role || '') && <TableCell><Skeleton className="h-8 w-[72px] ml-auto" /></TableCell>}
                  </TableRow>
                ))
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.itemName}</TableCell>
                    <TableCell>{req.quantity}</TableCell>
                    <TableCell>
                        <Link href={`/projects/${req.projectId}`} className="hover:underline">
                            {projectMap.get(req.projectId) || 'N/A'}
                        </Link>
                    </TableCell>
                    <TableCell>{req.requestedAt ? format(req.requestedAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell><Badge variant={statusVariant[req.status]}>{t(`material_requests.status.${req.status}`)}</Badge></TableCell>
                    {['admin', 'manager'].includes(profile?.role || '') && (
                      <TableCell className="text-right">
                        {req.status === 'Pending' ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="icon" variant="outline" className="h-8 w-8 text-success hover:text-success border-green-500 hover:bg-green-50" onClick={() => handleRequestStatusUpdate(req.id, 'Approved')}>
                                <PackageCheck className="size-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive border-red-500 hover:bg-red-50" onClick={() => handleRequestStatusUpdate(req.id, 'Rejected')}>
                                <PackageX className="size-4" />
                            </Button>
                          </div>
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={['admin', 'manager'].includes(profile?.role || '') ? 6 : 5} className="h-24 text-center">
                    {t('material_requests.no_requests_found')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

    