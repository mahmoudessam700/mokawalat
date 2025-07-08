
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
import { Input } from '@/components/ui/input';
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
  Pencil,
  Trash2,
  ListChecks,
  Search,
  Wrench,
  Receipt,
  Star,
  PackageCheck,
  PackageX,
  Sparkles,
  CalendarCheck,
  CalendarX,
  LogIn,
  LogOut,
  CalendarPlus,
} from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { ar, enUS } from 'date-fns/locale';

type Activity = {
  id: string;
  message: string;
  type: string;
  link: string;
  timestamp: Timestamp;
};

const activityIcons: { [key: string]: React.ReactNode } = {
  PROJECT_CREATED: <Briefcase className="size-4" />,
  PROJECT_UPDATED: <Pencil className="size-4" />,
  PROJECT_DELETED: <Trash2 className="size-4" />,
  CLIENT_ADDED: <Contact className="size-4" />,
  CLIENT_UPDATED: <Pencil className="size-4" />,
  CLIENT_DELETED: <Trash2 className="size-4" />,
  EMPLOYEE_HIRED: <Users className="size-4" />,
  EMPLOYEE_UPDATED: <Pencil className="size-4" />,
  EMPLOYEE_DELETED: <Trash2 className="size-4" />,
  TRANSACTION_ADDED: <DollarSign className="size-4" />,
  TRANSACTION_UPDATED: <Pencil className="size-4" />,
  TRANSACTION_DELETED: <Trash2 className="size-4" />,
  PAYROLL_RUN: <DollarSign className="size-4" />,
  SUPPLIER_ADDED: <Truck className="size-4" />,
  SUPPLIER_UPDATED: <Pencil className="size-4" />,
  SUPPLIER_DELETED: <Trash2 className="size-4" />,
  SUPPLIER_EVALUATED: <Star className="size-4" />,
  INVENTORY_ADDED: <Warehouse className="size-4" />,
  INVENTORY_DELETED: <Trash2 className="size-4" />,
  INVENTORY_UPDATED: <Pencil className="size-4" />,
  INVENTORY_ADJUSTED: <Wrench className="size-4" />,
  ASSET_ADDED: <Wrench className="size-4" />,
  ASSET_UPDATED: <Pencil className="size-4" />,
  ASSET_DELETED: <Trash2 className="size-4" />,
  ASSET_MAINTENANCE_LOGGED: <Wrench className="size-4" />,
  PO_CREATED: <ShoppingCart className="size-4" />,
  PO_UPDATED: <Pencil className="size-4" />,
  PO_DELETED: <Trash2 className="size-4" />,
  PO_STATUS_CHANGED: <ListChecks className="size-4" />,
  CONTRACT_ADDED: <FileText className="size-4" />,
  CONTRACT_DELETED: <Trash2 className="size-4" />,
  MATERIAL_REQUESTED: <ClipboardList className="size-4" />,
  MATERIAL_REQUEST_APPROVED: <PackageCheck className="size-4" />,
  MATERIAL_REQUEST_REJECTED: <PackageX className="size-4" />,
  TASK_ADDED: <ClipboardList className="size-4" />,
  TASK_STATUS_CHANGED: <ListChecks className="size-4" />,
  TASK_DELETED: <Trash2 className="size-4" />,
  DOCUMENT_UPLOADED: <FileText className="size-4" />,
  DOCUMENT_DELETED: <Trash2 className="size-4" />,
  INVOICE_CREATED: <Receipt className="size-4" />,
  INVOICE_STATUS_CHANGED: <ListChecks className="size-4" />,
  TEAM_ASSIGNED_TO_PROJECT: <Users className="size-4" />,
  AI_TASKS_SUGGESTED: <Sparkles className="size-4" />,
  LEAVE_REQUEST_CREATED: <CalendarPlus className="size-4" />,
  LEAVE_REQUEST_APPROVED: <CalendarCheck className="size-4" />,
  LEAVE_REQUEST_REJECTED: <CalendarX className="size-4" />,
  ATTENDANCE_CHECK_IN: <LogIn className="size-4" />,
  ATTENDANCE_CHECK_OUT: <LogOut className="size-4" />,
  DEFAULT: <Bell className="size-4" />,
};

const activityTypes = Object.keys(activityIcons).filter(k => k !== 'DEFAULT').sort();

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const { t, locale } = useLanguage();

  const fnsLocale = useMemo(() => (locale === 'ar' ? ar : enUS), [locale]);

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
        title: t('error'),
        description: t('activity_log_page.fetch_error'),
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, t]);

  const filteredActivities = useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    return activities.filter((activity) => {
      const matchesSearch = !searchTerm || activity.message.toLowerCase().includes(lowercasedTerm);
      const matchesType = typeFilter === 'All' || activity.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [activities, typeFilter, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">{t('activity_log_page.title')}</h1>
        <p className="text-muted-foreground">{t('activity_log_page.description')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
             <div>
                <CardTitle>{t('activity_log_page.history_title')}</CardTitle>
                <CardDescription>{t('activity_log_page.history_description')}</CardDescription>
             </div>
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('activity_log_page.search_placeholder')}
                  className="w-full pl-8 md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder={t('activity_log_page.filter_placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('activity_log_page.all_event_types')}</SelectItem>
                  {activityTypes.map(type => (
                      <SelectItem key={type} value={type}>{t(`activity_types.${type}`)}</SelectItem>
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
                <TableHead className="w-[50px]">{t('activity_log_page.event_header')}</TableHead>
                <TableHead>{t('activity_log_page.description_header')}</TableHead>
                <TableHead>{t('activity_log_page.type_header')}</TableHead>
                <TableHead className="text-right">{t('activity_log_page.time_header')}</TableHead>
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
                      <Badge variant="outline">{t(`activity_types.${activity.type}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs">
                      {activity.timestamp ? formatDistanceToNow(activity.timestamp.toDate(), { addSuffix: true, locale: fnsLocale }) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <History className="size-12" />
                        {activities.length > 0
                            ? t('activity_log_page.no_filtered_results')
                            : t('activity_log_page.no_activity_yet')
                        }
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
