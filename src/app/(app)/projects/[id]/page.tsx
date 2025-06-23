
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, type Timestamp, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Calendar, DollarSign, Activity, Users, ShoppingCart, PackagePlus, PackageCheck, PackageX, PackageSearch, Lightbulb, TrendingUp, MapPin, BookText, ExternalLink } from 'lucide-react';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { addMaterialRequest, updateMaterialRequestStatus, materialRequestFormSchema, type MaterialRequestFormValues, addDailyLog } from '../actions';
import { Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectAiAssistant } from './project-ai-assistant';
import { Progress } from '@/components/ui/progress';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { ProjectLogSummary } from './project-log-summary';

type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';

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
};

type Employee = {
    id: string;
    name: string;
    email: string;
    role: string;
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

const statusVariant: {
  [key in ProjectStatus]: 'secondary' | 'default' | 'outline' | 'destructive';
} = {
  'In Progress': 'secondary',
  Planning: 'default',
  Completed: 'outline',
  'On Hold': 'destructive',
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
  photo: z.instanceof(FileList).optional(),
});
type DailyLogFormValues = z.infer<typeof dailyLogFormSchema>;

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [procurements, setProcurements] = useState<ProcurementRequest[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const projectId = params.id;

  useEffect(() => {
    if (!projectId) return;
    setIsLoading(true);

    const unsubscribes: (() => void)[] = [];

    // Subscribe to project document
    const projectRef = doc(firestore, 'projects', projectId);
    unsubscribes.push(onSnapshot(projectRef, (doc) => {
        if (doc.exists()) {
            setProject({ id: doc.id, ...doc.data() } as Project);
        } else {
            setError('Project not found.');
        }
        setIsLoading(false);
    }, (err) => {
        console.error('Error fetching project:', err);
        setError('Failed to fetch project details.');
        setIsLoading(false);
    }));

    // Subscribe to employees collection
    const employeesQuery = query(collection(firestore, 'employees'));
    unsubscribes.push(onSnapshot(employeesQuery, (snapshot) => {
        const employeesData: Employee[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Employee));
        setEmployees(employeesData);
    }));
    
    // Subscribe to related procurements
    const procurementsQuery = query(collection(firestore, 'procurement'), where('projectId', '==', projectId));
    unsubscribes.push(onSnapshot(procurementsQuery, (snapshot) => {
        const procurementsData: ProcurementRequest[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as ProcurementRequest));
        setProcurements(procurementsData);
    }, (err) => {
        console.error('Error fetching procurements:', err);
    }));
    
    // Subscribe to material requests for this project
    const materialRequestsQuery = query(collection(firestore, 'materialRequests'), where('projectId', '==', projectId), orderBy('requestedAt', 'desc'));
    unsubscribes.push(onSnapshot(materialRequestsQuery, (snapshot) => {
        const requestsData: MaterialRequest[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaterialRequest));
        setMaterialRequests(requestsData);
    }, (err) => {
        console.error('Error fetching material requests:', err);
    }));

    // Subscribe to daily logs for this project
    const dailyLogsQuery = query(collection(firestore, 'projects', projectId, 'dailyLogs'), orderBy('createdAt', 'desc'));
    unsubscribes.push(onSnapshot(dailyLogsQuery, (snapshot) => {
        setDailyLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyLog)));
    }));

    // Subscribe to transactions for this project
    const transactionsQuery = query(collection(firestore, 'transactions'), where('projectId', '==', projectId), orderBy('date', 'desc'));
    unsubscribes.push(onSnapshot(transactionsQuery, (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
    }, (err) => {
        console.error('Error fetching transactions for project:', err);
    }));

    // Fetch all inventory items for the dropdown
    const inventoryQuery = query(collection(firestore, 'inventory'), where('quantity', '>', 0), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(inventoryQuery, (snapshot) => {
        const itemsData: InventoryItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        setInventoryItems(itemsData);
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

  const dailyLogForm = useForm<DailyLogFormValues>({
    resolver: zodResolver(dailyLogFormSchema),
    defaultValues: { notes: '' },
  });

  async function onMaterialRequestSubmit(values: MaterialRequestFormValues) {
    const result = await addMaterialRequest(projectId, values);
    if (result.errors) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      requestForm.reset();
      setIsRequestDialogOpen(false);
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
      if (result.errors.photo) {
        dailyLogForm.setError('photo', { type: 'server', message: result.errors.photo[0] });
      }
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      dailyLogForm.reset();
      const fileInput = document.getElementById('daily-log-photo') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  }

  async function handleRequestStatusUpdate(requestId: string, status: 'Approved' | 'Rejected') {
    const result = await updateMaterialRequestStatus(requestId, status);
    if (result.success) {
        toast({ title: 'Success', description: result.message });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
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
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/projects">
            <ArrowLeft className="mr-2" />
            Back to Projects
          </Link>
        </Button>
      </div>
    );
  }

  if (!project) {
    return null; 
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/projects">
                    <ArrowLeft />
                    <span className="sr-only">Back to Projects</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {project.name}
                </h1>
                <p className="text-muted-foreground">
                    Detailed view of the project.
                </p>
            </div>
        </div>

        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="team-materials">Team & Materials</TabsTrigger>
                <TabsTrigger value="daily-logs">Daily Logs</TabsTrigger>
                <TabsTrigger value="procurement">Procurement</TabsTrigger>
                <TabsTrigger value="financials">Financials</TabsTrigger>
                <TabsTrigger value="ai-assistant">
                    <Lightbulb className="mr-2" /> AI Assistant
                </TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Project Details</CardTitle>
                        {project.description && (
                            <CardDescription>{project.description}</CardDescription>
                        )}
                        {project.location && (
                            <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
                                <MapPin className="size-4" />
                                <span>{project.location}</span>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <DollarSign className="size-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Budget</p>
                                    <p className="text-lg font-semibold">{formatCurrency(project.budget)}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Calendar className="size-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Start Date</p>
                                    <p className="text-lg font-semibold">{project.startDate ? format(project.startDate.toDate(), 'PPP') : 'N/A'}</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <TrendingUp className="size-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Progress</p>
                                    <p className="text-lg font-semibold">{project.progress || 0}%</p>
                                     <Progress value={project.progress || 0} className="mt-2 w-32" />
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Activity className="size-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <Badge variant={statusVariant[project.status]} className="text-base font-semibold">{project.status}</Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="team-materials" className="pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Assigned Team</CardTitle>
                                <CardDescription>Team members assigned to this project.</CardDescription>
                            </div>
                            {profile?.role === 'admin' && (
                                <AssignTeamDialog
                                    projectId={project.id}
                                    employees={employees}
                                    assignedEmployeeIds={project.teamMemberIds || []}
                                />
                            )}
                        </CardHeader>
                        <CardContent>
                            {assignedTeam.length > 0 ? (
                                <ul className="space-y-4">
                                    {assignedTeam.map(member => (
                                        <li key={member.id} className="flex items-center gap-4">
                                            <Avatar>
                                                <AvatarImage src={`https://placehold.co/40x40.png`} alt={member.name} data-ai-hint="profile picture" />
                                                <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-semibold">{member.name}</p>
                                                <p className="text-sm text-muted-foreground">{member.role}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
                                    <Users className="size-12" />
                                    <p>No team members assigned yet.</p>
                                    {profile?.role === 'admin' && (
                                        <p className="text-xs">Use the "Assign Team" button to add members.</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <div>
                                <CardTitle>Material Requests</CardTitle>
                                <CardDescription>Requests for materials from inventory.</CardDescription>
                            </div>
                            <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button>
                                        <PackagePlus className="mr-2" /> Request
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Request Material from Inventory</DialogTitle>
                                        <DialogDescription>Select an item and specify the quantity needed for the project.</DialogDescription>
                                    </DialogHeader>
                                    <Form {...requestForm}>
                                        <form onSubmit={requestForm.handleSubmit(onMaterialRequestSubmit)} className="space-y-4 py-4">
                                            <FormField
                                                control={requestForm.control}
                                                name="itemId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Inventory Item</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select an item" />
                                                            </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                            {inventoryItems.map(item => (
                                                                <SelectItem key={item.id} value={item.id}>
                                                                    {item.name} (Available: {item.quantity})
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
                                                        <FormLabel>Quantity</FormLabel>
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
                                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                                                    ) : ( 'Submit Request' )}
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
                                            <TableHead>Item</TableHead>
                                            <TableHead>Qty</TableHead>
                                            <TableHead>Status</TableHead>
                                            {profile?.role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {materialRequests.map(req => (
                                            <TableRow key={req.id}>
                                                <TableCell className="font-medium">{req.itemName}</TableCell>
                                                <TableCell>{req.quantity}</TableCell>
                                                <TableCell><Badge variant={materialRequestStatusVariant[req.status]}>{req.status}</Badge></TableCell>
                                                {profile?.role === 'admin' && (
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
                                    <p>No material requests for this project yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
            <TabsContent value="daily-logs" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Logs</CardTitle>
                        <CardDescription>A chronological record of project updates and observations.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <ProjectLogSummary projectId={project.id} />
                        <Form {...dailyLogForm}>
                            <form onSubmit={dailyLogForm.handleSubmit(onDailyLogSubmit)} className="space-y-4">
                                <FormField
                                    control={dailyLogForm.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="sr-only">New Log Entry</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Add a new log entry for today..."
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
                                            <FormLabel>Attach Photo (Optional, max 5MB)</FormLabel>
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
                                        Add Log
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
                                    <p>No daily logs have been added to this project yet.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="procurement" className="pt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>Related Procurements</CardTitle>
                        <CardDescription>Purchase requests linked to this project.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {procurements.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Quantity</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {procurements.map(req => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.itemName}</TableCell>
                                            <TableCell>{req.quantity}</TableCell>
                                            <TableCell>
                                                <Badge variant={procurementStatusVariant[req.status]}>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 p-4 text-center text-muted-foreground">
                                <ShoppingCart className="size-12" />
                                <p>No procurement requests are linked to this project yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="financials" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Financial History</CardTitle>
                        <CardDescription>A list of all income and expense records linked to this project.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {transactions.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead className="text-right">Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map(transaction => (
                                        <TableRow key={transaction.id}>
                                            <TableCell>{transaction.date ? format(transaction.date.toDate(), 'PPP') : 'N/A'}</TableCell>
                                            <TableCell className="font-medium">{transaction.description}</TableCell>
                                            <TableCell>
                                                <Badge variant={transaction.type === 'Income' ? 'secondary' : 'destructive'}>
                                                    {transaction.type}
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
                                <p>No financial records found for this project.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="ai-assistant" className="pt-4">
                <ProjectAiAssistant project={project} />
            </TabsContent>
        </Tabs>
    </div>
  );
}
