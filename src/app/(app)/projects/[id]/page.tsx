
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc as fsDoc, type Timestamp, collection, query, where, onSnapshot, orderBy, type DocumentSnapshot, type DocumentData } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Calendar, DollarSign, Activity, Users, ShoppingCart, PackagePlus, PackageCheck, PackageX, PackageSearch, Lightbulb, TrendingUp, MapPin, BookText, ExternalLink, FileText, PlusCircle, Trash2, ListChecks, CheckCheck, MoreHorizontal, Contact, Wrench } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { AssignTeamDialog } from './assign-team-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { addMaterialRequest } from '../../material-requests/actions';
import { addDailyLog, addProjectDocument, deleteProjectDocument, addTask, type TaskFormValues, updateTaskStatus, deleteTask, suggestTasksForProject, updateTask } from '../actions';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectAiAssistant } from './project-ai-assistant';
import { Progress } from '@/components/ui/progress';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { updateMaterialRequestStatus } from '../../material-requests/actions';
import { ProjectTasksView } from './project-tasks-view';
import { useLanguage } from '@/hooks/use-language';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';
type TaskStatus = 'To Do' | 'In Progress' | 'Done';
type AssetStatus = 'Available' | 'In Use' | 'Under Maintenance' | 'Decommissioned';

export type Project = {
  id: string;
  name: string;
  description?: string;
  location?: string;
  budget: number;
  startDate: Timestamp;
  status: ProjectStatus;
  teamMemberIds?: string[];
  progress?: number;
  clientId?: string;
};

type Employee = {
    id: string;
    name: string;
    email: string;
    role: string;
    photoUrl?: string;
};

type Client = {
    id: string;
    name: string;
};

export type Task = {
  id: string;
  name: string;
  status: TaskStatus;
  dueDate?: Timestamp;
  createdAt: Timestamp;
  assignedTo?: string;
  assignedToName?: string;
};

type ProcurementRequest = {
  id: string;
  itemName: string;
  quantity: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Ordered';
};

type MaterialRequest = {
  id: string;
  itemName: string;
  quantity: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedAt: Timestamp;
};

const taskFormSchema = z.object({
  name: z.string().min(3, "Task name must be at least 3 characters long."),
  dueDate: z.string().optional(),
  assignedTo: z.string().optional(),
});

const materialRequestFormSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});
type MaterialRequestFormValues = z.infer<typeof materialRequestFormSchema>;


type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  date: Timestamp;
};

type InventoryItem = {
    id: string;
    name: string;
    quantity: number;
};

type DailyLog = {
    id: string;
    notes: string;
    authorId: string;
    authorEmail: string;
    createdAt: Timestamp;
    photoUrl?: string;
};

type Document = {
  id: string;
  title: string;
  fileUrl: string;
  fileName: string;
  createdAt: Timestamp;
};

type Asset = {
    id: string;
    name: string;
    category: string;
    status: AssetStatus;
};

const statusVariant: {
  [key in ProjectStatus]: 'secondary' | 'default' | 'outline' | 'destructive';
} = {
  'In Progress': 'secondary',
  Planning: 'default',
  Completed: 'outline',
  'On Hold': 'destructive',
};

const taskStatusVariant: {
  [key in TaskStatus]: 'default' | 'secondary' | 'outline';
} = {
  'To Do': 'outline',
  'In Progress': 'default',
  'Done': 'secondary',
};

const assetStatusVariant: {
  [key in AssetStatus]: 'secondary' | 'default' | 'outline' | 'destructive';
} = {
  'Available': 'secondary',
  'In Use': 'default',
  'Under Maintenance': 'outline',
  'Decommissioned': 'destructive',
};

const procurementStatusVariant: { [key in ProcurementRequest['status']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Pending: 'default',
  Approved: 'secondary',
  Ordered: 'outline',
  Rejected: 'destructive',
};

const materialRequestStatusVariant: { [key in MaterialRequest['status']]: 'default' | 'secondary' | 'destructive' } = {
  Pending: 'default',
  Approved: 'secondary',
  Rejected: 'destructive',
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    });
    return `LE ${formatter.format(value)}`;
};

const dailyLogFormSchema = z.object({
  notes: z.string().min(10, 'Log notes must be at least 10 characters long.').max(2000),
  photo: z.any().optional(),
});
type DailyLogFormValues = z.infer<typeof dailyLogFormSchema>;

const documentFormSchema = z.object({
  title: z.string().min(3, 'Document title must be at least 3 characters long.'),
  file: z.any().refine(files => files?.length > 0, 'A file is required.'),
});
type DocumentFormValues = z.infer<typeof documentFormSchema>;

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [procurements, setProcurements] = useState<ProcurementRequest[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [isSuggestingTasks, setIsSuggestingTasks] = useState(false);
    const [includeCommitments, setIncludeCommitments] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const projectId = params.id;

    const { totalExpense, totalIncome, percentSpent, remainingBudget } = useMemo(() => {
        const totals = transactions.reduce(
            (acc, tx) => {
                if (tx.type === 'Expense') acc.expense += Math.max(0, tx.amount || 0);
                if (tx.type === 'Income') acc.income += Math.max(0, tx.amount || 0);
                return acc;
            },
            { expense: 0, income: 0 }
        );
        const budget = Math.max(0, project?.budget || 0);
        const spentPct = budget > 0 ? Math.min(100, Math.round((totals.expense / budget) * 100)) : 0;
        const remaining = (project?.budget || 0) - totals.expense;
        return { totalExpense: totals.expense, totalIncome: totals.income, percentSpent: spentPct, remainingBudget: remaining };
    }, [transactions, project]);

        const committedAmount = useMemo(() => {
            // Sum of Approved POs that are not yet ordered/received
            return procurements
                .filter(p => p.status === 'Approved')
                .reduce((sum, p) => sum + (Number((p as any).totalCost || 0)), 0);
        }, [procurements]);

        const budgetDerived = useMemo(() => {
            const budget = Math.max(0, project?.budget || 0);
            const effectiveSpent = includeCommitments ? totalExpense + committedAmount : totalExpense;
            const pct = budget > 0 ? Math.min(100, Math.round((effectiveSpent / budget) * 100)) : 0;
            const remaining = (project?.budget || 0) - effectiveSpent;
            return { effectiveSpent, percent: pct, remaining };
        }, [includeCommitments, totalExpense, committedAmount, project]);

        const spendingSeries = useMemo(() => {
            const byMonth = new Map<string, { key: string; label: string; expense: number }>();
            transactions
                .filter((tx) => tx.type === 'Expense' && tx.date)
                .forEach((tx) => {
                    const d = (tx.date as Timestamp).toDate();
                    const key = format(d, 'yyyy-MM');
                    const label = format(d, 'MMM yyyy');
                    const rec = byMonth.get(key) || { key, label, expense: 0 };
                    rec.expense += Math.max(0, tx.amount || 0);
                    byMonth.set(key, rec);
                });
            const arr = Array.from(byMonth.values()).sort((a, b) => a.key.localeCompare(b.key));
            return arr;
        }, [transactions]);

  useEffect(() => {
    if (!projectId) return;
    setIsLoading(true);

    const unsubscribes: (() => void)[] = [];

    const projectRef = fsDoc(firestore, 'projects', projectId);
    unsubscribes.push(onSnapshot(projectRef, (projectSnap: DocumentSnapshot<DocumentData>) => {
        if (projectSnap.exists()) {
            const projectData = { id: projectSnap.id, ...projectSnap.data() } as Project;
            setProject(projectData);

            if (projectData.clientId) {
                const clientRef = fsDoc(firestore, 'clients', projectData.clientId);
                unsubscribes.push(onSnapshot(clientRef, (clientDoc: DocumentSnapshot<DocumentData>) => {
                    if (clientDoc.exists()) {
                        setClient({ id: clientDoc.id, ...clientDoc.data() } as Client);
                    } else {
                        setClient(null);
                    }
                }));
            } else {
                setClient(null);
            }
        } else {
            setError('Project not found.');
        }
        setIsLoading(false);
    }, (err) => {
        console.error('Error fetching project:', err);
        setError('Failed to fetch project details.');
        setIsLoading(false);
    }));

    const employeesQuery = query(collection(firestore, 'employees'));
    unsubscribes.push(onSnapshot(employeesQuery, (snapshot) => {
        setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Employee)));
    }));

    const tasksQuery = query(collection(firestore, 'projects', projectId, 'tasks'), orderBy('createdAt', 'desc'));
    unsubscribes.push(onSnapshot(tasksQuery, (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Task)));
    }));
    
    const procurementsQuery = query(collection(firestore, 'procurement'), where('projectId', '==', projectId));
    unsubscribes.push(onSnapshot(procurementsQuery, (snapshot) => {
        setProcurements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as ProcurementRequest)));
    }, (err) => {
        console.error('Error fetching procurements:', err);
    }));
    
    const materialRequestsQuery = query(collection(firestore, 'materialRequests'), where('projectId', '==', projectId));
    unsubscribes.push(onSnapshot(materialRequestsQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialRequest));
        data.sort((a,b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0));
        setMaterialRequests(data);
    }, (err) => {
        console.error('Error fetching material requests:', err);
    }));

    const dailyLogsQuery = query(collection(firestore, 'projects', projectId, 'dailyLogs'), orderBy('createdAt', 'desc'));
    unsubscribes.push(onSnapshot(dailyLogsQuery, (snapshot) => {
        setDailyLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyLog)));
    }));

    const transactionsQuery = query(collection(firestore, 'transactions'), where('projectId', '==', projectId), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(transactionsQuery, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (err) => {
        console.error('Error fetching transactions for project:', err);
    }));

    const inventoryQuery = query(collection(firestore, 'inventory'), where('quantity', '>', 0), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(inventoryQuery, (snapshot) => {
        setInventoryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }));

    const documentsQuery = query(collection(firestore, 'projects', projectId, 'documents'), orderBy('createdAt', 'desc'));
    unsubscribes.push(onSnapshot(documentsQuery, (snapshot) => {
        setDocuments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Document)));
    }));

    const assetsQuery = query(collection(firestore, 'assets'), where('currentProjectId', '==', projectId));
    unsubscribes.push(onSnapshot(assetsQuery, (snapshot) => {
        setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    }));


    return () => unsubscribes.forEach(unsub => unsub());

  }, [projectId]);
  
  const assignedTeam = useMemo(() => {
    if (!project?.teamMemberIds || !employees.length) {
      return [];
    }
    return employees.filter(employee => project.teamMemberIds!.includes(employee.id));
  }, [project, employees]);
  
  const requestForm = useForm<MaterialRequestFormValues>({
    resolver: zodResolver(materialRequestFormSchema),
    defaultValues: {
      itemId: '',
      quantity: 1,
    },
  });

  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: { name: '', dueDate: '', assignedTo: ''},
  });

  const dailyLogForm = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogFormSchema),
    defaultValues: { notes: '' },
  });

  const documentForm = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: { title: '' },
  });

  useEffect(() => {
    if (isTaskDialogOpen) {
      if (taskToEdit) {
        taskForm.reset({
          name: taskToEdit.name,
          dueDate: taskToEdit.dueDate ? format(taskToEdit.dueDate.toDate(), 'yyyy-MM-dd') : '',
          assignedTo: taskToEdit.assignedTo || '',
        });
      } else {
        taskForm.reset({ name: '', dueDate: '', assignedTo: ''});
      }
    }
  }, [isTaskDialogOpen, taskToEdit, taskForm]);

  async function onMaterialRequestSubmit(values: MaterialRequestFormValues) {
    const result = await addMaterialRequest(projectId, values);
    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      requestForm.reset();
      setIsRequestDialogOpen(false);
    }
  }

  async function onTaskSubmit(values: TaskFormValues) {
    const result = taskToEdit 
        ? await updateTask(projectId, taskToEdit.id, values)
        : await addTask(projectId, values);

    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      taskForm.reset();
      setIsTaskDialogOpen(false);
      setTaskToEdit(null);
    }
  }

  async function onDailyLogSubmit(values: DailyLogFormValues) {
    if (!profile) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to post a log.' });
      return;
    }
    
    const formData = new FormData();
    formData.append('notes', values.notes);
    if (values.photo && values.photo.length > 0) {
        formData.append('photo', values.photo[0]);
    }

        const result = await addDailyLog(projectId, { 
        uid: profile.uid, 
        email: profile.email 
    }, formData);

    if (result.errors) {
            if ('photo' in result.errors && (result.errors as any).photo) {
                dailyLogForm.setError('photo', { type: 'server', message: (result.errors as any).photo[0] });
            }
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      dailyLogForm.reset();
      const fileInput = document.getElementById('daily-log-photo') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }

  async function onDocumentSubmit(values: DocumentFormValues) {
    const formData = new FormData();
    formData.append('title', values.title);
    if (values.file && values.file.length > 0) {
        formData.append('file', values.file[0]);
    }

    const result = await addProjectDocument(projectId, formData);
        if (result.errors) {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
            if ('file' in result.errors && (result.errors as any).file) {
                documentForm.setError('file', { type: 'server', message: (result.errors as any).file[0] });
            }
    } else {
      toast({ title: t('success'), description: result.message });
      documentForm.reset();
      setIsDocumentDialogOpen(false);
    }
  }

  async function handleDeleteDocument() {
    if (!documentToDelete) return;
    setIsDeletingDocument(true);
    const result = await deleteProjectDocument(projectId, documentToDelete.id);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsDeletingDocument(false);
    setDocumentToDelete(null);
  }

  async function handleDeleteTask() {
    if (!taskToDelete) return;
    setIsDeletingTask(true);
    const result = await deleteTask(projectId, taskToDelete.id);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsDeletingTask(false);
    setTaskToDelete(null);
  }

  async function handleRequestStatusUpdate(requestId: string, status: 'Approved' | 'Rejected') {
    const result = await updateMaterialRequestStatus(requestId, status);
    if (result.success) {
        toast({ title: 'Success', description: result.message });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }
  
  async function handleSuggestTasks() {
    setIsSuggestingTasks(true);
    const result = await suggestTasksForProject(projectId);
    if (result.success) {
      toast({ title: t('success'), description: result.message });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
    setIsSuggestingTasks(false);
  }


  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
             <Skeleton className="h-10 w-10 rounded-md" />
            <div>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48 mt-2" />
            </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                     <Skeleton className="h-24 w-full" />
                </CardContent>
            </Card>
            <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[50vh]">
        <Briefcase className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-bold">{t('error')}</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/projects">
            <ArrowLeft className="mr-2" />
            {t('projects.back_to_projects')}
          </Link>
        </Button>
      </div>
    );
  }

  if (!project) {
    return null; 
  }

  return (
    <>
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/projects">
                    <ArrowLeft />
                    <span className="sr-only">{t('projects.back_to_projects')}</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {project.name}
                </h1>
                <p className="text-muted-foreground">
                    {t('projects.detail_page_desc')}
                </p>
            </div>
        </div>

        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">{t('clients.overview_tab')}</TabsTrigger>
                <TabsTrigger value="tasks">{t('projects.tasks')}</TabsTrigger>
                <TabsTrigger value="team">{t('projects.team')}</TabsTrigger>
                <TabsTrigger value="materials">{t('projects.materials')}</TabsTrigger>
                <TabsTrigger value="assets">{t('projects.assets')}</TabsTrigger>
                <TabsTrigger value="documents">{t('projects.documents')}</TabsTrigger>
                <TabsTrigger value="daily-logs">{t('projects.daily_logs')}</TabsTrigger>
                <TabsTrigger value="procurement">{t('projects.procurement')}</TabsTrigger>
                <TabsTrigger value="financials">{t('clients.financials_tab')}</TabsTrigger>
                <TabsTrigger value="ai-assistant">
                    <Lightbulb className="mr-2" /> {t('projects.ai_assistant')}
                </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('projects.details_title')}</CardTitle>
                        {project.description && (
                            <CardDescription>{project.description}</CardDescription>
                        )}
                        <div className="flex flex-col gap-2 pt-2 text-sm text-muted-foreground">
                            {project.location && (
                                <div className="flex items-center gap-2">
                                    <MapPin className="size-4" />
                                    <span>{project.location}</span>
                                </div>
                            )}
                            {client && (
                                <div className="flex items-center gap-2">
                                    <Contact className="size-4" />
                                    <span>
                                        {t('client')}:{' '}
                                        <Link href={`/clients/${client.id}`} className="font-medium text-foreground hover:underline">
                                            {client.name}
                                        </Link>
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <DollarSign className="size-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('projects.budget')}</p>
                                    <p className="text-lg font-semibold">{formatCurrency(project.budget)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Calendar className="size-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('projects.start_date')}</p>
                                    <p className="text-lg font-semibold">{project.startDate ? format(project.startDate.toDate(), 'PPP') : 'N/A'}</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <TrendingUp className="size-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('projects.progress')}</p>
                                    <p className="text-lg font-semibold">{project.progress || 0}%</p>
                                     <Progress value={project.progress || 0} className="mt-2 w-32" />
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Activity className="size-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">{t('status')}</p>
                                    <Badge variant={statusVariant[project.status]} className="text-base font-semibold">{t(`project_status_${project.status.toLowerCase().replace(' ', '_')}`)}</Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="mt-4">
                    <CardHeader>
                        <CardTitle>{t('projects.budget_vs_actual') || 'Budget vs Actual'}</CardTitle>
                                                <CardDescription>{t('projects.budget_vs_actual_desc') || 'Track project spending against the approved budget.'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                                                <div className="flex items-center justify-end mb-4 gap-2">
                                                    <Switch id="include-commitments" checked={includeCommitments} onCheckedChange={setIncludeCommitments} />
                                                    <Label htmlFor="include-commitments" className="text-sm text-muted-foreground cursor-pointer">
                                                        {t('projects.include_commitments') || 'Include commitments (Approved POs)'}
                                                    </Label>
                                                </div>
                        <div className="grid gap-6 md:grid-cols-3">
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{t('projects.budget')}</p>
                                <p className="text-lg font-semibold">{formatCurrency(project.budget || 0)}</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">{t('projects.actual_spend') || 'Actual Spend'}</p>
                                <p className="text-lg font-semibold">{formatCurrency(totalExpense)}</p>
                            </div>
                                                        {includeCommitments && (
                                                            <div className="space-y-2">
                                                                <p className="text-sm text-muted-foreground">{t('projects.committed') || 'Committed (Approved POs)'}</p>
                                                                <p className="text-lg font-semibold">{formatCurrency(committedAmount)}</p>
                                                            </div>
                                                        )}
                            <div className="space-y-2">
                                                                <p className="text-sm text-muted-foreground">
                                                                    {budgetDerived.remaining >= 0 ? (t('projects.remaining') || 'Remaining') : (t('projects.over_budget') || 'Over Budget')}
                                                                </p>
                                                                <p className={`text-lg font-semibold ${budgetDerived.remaining < 0 ? 'text-destructive' : ''}`}>
                                                                        {budgetDerived.remaining >= 0 ? formatCurrency(budgetDerived.remaining) : `-${formatCurrency(Math.abs(budgetDerived.remaining))}`}
                                </p>
                            </div>
                        </div>
                        <div className="mt-6">
                            <div className="flex items-center justify-between text-sm mb-2">
                                                                <span className="text-muted-foreground">
                                                                    {includeCommitments ? (t('projects.spending_progress_incl') || 'Spending progress (incl. commitments)') : (t('projects.spending_progress') || 'Spending progress')}
                                                                </span>
                                                                <span className={`${budgetDerived.percent >= 90 ? 'text-destructive' : budgetDerived.percent >= 75 ? 'text-amber-600' : ''}`}>{budgetDerived.percent}%</span>
                            </div>
                                                        <Progress value={budgetDerived.percent} />
                                                        {budgetDerived.percent >= 90 && (
                                <p className="mt-2 text-xs text-destructive">{t('projects.near_or_over_budget_warning') || 'Warning: Spending is near or over the budget.'}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                                <Card className="mt-4">
                                        <CardHeader>
                                                <CardTitle>{t('projects.spending_over_time') || 'Spending over time'}</CardTitle>
                                                <CardDescription>{t('projects.spending_over_time_desc') || 'Monthly expenses for this project.'}</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                                {spendingSeries.length > 0 ? (
                                                    <ChartContainer
                                                        className="w-full"
                                                        config={{ expense: { label: t('financials.expense') || 'Expense', color: 'hsl(var(--primary))' } }}
                                                    >
                                                        <LineChart data={spendingSeries} margin={{ left: 12, right: 12 }}>
                                                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                                            <XAxis dataKey="label" tickLine={false} axisLine={false} />
                                                            <YAxis tickLine={false} axisLine={false} />
                                                            <ChartTooltip content={<ChartTooltipContent />} />
                                                            <Line type="monotone" dataKey="expense" stroke="var(--color-expense)" dot={false} strokeWidth={2} />
                                                        </LineChart>
                                                    </ChartContainer>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground">{t('projects.no_spending_data') || 'No spending data yet.'}</div>
                                                )}
                                        </CardContent>
                                </Card>
            </TabsContent>
            <TabsContent value="tasks" className="pt-4">
                <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('projects.task_title')}</CardTitle>
                            <CardDescription>{t('projects.task_desc')}</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
                                <DialogTrigger asChild><Button onClick={() => setTaskToEdit(null)}><PlusCircle className="mr-2" /> {t('projects.add_task')}</Button></DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>{taskToEdit ? t('projects.edit_task') : t('projects.add_new_task')}</DialogTitle></DialogHeader>
                                    <Form {...taskForm}>
                                        <form onSubmit={taskForm.handleSubmit(onTaskSubmit)} className="space-y-4 py-4">
                                            <FormField control={taskForm.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('projects.task_name_label')}</FormLabel><FormControl><Input placeholder={t('projects.task_name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormField control={taskForm.control} name="dueDate" render={({ field }) => (<FormItem><FormLabel>{t('projects.due_date_optional')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                                <FormField
                                                    control={taskForm.control}
                                                    name="assignedTo"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>{t('employees.assigned_projects_title')} ({t('optional')})</FormLabel>
                                                            <Select onValueChange={(v) => field.onChange(v === 'none' ? '' : v)} value={field.value || 'none'}>
                                                                <FormControl>
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder={t('employees.select_employee')} />
                                                                    </SelectTrigger>
                                                                </FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="none">{t('unassigned')}</SelectItem>
                                                                    {assignedTeam.map(member => (
                                                                        <SelectItem key={member.id} value={member.id}>
                                                                            {member.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <DialogFooter><Button type="submit" disabled={taskForm.formState.isSubmitting}>{taskForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</> : t('projects.save_task')}</Button></DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </CardHeader>
                    <CardContent>
                       <ProjectTasksView
                        projectId={projectId}
                        tasks={tasks}
                        team={assignedTeam}
                        onEditTask={(task) => {
                            setTaskToEdit(task);
                            setIsTaskDialogOpen(true);
                        }}
                        onDeleteTask={(task) => setTaskToDelete(task)}
                       />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="team" className="pt-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('projects.assigned_team_title')}</CardTitle>
                            <CardDescription>{t('projects.assigned_team_desc')}</CardDescription>
                        </div>
                        {['admin', 'manager'].includes(profile?.role || '') && (
                            <AssignTeamDialog
                                projectId={project.id}
                                employees={employees}
                                assignedEmployeeIds={project.teamMemberIds || []}
                            />
                        )}
                    </CardHeader>
                    <CardContent>
                        {assignedTeam.length > 0 ? (
                            <ul className="space-y-2">
                                {assignedTeam.map(member => (
                                    <li key={member.id}>
                                        <Link href={`/employees/${member.id}`} className="flex items-center gap-4 rounded-md p-2 -m-2 hover:bg-accent transition-colors">
                                            <Avatar>
                                                <AvatarImage src={member.photoUrl || `https://placehold.co/40x40.png`} alt={member.name} data-ai-hint="profile picture" />
                                                <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold text-foreground">{member.name}</p>
                                                <p className="text-sm text-muted-foreground">{member.role}</p>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
                                <Users className="size-12" />
                                <p>{t('projects.no_team_assigned')}</p>
                                {['admin', 'manager'].includes(profile?.role || '') && (
                                    <p className="text-xs">{t('projects.use_assign_team_button')}</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="materials" className="pt-4">
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('projects.material_requests_title')}</CardTitle>
                            <CardDescription>{t('projects.material_requests_desc')}</CardDescription>
                        </div>
                        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <PackagePlus className="mr-2" /> {t('projects.request_material')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('projects.request_material_dialog_title')}</DialogTitle>
                                    <DialogDescription>{t('projects.request_material_dialog_desc')}</DialogDescription>
                                </DialogHeader>
                                <Form {...requestForm}>
                                    <form onSubmit={requestForm.handleSubmit(onMaterialRequestSubmit)} className="space-y-4 py-4">
                                        <FormField
                                            control={requestForm.control}
                                            name="itemId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('projects.inventory_item_label')}</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={t('projects.select_item')} />
                                                        </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                        {inventoryItems.map(item => (
                                                            <SelectItem key={item.id} value={item.id}>
                                                                {item.name} ({t('inventory.quantity_label')}: {item.quantity})
                                                            </SelectItem>
                                                        ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={requestForm.control}
                                            name="quantity"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('inventory.quantity_label')}</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" placeholder="e.g., 10" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <DialogFooter>
                                            <Button type="submit" disabled={requestForm.formState.isSubmitting}>
                                                {requestForm.formState.isSubmitting ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('submitting')}</>
                                                ) : (t('projects.submit_request'))}
                                            </Button>
                                        </DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {materialRequests.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('item')}</TableHead>
                                        <TableHead>{t('inventory.quantity_label')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                        {['admin', 'manager'].includes(profile?.role || '') && <TableHead className="text-right">{t('actions')}</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {materialRequests.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.itemName}</TableCell>
                                            <TableCell>{req.quantity}</TableCell>
                                            <TableCell><Badge variant={materialRequestStatusVariant[req.status]}>{t(`material_requests.status.${req.status}`)}</Badge></TableCell>
                                            {['admin', 'manager'].includes(profile?.role || '') && (
                                                <TableCell className="text-right">
                                                    {req.status === 'Pending' && (
                                                        <div className="flex gap-2 justify-end">
                                                            <Button size="sm" variant="outline" className="h-8 px-2 text-success hover:text-success border-green-500 hover:bg-green-50" onClick={() => handleRequestStatusUpdate(req.id, 'Approved')}><PackageCheck className="size-4" /></Button>
                                                            <Button size="sm" variant="outline" className="h-8 px-2 text-destructive hover:text-destructive border-red-500 hover:bg-red-50" onClick={() => handleRequestStatusUpdate(req.id, 'Rejected')}><PackageX className="size-4" /></Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                                <PackageSearch className="size-12" />
                                <p>{t('projects.no_material_requests')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="assets" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('projects.assigned_assets_title')}</CardTitle>
                        <CardDescription>{t('projects.assigned_assets_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {assets.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('assets.asset_name_header')}</TableHead>
                                        <TableHead>{t('assets.category_header')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assets.map(asset => (
                                        <TableRow key={asset.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/assets/${asset.id}`} className="hover:underline">
                                                    {asset.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{asset.category}</TableCell>
                                            <TableCell><Badge variant={assetStatusVariant[asset.status]}>{asset.status}</Badge></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <Wrench className="size-12" />
                                <p>{t('projects.no_assets_assigned')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="documents" className="pt-4">
                 <Card>
                    <CardHeader className="flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('projects.project_docs_title')}</CardTitle>
                            <CardDescription>{t('projects.project_docs_desc')}</CardDescription>
                        </div>
                        <Dialog open={isDocumentDialogOpen} onOpenChange={setIsDocumentDialogOpen}>
                            <DialogTrigger asChild><Button><PlusCircle className="mr-2" /> {t('projects.add_document')}</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('projects.add_new_doc_title')}</DialogTitle>
                                    <DialogDescription>{t('projects.add_new_doc_desc')}</DialogDescription>
                                </DialogHeader>
                                <Form {...documentForm}>
                                    <form onSubmit={documentForm.handleSubmit(onDocumentSubmit)} className="space-y-4 py-4">
                                        <FormField control={documentForm.control} name="title" render={({ field }) => (<FormItem><FormLabel>{t('projects.doc_title_label')}</FormLabel><FormControl><Input placeholder={t('projects.doc_title_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <FormField control={documentForm.control} name="file" render={() => (<FormItem><FormLabel>{t('document')}</FormLabel><FormControl><Input type="file" {...documentForm.register('file')} /></FormControl><FormMessage /></FormItem>)} />
                                        <DialogFooter><Button type="submit" disabled={documentForm.formState.isSubmitting}>{documentForm.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('uploading')}</> : t('projects.save_document')}</Button></DialogFooter>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </CardHeader>
                    <CardContent>
                        {documents.length > 0 ? (
                            <Table><TableHeader><TableRow><TableHead>{t('title')}</TableHead><TableHead>{t('date_added')}</TableHead><TableHead className="text-right">{t('actions')}</TableHead></TableRow></TableHeader><TableBody>{documents.map(doc => (<TableRow key={doc.id}><TableCell className="font-medium">{doc.title}</TableCell><TableCell>{doc.createdAt ? format(doc.createdAt.toDate(), 'PPP') : 'N/A'}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-2"><Button asChild variant="outline" size="icon" className="h-8 w-8"><Link href={doc.fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-4" /><span className="sr-only">{t('view_document')}</span></Link></Button><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive h-8 w-8" onClick={() => setDocumentToDelete(doc)}><Trash2 className="size-4" /></Button></div></TableCell></TableRow>))}</TableBody></Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"><FileText className="size-12" /><p>{t('projects.no_documents_found')}</p></div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="daily-logs" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('projects.daily_logs_title')}</CardTitle>
                        <CardDescription>{t('projects.daily_logs_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Form {...dailyLogForm}>
                            <form onSubmit={dailyLogForm.handleSubmit(onDailyLogSubmit)} className="space-y-4">
                                <FormField
                                    control={dailyLogForm.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="sr-only">{t('new_log_entry')}</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder={t('projects.new_log_placeholder')}
                                                    rows={4}
                                                    {...field}
                                                    disabled={!profile || dailyLogForm.formState.isSubmitting}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={dailyLogForm.control}
                                    name="photo"
                                    render={() => (
                                        <FormItem>
                                            <FormLabel>{t('projects.attach_photo')}</FormLabel>
                                            <FormControl>
                                                <Input 
                                                id="daily-log-photo"
                                                type="file" 
                                                accept="image/png, image/jpeg, image/webp" 
                                                {...dailyLogForm.register('photo')} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={!profile || dailyLogForm.formState.isSubmitting}>
                                        {dailyLogForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {t('projects.add_log')}
                                    </Button>
                                </div>
                            </form>
                        </Form>

                        <div className="space-y-6">
                            {dailyLogs.length > 0 ? (
                                dailyLogs.map(log => (
                                    <div key={log.id} className="flex items-start gap-4">
                                        <Avatar>
                                            <AvatarImage data-ai-hint="profile picture" />
                                            <AvatarFallback>{log.authorEmail.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 rounded-md border bg-muted/50 p-4">
                                            <div className="flex items-center justify-between">
                                                <p className="font-semibold text-sm">{log.authorEmail}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {log.createdAt ? formatDistanceToNow(log.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                                                </p>
                                            </div>
                                            <p className="mt-2 text-sm whitespace-pre-wrap">{log.notes}</p>
                                            {log.photoUrl && (
                                                <div className="mt-4 relative group">
                                                    <a href={log.photoUrl} target="_blank" rel="noopener noreferrer" className="block">
                                                        <img 
                                                          src={log.photoUrl} 
                                                          alt="Daily log photo" 
                                                          className="max-h-60 w-auto rounded-lg object-cover transition-opacity group-hover:opacity-80" 
                                                          data-ai-hint="construction site"
                                                        />
                                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                            <ExternalLink className="text-white size-8" />
                                                        </div>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                    <BookText className="size-12" />
                                    <p>{t('projects.no_daily_logs_found')}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="procurement" className="pt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>{t('projects.related_procurement_title')}</CardTitle>
                        <CardDescription>{t('projects.related_procurement_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {procurements.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('item')}</TableHead>
                                        <TableHead>{t('inventory.quantity_label')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {procurements.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.itemName}</TableCell>
                                            <TableCell>{req.quantity}</TableCell>
                                            <TableCell>
                                                <Badge variant={procurementStatusVariant[req.status]}>
                                                    {t(`procurement.status.${req.status}`)}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
                                <ShoppingCart className="size-12" />
                                <p>{t('projects.no_procurement_requests')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="financials" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('clients.financial_history_title')}</CardTitle>
                        <CardDescription>{t('financials.history_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {transactions.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('date')}</TableHead>
                                        <TableHead>{t('description')}</TableHead>
                                        <TableHead>{t('type')}</TableHead>
                                        <TableHead className="text-right">{t('amount')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map(transaction => (
                                        <TableRow key={transaction.id}>
                                            <TableCell>{transaction.date ? format(transaction.date.toDate(), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell className="font-medium">{transaction.description}</TableCell>
                                            <TableCell>
                                                <Badge variant={transaction.type === 'Income' ? 'secondary' : 'destructive'}>
                                                    {t(`financials.${transaction.type.toLowerCase()}`)}
                                                </Badge>
                                           </TableCell>
                                            <TableCell className={`text-right font-semibold ${transaction.type === 'Income' ? 'text-success' : ''}`}>
                                                {formatCurrency(transaction.amount)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                             <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <DollarSign className="size-12" />
                                <p>{t('clients.no_financial_records')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="ai-assistant" className="pt-4">
                <ProjectAiAssistant
                  project={project}
                  onSuggestTasks={handleSuggestTasks}
                  isSuggestingTasks={isSuggestingTasks}
                />
            </TabsContent>
        </Tabs>
    </div>
    <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription>{t('delete_document_confirm_desc', { title: documentToDelete?.title ?? '' })}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDocumentToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteDocument} disabled={isDeletingDocument} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeletingDocument ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('deleting')}</> : <><Trash2 className="mr-2 h-4 w-4" /> {t('delete')}</>}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle><AlertDialogDescription>{t('delete_task_confirm_desc', { name: taskToDelete?.name ?? '' })}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTaskToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTask} disabled={isDeletingTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeletingTask ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('deleting')}</> : <><Trash2 className="mr-2 h-4 w-4" /> {t('delete')}</>}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
