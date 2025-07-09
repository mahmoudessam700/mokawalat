
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useMemo } from 'react';
import { addLeaveRequest, updateLeaveRequestStatus, type LeaveRequestFormValues } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { ArrowLeft, PlusCircle, CalendarPlus, Loader2, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'Annual' | 'Sick' | 'Unpaid' | 'Other';
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'Pending' | 'Approved' | 'Rejected';
};

const leaveRequestFormSchema = z.object({
  leaveType: z.enum(['Annual', 'Sick', 'Unpaid', 'Other']),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date))),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date))),
  reason: z.string().optional(),
});

const statusVariant: { [key in LeaveRequest['status']]: 'default' | 'secondary' | 'destructive' } = {
  Pending: 'default',
  Approved: 'secondary',
  Rejected: 'destructive',
};

export default function LeaveManagementPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const q = query(collection(firestore, 'leaveRequests'), orderBy('requestedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest)));
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      leaveType: 'Annual',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      reason: '',
    },
  });

  async function onSubmit(values: LeaveRequestFormValues) {
    if (!profile) {
        toast({ variant: 'destructive', title: t('error'), description: 'You must be logged in.' });
        return;
    }
    const result = await addLeaveRequest(profile.uid, profile.email, values);
    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: t(result.message) });
      form.reset();
      setIsFormDialogOpen(false);
    }
  }

  async function handleStatusChange(requestId: string, status: 'Approved' | 'Rejected') {
    const result = await updateLeaveRequestStatus(requestId, status);
    if (result.success) {
      toast({ title: t('success'), description: t(result.message, { status }) });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/hr">
            <ArrowLeft />
            <span className="sr-only">{t('employees.back_to_hr')}</span>
          </Link>
        </Button>
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">{t('human_capital_management.leave_management.title')}</h1>
          <p className="text-muted-foreground">{t('human_capital_management.leave_management.page_desc')}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('human_capital_management.leave_management.list_title')}</CardTitle>
            <CardDescription>{t('human_capital_management.leave_management.list_desc')}</CardDescription>
          </div>
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild><Button><CalendarPlus className="mr-2" />{t('human_capital_management.leave_management.request_leave_button')}</Button></DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('human_capital_management.leave_management.request_leave_title')}</DialogTitle>
                    <DialogDescription>{t('human_capital_management.leave_management.request_leave_desc')}</DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="leaveType"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('human_capital_management.leave_management.leave_type_label')}</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Annual">{t('human_capital_management.leave_management.leave_types.Annual')}</SelectItem>
                                        <SelectItem value="Sick">{t('human_capital_management.leave_management.leave_types.Sick')}</SelectItem>
                                        <SelectItem value="Unpaid">{t('human_capital_management.leave_management.leave_types.Unpaid')}</SelectItem>
                                        <SelectItem value="Other">{t('human_capital_management.leave_management.leave_types.Other')}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="startDate" render={({ field }) => (<FormItem><FormLabel>{t('projects.start_date')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="endDate" render={({ field }) => (<FormItem><FormLabel>{t('human_capital_management.leave_management.end_date')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>{t('human_capital_management.leave_management.reason_label')}</FormLabel><FormControl><Textarea placeholder={t('human_capital_management.leave_management.reason_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 animate-spin"/>{t('saving')}</> : t('human_capital_management.leave_management.submit_request_button')}</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
                <TableHead>{t('employee')}</TableHead>
                <TableHead>{t('human_capital_management.leave_management.leave_type_label')}</TableHead>
                <TableHead>{t('projects.start_date')}</TableHead>
                <TableHead>{t('human_capital_management.leave_management.end_date')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                {['admin', 'manager'].includes(profile?.role || '') && <TableHead className="text-right">{t('actions')}</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, index) => (<TableRow key={index}><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
              : requests.length > 0 ? (
                requests.map((req) => (
                    <TableRow key={req.id}>
                        <TableCell>{req.employeeName}</TableCell>
                        <TableCell>{t(`human_capital_management.leave_management.leave_types.${req.leaveType}`)}</TableCell>
                        <TableCell>{format(req.startDate.toDate(), 'PPP')}</TableCell>
                        <TableCell>{format(req.endDate.toDate(), 'PPP')}</TableCell>
                        <TableCell><Badge variant={statusVariant[req.status]}>{t(`human_capital_management.leave_management.status.${req.status}`)}</Badge></TableCell>
                        {['admin', 'manager'].includes(profile?.role || '') && (
                          <TableCell className="text-right">
                            {req.status === 'Pending' && (
                              <div className="flex justify-end gap-2">
                                <Button size="icon" variant="outline" className="h-8 w-8 text-success" onClick={() => handleStatusChange(req.id, 'Approved')}><Check className="size-4"/></Button>
                                <Button size="icon" variant="outline" className="h-8 w-8 text-destructive" onClick={() => handleStatusChange(req.id, 'Rejected')}><X className="size-4"/></Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                    </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="h-24 text-center">{t('human_capital_management.leave_management.no_history')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

