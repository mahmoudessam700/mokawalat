
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Briefcase,
  Contact,
  Users,
  DollarSign,
  Truck,
  Warehouse,
  ShoppingCart,
  FileText,
  ClipboardList,
  Bell,
  History,
} from 'lucide-react';

type Activity = {
  id: string;
  message: string;
  type: string;
  link: string;
  timestamp: Timestamp;
};

const activityIcons: { [key: string]: React.ReactNode } = {
  PROJECT_CREATED: <Briefcase className="size-4" />,
  CLIENT_ADDED: <Contact className="size-4" />,
  EMPLOYEE_HIRED: <Users className="size-4" />,
  TRANSACTION_ADDED: <DollarSign className="size-4" />,
  SUPPLIER_ADDED: <Truck className="size-4" />,
  INVENTORY_ADDED: <Warehouse className="size-4" />,
  PO_CREATED: <ShoppingCart className="size-4" />,
  CONTRACT_ADDED: <FileText className="size-4" />,
  MATERIAL_REQUESTED: <ClipboardList className="size-4" />,
  DEFAULT: <Bell className="size-4" />,
};

const activityTypes = [
    "PROJECT_CREATED",
    "CLIENT_ADDED",
    "EMPLOYEE_HIRED",
    "TRANSACTION_ADDED",
    "SUPPLIER_ADDED",
    "INVENTORY_ADDED",
    "PO_CREATED",
    "CONTRACT_ADDED",
    "MATERIAL_REQUESTED",
];

const formatActivityType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(firestore, 'activityLog'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Activity[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Activity);
      });
      setActivities(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching activity log: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch activity log.',
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const filteredActivities = useMemo(() => {
    if (typeFilter === 'All') {
      return activities;
    }
    return activities.filter((activity) => activity.type === typeFilter);
  }, [activities, typeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">Activity Log</h1>
        <p className="text-muted-foreground">A complete audit trail of all major events in the system.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
             <div>
                <CardTitle>Log History</CardTitle>
                <CardDescription>All recorded activities, sorted by most recent.</CardDescription>
             </div>
            <div className="flex items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Filter by event type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Event Types</SelectItem>
                  {activityTypes.map(type => (
                      <SelectItem key={type} value={type}>{formatActivityType(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Event</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[400px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[150px] rounded-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredActivities.length > 0 ? (
                filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {activityIcons[activity.type] || activityIcons.DEFAULT}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={activity.link} className="font-medium hover:underline">
                        {activity.message}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatActivityType(activity.type)}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {activity.timestamp ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <History className="size-12" />
                        No activity recorded for the selected filter.
                    </div>
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
