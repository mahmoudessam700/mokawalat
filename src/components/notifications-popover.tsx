
'use client';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, Warehouse, ShoppingCart, ClipboardList } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, Timestamp, orderBy, limit } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from './ui/skeleton';
import Link from 'next/link';

type NotificationType = 'Low Stock' | 'Pending PO' | 'Pending Material Request' | 'Budget Alert';

type Notification = {
  id: string;
  message: string;
  type: NotificationType;
  link: string;
  timestamp: Timestamp;
};

const notificationIcons: { [key in NotificationType]: React.ReactNode } = {
  'Low Stock': <Warehouse className="size-4" />,
  'Pending PO': <ShoppingCart className="size-4" />,
    'Pending Material Request': <ClipboardList className="size-4" />,
    'Budget Alert': <Bell className="size-4" />,
};

export function NotificationsPopover() {
    const [inventoryNotifs, setInventoryNotifs] = useState<Notification[]>([]);
    const [poNotifs, setPoNotifs] = useState<Notification[]>([]);
    const [materialNotifs, setMaterialNotifs] = useState<Notification[]>([]);
    const [budgetNotifs, setBudgetNotifs] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch Low Stock
    useEffect(() => {
        const q = query(collection(firestore, 'inventory'), where('status', '==', 'Low Stock'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setInventoryNotifs(snapshot.docs.map(doc => ({
                id: doc.id,
                message: `Low stock for "${doc.data().name}"`,
                type: 'Low Stock',
                link: '/inventory',
                timestamp: doc.data().createdAt || Timestamp.now(),
            })));
        }, (error) => console.error("Error fetching inventory notifications:", error));
        return () => unsubscribe();
    }, []);

    // Fetch Pending POs
    useEffect(() => {
        const q = query(collection(firestore, 'procurement'), where('status', '==', 'Pending'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
             setPoNotifs(snapshot.docs.map(doc => ({
                id: doc.id,
                message: `PO for ${doc.data().quantity}x ${doc.data().itemName}`,
                type: 'Pending PO',
                link: '/procurement',
                timestamp: doc.data().requestedAt || Timestamp.now(),
            })));
        }, (error) => console.error("Error fetching PO notifications:", error));
        return () => unsubscribe();
    }, []);

    // Fetch Pending Material Requests
    useEffect(() => {
        const q = query(collection(firestore, 'materialRequests'), where('status', '==', 'Pending'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMaterialNotifs(snapshot.docs.map(doc => ({
                id: doc.id,
                message: `Request for "${doc.data().itemName}"`,
                type: 'Pending Material Request',
                link: '/material-requests',
                timestamp: doc.data().requestedAt || Timestamp.now(),
            })));
        }, (error) => console.error("Error fetching material request notifications:", error));
        return () => unsubscribe();
    }, []);

    // Fetch recent budget alerts from activityLog
    useEffect(() => {
        const q = query(
          collection(firestore, 'activityLog'),
          where('type', '==', 'BUDGET_ALERT'),
          orderBy('timestamp', 'desc'),
          limit(10)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setBudgetNotifs(snapshot.docs.map(doc => ({
                id: doc.id,
                message: doc.data().message || 'Budget alert',
                type: 'Budget Alert',
                link: doc.data().link || '/projects',
                timestamp: doc.data().timestamp || Timestamp.now(),
            })));
        }, (error) => console.error('Error fetching budget alerts:', error));
        return () => unsubscribe();
    }, []);
    
    // Combine and sort notifications
    const notifications = useMemo(() => {
        const all = [...inventoryNotifs, ...poNotifs, ...materialNotifs, ...budgetNotifs];
        // Ensure all timestamps are valid before sorting
        return all
            .filter(n => n.timestamp && typeof n.timestamp.toMillis === 'function')
            .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
    }, [inventoryNotifs, poNotifs, materialNotifs, budgetNotifs]);
    
    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);


    const hasNotifications = !isLoading && notifications.length > 0;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                    <Bell />
                    {hasNotifications && (
                        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </span>
                    )}
                    <span className="sr-only">Open notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <Card className="border-none shadow-none">
                    <CardHeader className="p-2 pt-0">
                        <CardTitle className="text-base">Pending Tasks & Alerts</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="space-y-4">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex items-start gap-3 px-2">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="flex-1 space-y-1">
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                ))
                            ) : notifications.length > 0 ? (
                                notifications.slice(0, 7).map(notification => (
                                    <Link href={notification.link} key={notification.id} className="block rounded-lg p-2 hover:bg-muted">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                {notificationIcons[notification.type]}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-medium">{notification.message}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {notification.type}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <p className="p-4 text-center text-sm text-muted-foreground">No pending tasks.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </PopoverContent>
        </Popover>
    );
}
