
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, FileText, Loader2, PlusCircle, UserPlus, Users, Award, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { addCandidate, updateCandidateStatus, type CandidateStatus } from '../../actions';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';


type JobStatus = 'Open' | 'Closed';
type Job = {
  id: string;
  title: string;
  department: string;
  description: string;
  status: JobStatus;
};

type Candidate = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: CandidateStatus;
  appliedAt: Timestamp;
  resumeUrl?: string;
};

const jobStatusVariant: { [key in JobStatus]: 'secondary' | 'outline' } = {
  Open: 'secondary',
  Closed: 'outline',
};
const candidateStatusVariant: { [key in CandidateStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Applied: 'default',
  Interviewing: 'outline',
  Offered: 'secondary',
  Hired: 'secondary',
  Rejected: 'destructive',
};

const candidateFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  resume: z.any().optional(),
});

type CandidateFormWithResume = z.infer<typeof candidateFormSchema>;


export default function JobDetailPage({ params }: { params: { id: string } }) {
  const [job, setJob] = useState<Job | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const { profile } = useAuth();
  const jobId = params.id;
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    const unsubscribes: (() => void)[] = [];
    
    unsubscribes.push(onSnapshot(doc(firestore, 'jobs', jobId), (doc) => {
        if (doc.exists()) {
            setJob({ id: doc.id, ...doc.data() } as Job);
        } else {
            setError('Job not found.');
        }
        setIsLoading(false);
    }, (err) => {
        console.error('Error fetching job details:', err);
        setError('Failed to fetch job details.');
        setIsLoading(false);
    }));

    const qCandidates = query(collection(firestore, 'candidates'), where('jobId', '==', jobId), orderBy('appliedAt', 'desc'));
    unsubscribes.push(onSnapshot(qCandidates, (snapshot) => {
        setCandidates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Candidate)));
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [jobId]);

  const form = useForm<CandidateFormWithResume>({
    resolver: zodResolver(candidateFormSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  async function onCandidateSubmit(values: CandidateFormWithResume) {
    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('email', values.email);
    formData.append('phone', values.phone);
    if (values.resume && values.resume.length > 0) {
      formData.append('resume', values.resume[0]);
    }

    const result = await addCandidate(jobId, formData);
    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      form.reset();
      setIsFormDialogOpen(false);
    }
  }

  async function handleStatusChange(candidateId: string, status: CandidateStatus) {
    setIsUpdatingStatus(candidateId);
    const result = await updateCandidateStatus(candidateId, status);
    if (result.success) {
        toast({ title: t('success'), description: result.message });
    } else {
        toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
    setIsUpdatingStatus(null);
  }
  
  if (isLoading) {
    return (
        <div className="space-y-6">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
    );
  }

  if (error || !job) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[50vh]">
        <Briefcase className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-bold">{t('error')}</h2>
        <p className="text-muted-foreground">{error || t('jobs.fetch_error')}</p>
         <Button asChild variant="outline" className="mt-4"><Link href="/hr/jobs"><ArrowLeft className="mr-2" />{t('jobs.back_to_jobs')}</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="outline" size="icon"><Link href="/hr/jobs"><ArrowLeft /><span className="sr-only">{t('back_to_hr')}</span></Link></Button>
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">{job.title}</h1>
          <p className="text-muted-foreground">{t(`departments.${job.department.replace(/ /g, '_')}`)}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('jobs.job_description')}</CardTitle>
          <div className="flex items-center gap-2 pt-2">
            <Badge variant={jobStatusVariant[job.status]}>{t(`jobs.status.${job.status}`)}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{job.description}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('hr.candidates.title')}</CardTitle>
            <CardDescription>{t('hr.candidates.desc')}</CardDescription>
          </div>
          {['admin', 'manager'].includes(profile?.role || '') && (
            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
              <DialogTrigger asChild><Button><UserPlus className="mr-2" />{t('hr.candidates.add_button')}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t('hr.candidates.add_new')}</DialogTitle></DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onCandidateSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('clients.name_label')}</FormLabel><FormControl><Input placeholder={t('clients.name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>{t('email')}</FormLabel><FormControl><Input placeholder={t('clients.email_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>{t('phone')}</FormLabel><FormControl><Input placeholder={t('clients.phone_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <FormField control={form.control} name="resume" render={() => (<FormItem><FormLabel>{t('hr.candidates.resume_label')}</FormLabel><FormControl><Input type="file" {...form.register('resume')} /></FormControl><FormMessage /></FormItem>)} />
                    <DialogFooter><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 animate-spin"/> {t('saving')}</> : t('hr.candidates.save_button')}</Button></DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          {candidates.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>{t('name')}</TableHead><TableHead>{t('email')}</TableHead><TableHead>{t('status')}</TableHead><TableHead>{t('hr.candidates.applied_at')}</TableHead><TableHead>{t('hr.candidates.resume_header')}</TableHead><TableHead className="text-right">{t('actions')}</TableHead></TableRow></TableHeader>
              <TableBody>
                {candidates.map(candidate => (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium">{candidate.name}</TableCell>
                    <TableCell>{candidate.email}</TableCell>
                    <TableCell><Badge variant={candidateStatusVariant[candidate.status]}>{t(`hr.candidates.status.${candidate.status}`)}</Badge></TableCell>
                    <TableCell>{candidate.appliedAt ? format(candidate.appliedAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell>
                      {candidate.resumeUrl && (<Button asChild variant="outline" size="sm"><Link href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer"><FileText className="mr-2"/>{t('hr.candidates.view_resume')}</Link></Button>)}
                    </TableCell>
                    <TableCell className="text-right">
                       {isUpdatingStatus === candidate.id ? (
                        <Loader2 className="animate-spin size-4 ml-auto" />
                       ) : (
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                <DropdownMenuLabel>{t('change_status')}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {(['Applied', 'Interviewing', 'Offered', 'Rejected'] as const).map(status => (
                                    <DropdownMenuItem
                                        key={status}
                                        disabled={candidate.status === status}
                                        onSelect={() => handleStatusChange(candidate.id, status)}
                                    >
                                        {t(`hr.candidates.status.${status}`)}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-green-800 dark:text-green-300 focus:bg-green-100 dark:focus:bg-green-900/50"
                                    disabled={candidate.status === 'Hired'}
                                    onSelect={() => handleStatusChange(candidate.id, 'Hired')}
                                >
                                    <Award className="mr-2 size-4" />
                                    {t('hr.candidates.hire_candidate')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                       )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"><Users className="size-12" /><p>{t('hr.candidates.no_candidates')}</p></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
