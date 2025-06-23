
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Briefcase, Contact, DollarSign, Users, Truck, Warehouse, ShoppingCart, FileText, ClipboardList } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

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

export function NotificationsPopover() {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(firestore, 'activityLog'), orderBy('timestamp', 'desc'), limit(7));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activitiesData: Activity[] = [];
            snapshot.forEach(doc => {
                activitiesData.push({ id: doc.id, ...doc.data() } as Activity);
            });
            setActivities(activitiesData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching recent activities: ", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                    <Bell />
                    <span className="sr-only">Open notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <Card className="border-none shadow-none">
                    <CardHeader className="p-2 pt-0">
                        <CardTitle className="text-base">Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-4">
                            {isLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <div key={i} className="flex items-start gap-3 px-2">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="flex-1 space-y-1">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                ))
                            ) : activities.length > 0 ? (
                                activities.map(activity => (
                                    <Link href={activity.link} key={activity.id} className="block rounded-lg p-2 hover:bg-muted">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                {activityIcons[activity.type] || activityIcons.DEFAULT}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-medium">{activity.message}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {activity.timestamp ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true }) : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="p-4 text-center text-sm text-muted-foreground">No recent activity.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </PopoverContent>
        </Popover>
    );
}
