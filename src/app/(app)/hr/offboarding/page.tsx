
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
import { useState, useEffect } from 'react';
import { startOffboarding, type OffboardingFormValues } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { ArrowLeft, PlusCircle, UserMinus, Loader2, Check } from 'lucide-react';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

type Employee = { id: string; name: string; };
type OffboardingRecord = {
    id: string;
    employeeId: string;
    exitDate: Timestamp;
    reason: string;
    assetsReturned: boolean;
};

const offboardingFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  exitDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Please select a valid date.' }),
  reason: z.string().min(3, "Reason for departure is required."),
  feedback: z.string().optional(),
  assetsReturned: z.boolean().default(false),
});

export default function OffboardingPage() {
  const [records, setRecords] = useState<OffboardingRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const qRecords = query(collection(firestore, 'offboarding'), orderBy('exitDate', 'desc'));
    const unsubRecords = onSnapshot(qRecords, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OffboardingRecord)));
      setIsLoading(false);
    });

    // Only fetch active employees for the offboarding form
    const qEmployees = query(collection(firestore, 'employees'), where('status', '==', 'Active'));
    const unsubEmployees = onSnapshot(qEmployees, (snapshot) => {
        const activeEmployees = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
        activeEmployees.sort((a,b) => a.name.localeCompare(b.name)); // Sort client-side
        setEmployees(activeEmployees);
    });

    return () => {
        unsubRecords();
        unsubEmployees();
    };
  }, []);
  
  const form = useForm<OffboardingFormValues>({
    resolver: zodResolver(offboardingFormSchema),
    defaultValues: { employeeId: '', exitDate: format(new Date(), 'yyyy-MM-dd'), reason: '', feedback: '', assetsReturned: false },
  });
  
  async function onSubmit(values: OffboardingFormValues) {
    const result = await startOffboarding(values);
    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      form.reset();
      setIsFormDialogOpen(false);
    }
  }

  const employeeMap = new Map(employees.map(e => [e.id, e.name]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon"><Link href="/hr"><ArrowLeft /><span className="sr-only">{t('employees.back_to_hr')}</span></Link></Button>
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">{t('hr.offboarding.page_title')}</h1>
          <p className="text-muted-foreground">{t('hr.offboarding.page_desc')}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('hr.offboarding.list_title')}</CardTitle>
            <CardDescription>{t('hr.offboarding.list_desc')}</CardDescription>
          </div>
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2" />{t('hr.offboarding.add_button')}</Button></DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>{t('hr.offboarding.add_title')}</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="employeeId" render={({ field }) => (<FormItem><FormLabel>{t('employee')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('employees.select_employee')} /></SelectTrigger></FormControl><SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="exitDate" render={({ field }) => (<FormItem><FormLabel>{t('hr.offboarding.exit_date')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="reason" render={({ field }) => (<FormItem><FormLabel>{t('hr.offboarding.reason')}</FormLabel><FormControl><Input placeholder={t('hr.offboarding.reason_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="feedback" render={({ field }) => (<FormItem><FormLabel>{t('hr.offboarding.feedback')}</FormLabel><FormControl><Textarea placeholder={t('hr.offboarding.feedback_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="assetsReturned" render={({ field }) => (<FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><div className="space-y-1 leading-none"><FormLabel>{t('hr.offboarding.assets_returned')}</FormLabel></div></FormItem>)} />
                        <DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 animate-spin"/>{t('saving')}</> : t('hr.offboarding.save_button')}</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>{t('employee')}</TableHead><TableHead>{t('hr.offboarding.exit_date')}</TableHead><TableHead>{t('hr.offboarding.reason')}</TableHead><TableHead>{t('hr.offboarding.assets_returned')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, index) => (<TableRow key={index}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
              : records.length > 0 ? (
                records.map((record) => (
                    <TableRow key={record.id}>
                        <TableCell className="font-medium">{employeeMap.get(record.employeeId) || record.employeeId}</TableCell>
                        <TableCell>{format(record.exitDate.toDate(), 'PPP')}</TableCell>
                        <TableCell>{record.reason}</TableCell>
                        <TableCell>
                          {record.assetsReturned && <Check className="text-green-500" />}
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><div className="flex flex-col items-center justify-center gap-2 text-muted-foreground"><UserMinus className="size-12" /><p>{t('hr.offboarding.no_records')}</p></div></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
