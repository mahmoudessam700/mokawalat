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
import { useState, useEffect } from 'react';
import { addPerformanceReview, type PerformanceReviewFormValues } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import { ArrowLeft, PlusCircle, TrendingUp, Star, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Employee = { id: string; name: string; };
type PerformanceReview = {
    id: string;
    employeeId: string;
    employeeName: string;
    reviewerEmail: string;
    reviewDate: Timestamp;
    rating: number;
    goals: string;
    feedback: string;
};

const performanceReviewFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  reviewDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: 'Please select a valid date.' }),
  rating: z.coerce.number().min(1, "Rating is required").max(5),
  goals: z.string().min(10, "Goals must be at least 10 characters long."),
  feedback: z.string().min(10, "Feedback must be at least 10 characters long."),
});

function StarRatingDisplay({ rating = 0 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={cn('size-4', rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30')} />
      ))}
    </div>
  );
}

export default function PerformanceReviewsPage() {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const qReviews = query(collection(firestore, 'performanceReviews'), orderBy('reviewDate', 'desc'));
    const unsubReviews = onSnapshot(qReviews, (snapshot) => {
      setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PerformanceReview)));
      setIsLoading(false);
    });

    const qEmployees = query(collection(firestore, 'employees'), orderBy('name', 'asc'));
    const unsubEmployees = onSnapshot(qEmployees, (snapshot) => {
        setEmployees(snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name })));
    });

    return () => {
        unsubReviews();
        unsubEmployees();
    };
  }, []);
  
  const form = useForm<PerformanceReviewFormValues>({
    resolver: zodResolver(performanceReviewFormSchema),
    defaultValues: { employeeId: '', reviewDate: format(new Date(), 'yyyy-MM-dd'), rating: 3, goals: '', feedback: '' },
  });
  
  async function onSubmit(values: PerformanceReviewFormValues) {
    if (!profile?.uid) return;
    const result = await addPerformanceReview(profile.uid, values);

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
          <h1 className="font-headline text-3xl font-bold tracking-tight">{t('hr.performance.page_title')}</h1>
          <p className="text-muted-foreground">{t('hr.performance.page_desc')}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('hr.performance.list_title')}</CardTitle>
            <CardDescription>{t('hr.performance.list_desc')}</CardDescription>
          </div>
          <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild><Button><PlusCircle className="mr-2" />{t('hr.performance.add_button')}</Button></DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>{t('hr.performance.add_title')}</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="employeeId" render={({ field }) => (<FormItem><FormLabel>{t('employee')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('employees.select_employee')} /></SelectTrigger></FormControl><SelectContent>{employees.map(e => (<SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="reviewDate" render={({ field }) => (<FormItem><FormLabel>{t('hr.performance.review_date')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="rating" render={({ field }) => (<FormItem><FormLabel>{t('suppliers.rating_header')}</FormLabel><FormControl><Select onValueChange={(val) => field.onChange(Number(val))} value={String(field.value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(r => <SelectItem key={r} value={String(r)}>{r} Stars</SelectItem>)}</SelectContent></Select></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="goals" render={({ field }) => (<FormItem><FormLabel>{t('hr.performance.goals')}</FormLabel><FormControl><Textarea placeholder={t('hr.performance.goals_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="feedback" render={({ field }) => (<FormItem><FormLabel>{t('hr.performance.feedback')}</FormLabel><FormControl><Textarea placeholder={t('hr.performance.feedback_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 animate-spin"/>{t('saving')}</> : t('hr.performance.save_button')}</Button></DialogFooter>
                    </form>
                </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>{t('employee')}</TableHead><TableHead>{t('hr.performance.review_date')}</TableHead><TableHead>{t('hr.performance.reviewer')}</TableHead><TableHead>{t('suppliers.rating_header')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, index) => (<TableRow key={index}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
              : reviews.length > 0 ? (
                reviews.map((review) => (
                    <TableRow key={review.id}>
                        <TableCell className="font-medium">{review.employeeName}</TableCell>
                        <TableCell>{format(review.reviewDate.toDate(), 'PPP')}</TableCell>
                        <TableCell>{review.reviewerEmail}</TableCell>
                        <TableCell><StarRatingDisplay rating={review.rating} /></TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center"><div className="flex flex-col items-center justify-center gap-2 text-muted-foreground"><TrendingUp className="size-12" /><p>{t('hr.performance.no_reviews')}</p></div></TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
