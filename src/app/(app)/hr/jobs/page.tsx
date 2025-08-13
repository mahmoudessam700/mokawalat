
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, PlusCircle, Search, Trash2, ArrowLeft } from 'lucide-react';
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useMemo } from 'react';
// Perform Firestore writes on the client so security rules see the signed-in user
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, where, getDocs } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';
import HR from '@/lib/hr.constants';

type Job = {
  id: string;
  title: string;
  department: string;
  status: 'Open' | 'Closed';
  createdAt: Timestamp;
};

const jobFormSchema = z.object({
  title: z.string().min(3, "Job title must be at least 3 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  department: z.string().min(1, "Department is required."),
  status: z.enum(["Open", "Closed"]),
});

type JobFormValues = z.infer<typeof jobFormSchema>;

export default function JobPostingsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const q = query(collection(firestore, 'jobs'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  const form = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: '',
      description: '',
      department: '',
      status: 'Open',
    },
  });

  useEffect(() => {
    if (jobToEdit) {
      form.reset(jobToEdit);
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [jobToEdit, form]);
  
  async function onSubmit(values: JobFormValues) {
    try {
      if (jobToEdit) {
        await updateDoc(doc(firestore, 'jobs', jobToEdit.id), {
          ...values,
          title_lowercase: values.title.toLowerCase(),
        });
        // Best-effort activity log
        addDoc(collection(firestore, 'activityLog'), {
          message: `Job updated: ${values.title}`,
          type: 'JOB_UPDATED',
          link: `/hr/jobs/${jobToEdit.id}`,
          timestamp: serverTimestamp(),
        }).catch(() => {});
        toast({ title: t('success'), description: 'Job posting updated successfully.' });
      } else {
        const ref = await addDoc(collection(firestore, 'jobs'), {
          ...values,
          title_lowercase: values.title.toLowerCase(),
          createdAt: serverTimestamp(),
        });
        addDoc(collection(firestore, 'activityLog'), {
          message: `Job created: ${values.title}`,
          type: 'JOB_CREATED',
          link: `/hr/jobs/${ref.id}`,
          timestamp: serverTimestamp(),
        }).catch(() => {});
        toast({ title: t('success'), description: 'Job posting created successfully.' });
      }
      setIsFormDialogOpen(false);
      setJobToEdit(null);
    } catch (error) {
      console.error('Failed to save job:', error);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to create job posting.' });
    }
  }

  async function handleDeleteJob() {
    if (!jobToDelete) return;
    setIsDeleting(true);
    try {
      // Check for linked candidates first
      const snap = await getDocs(query(collection(firestore, 'candidates'), where('jobId', '==', jobToDelete.id)));
      if (!snap.empty) {
        toast({ variant: 'destructive', title: t('error'), description: 'Cannot delete job with existing candidates. Please re-assign or delete them first.' });
        return;
      }
      await deleteDoc(doc(firestore, 'jobs', jobToDelete.id));
      addDoc(collection(firestore, 'activityLog'), {
        message: `Job deleted: ${jobToDelete.title}`,
        type: 'JOB_DELETED',
        link: `/hr/jobs`,
        timestamp: serverTimestamp(),
      }).catch(() => {});
      toast({ title: t('success'), description: 'Job posting deleted successfully.' });
    } catch (e) {
      console.error('Failed to delete job:', e);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to delete job posting.' });
    } finally {
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
      setIsDeleting(false);
    }
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon">
          <Link href="/hr">
            <ArrowLeft />
            <span className="sr-only">{t('back_to_hr')}</span>
          </Link>
        </Button>
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">{t('jobs.page_title')}</h1>
          <p className="text-muted-foreground">{t('jobs.page_desc')}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('jobs.list_title')}</CardTitle>
            <CardDescription>{t('jobs.list_desc')}</CardDescription>
          </div>
          {['admin', 'manager'].includes(profile?.role || '') && (
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => setJobToEdit(null)}>
                <PlusCircle className="mr-2" />
                {t('jobs.add_button')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{jobToEdit ? t('jobs.edit_title') : t('jobs.add_title')}</DialogTitle>
                    <DialogDescription>{jobToEdit ? t('jobs.edit_desc') : t('jobs.add_desc')}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>{t('jobs.title_label')}</FormLabel><FormControl><Input placeholder={t('job_roles.Project_Manager')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>{t('department')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('employees.select_department')} /></SelectTrigger></FormControl><SelectContent>{HR.departmentKeys.map(dep => (<SelectItem key={dep} value={dep}>{t(`departments.${dep.replace(/ /g, '_')}`)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>{t('description')}</FormLabel><FormControl><Textarea placeholder={t('jobs.desc_placeholder')} {...field} rows={6} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>{t('status')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="Open">{t('jobs.status.Open')}</SelectItem><SelectItem value="Closed">{t('jobs.status.Closed')}</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
                    <DialogFooter>
                        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('saving')}</> : (jobToEdit ? t('save_changes') : t('jobs.save_button'))}</Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>{t('jobs.title_label')}</TableHead><TableHead>{t('department')}</TableHead><TableHead>{t('status')}</TableHead><TableHead><span className="sr-only">{t('actions')}</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 3 }).map((_, index) => (<TableRow key={index}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
              : jobs.length > 0 ? (
                jobs.map((job) => (
                    <TableRow key={job.id}>
                        <TableCell className="font-medium">
                            <Link href={`/hr/jobs/${job.id}`} className="hover:underline">
                                {job.title}
                            </Link>
                        </TableCell>
                        <TableCell>{t(`departments.${job.department.replace(/ /g, '_')}`)}</TableCell>
                        <TableCell><Badge variant={job.status === 'Open' ? 'secondary' : 'outline'}>{t(`jobs.status.${job.status}`)}</Badge></TableCell>
                        <TableCell className="text-right">
                        {['admin', 'manager'].includes(profile?.role || '') && (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">{t('toggle_menu')}</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => { setJobToEdit(job); setIsFormDialogOpen(true); }}>{t('edit')}</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => { setJobToDelete(job); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t('delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">{t('jobs.no_jobs_found')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                <AlertDialogDescription>{t('jobs.delete_confirm_desc', { title: jobToDelete?.title ?? '' })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setJobToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteJob} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('deleting')}</> : <><Trash2 className="mr-2 h-4 w-4" /> {t('delete')}</>}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
