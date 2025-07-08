
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
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { addTrainingRecord } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { ArrowLeft, PlusCircle, Award, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

type Employee = { id: string; name: string; };
type TrainingRecord = {
    id: string;
    employeeId: string;
    employeeName: string;
    courseName: string;
    completionDate: Timestamp;
    certificateUrl?: string;
};

const trainingRecordFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  courseName: z.string().min(3, "Course name is required."),
  completionDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Please select a valid date.' }),
  certificate: z.any().optional(),
});

type TrainingRecordFormValues = z.infer<typeof trainingRecordFormSchema>;

export default function TrainingPage() {
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const qRecords = query(collection(firestore, 'trainings'), orderBy('completionDate', 'desc'));
    const unsubRecords = onSnapshot(qRecords, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingRecord)));
      setIsLoading(false);
    });

    const qEmployees = query(collection(firestore, 'employees'), where('status', '==', 'Active'));
    const unsubEmployees = onSnapshot(qEmployees, (snapshot) => {
        const activeEmployees = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
        activeEmployees.sort((a,b) => a.name.localeCompare(b.name));
        setEmployees(activeEmployees);
    });

    return () => {
        unsubRecords();
        unsubEmployees();
    };
  }, []);
  
  const form = useForm<TrainingRecordFormValues>({
    resolver: zodResolver(trainingRecordFormSchema),
    defaultValues: { employeeId: '', courseName: '', completionDate: format(new Date(), 'yyyy-MM-dd') },
  });
  
  async function onSubmit(values: TrainingRecordFormValues) {
    const formData = new FormData();
    formData.append('employeeId', values.employeeId);
    formData.append('courseName', values.courseName);
    formData.append('completionDate', values.completionDate);
    if (values.certificate && values.certificate.length > 0) {
      formData.append('certificate', values.certificate[0]);
    }
    
    const result = await addTrainingRecord(formData);

    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      form.reset();
      setIsFormDialogOpen(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon"><Link href="/hr"><ArrowLeft /><span className="sr-only">{t('employees.back_to_hr')}</span></Link></Button>
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">{t('hr.training.page_title')}</h1>
          <p className="text-muted-foreground">{t('hr.training.page_desc')}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('hr.training.list_title')}</CardTitle>
            <CardDescription>{t('hr.training.list_desc')}</CardDescription>
          </div>
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2" />{t('hr.training.add_button')}</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader><DialogTitle>{t('hr.training.add_title')}</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="employeeId" render={({ field }) => (<FormItem><FormLabel>{t('employee')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('employees.select_employee')} /></SelectTrigger></FormControl><SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="courseName" render={({ field }) => (<FormItem><FormLabel>{t('hr.training.course_name')}</FormLabel><FormControl><Input placeholder={t('hr.training.course_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="completionDate" render={({ field }) => (<FormItem><FormLabel>{t('hr.training.completion_date')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="certificate" render={() => (<FormItem><FormLabel>{t('hr.training.certificate_label')}</FormLabel><FormControl><Input type="file" {...form.register('certificate')} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 animate-spin"/>{t('saving')}</> : t('hr.training.save_button')}</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>{t('hr.training.course_name')}</TableHead><TableHead>{t('employee')}</TableHead><TableHead>{t('hr.training.completion_date')}</TableHead><TableHead>{t('hr.training.certificate_header')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, index) => (<TableRow key={index}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
              : records.length > 0 ? (
                records.map((record) => (
                    <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.courseName}</TableCell>
                        <TableCell>{record.employeeName}</TableCell>
                        <TableCell>{format(record.completionDate.toDate(), 'PPP')}</TableCell>
                        <TableCell>
                          {record.certificateUrl && <Button asChild variant="outline" size="sm"><Link href={record.certificateUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2"/>{t('hr.candidates.view_resume')}</Link></Button>}
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><div className="flex flex-col items-center justify-center gap-2 text-muted-foreground"><Award className="size-12" /><p>{t('hr.training.no_records')}</p></div></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
