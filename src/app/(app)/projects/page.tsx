
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
import { Loader2, MoreHorizontal, PlusCircle, Search, Trash2, Users } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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
// Server actions omitted for create/update/delete to ensure Firestore rules see client auth
import { useToast } from '@/hooks/use-toast';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
  where,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/hooks/use-language';

type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';

type Project = {
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

type Client = {
    id: string;
    name: string;
};

const statusVariant: {
  [key in ProjectStatus]: 'secondary' | 'default' | 'outline' | 'destructive';
} = {
  'In Progress': 'secondary',
  Planning: 'default',
  Completed: 'outline',
  'On Hold': 'destructive',
};

const projectFormSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters long.'),
  description: z.string().optional(),
  location: z.string().optional(),
  budget: z.coerce.number().positive('Budget must be a positive number.'),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Please select a valid date.',
    }),
  status: z.enum(['Planning', 'In Progress', 'Completed', 'On Hold']),
  clientId: z.string().optional(),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectExpenses, setProjectExpenses] = useState<Record<string, number>>({});
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const qProjects = query(
      collection(firestore, 'projects'),
      orderBy('startDate', 'desc')
    );
    unsubscribes.push(onSnapshot(
      qProjects,
      (querySnapshot) => {
        const projectsData: Project[] = [];
        querySnapshot.forEach((doc) => {
          projectsData.push({ id: doc.id, ...doc.data() } as Project);
        });
        setProjects(projectsData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching projects:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch projects. Check permissions.',
        });
        setIsLoading(false);
      }
    ));
    
    const qClients = query(collection(firestore, 'clients'));
    unsubscribes.push(onSnapshot(qClients, (snapshot) => {
        const clientsData: Client[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        clientsData.sort((a, b) => a.name.localeCompare(b.name));
        setClients(clientsData);
    }));

    // Listen to transactions to compute per-project expenses
    const qTransactions = query(collection(firestore, 'transactions'));
    unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
      const totals: Record<string, number> = {};
      snapshot.docs.forEach(d => {
        const data = d.data() as any;
        if (data.type === 'Expense' && data.projectId) {
          totals[data.projectId] = (totals[data.projectId] || 0) + Number(data.amount || 0);
        }
      });
      setProjectExpenses(totals);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);
  
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = project.name.toLowerCase().includes(lowercasedTerm);
        const matchesStatus = statusFilter === 'All' || project.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);
  
  const clientNames = useMemo(() => new Map(clients.map(c => [c.id, c.name])), [clients]);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      budget: 0,
      startDate: '',
      status: 'Planning',
      clientId: '',
    },
  });

  useEffect(() => {
    if (projectToEdit) {
      form.reset({
        ...projectToEdit,
        startDate: projectToEdit.startDate ? format(projectToEdit.startDate.toDate(), 'yyyy-MM-dd') : '',
        description: projectToEdit.description || '',
        location: projectToEdit.location || '',
        clientId: projectToEdit.clientId || '',
      });
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [projectToEdit, form]);

  async function onSubmit(values: ProjectFormValues) {
    if (projectToEdit) {
      // Update project on the client so Firestore rules can use the signed-in user's auth
      try {
        await updateDoc(doc(firestore, 'projects', projectToEdit.id), {
          ...values,
          name_lowercase: values.name.toLowerCase(),
          startDate: new Date(values.startDate),
        } as any);

        // Best-effort activity log; don't block on failure
        addDoc(collection(firestore, 'activityLog'), {
          message: `Project details updated for: ${values.name}`,
          type: 'PROJECT_UPDATED',
          link: `/projects/${projectToEdit.id}`,
          timestamp: serverTimestamp(),
        }).catch((err) => {
          console.warn('Failed to write activity log for project update:', err);
        });

        toast({ title: t('success'), description: 'Project updated successfully.' });
        setIsDialogOpen(false);
        setProjectToEdit(null);
      } catch (error: any) {
        console.error('Failed to update project:', error);
        toast({ variant: 'destructive', title: t('error'), description: 'Failed to update project.' });
      }
      return;
    }

    // Create project on the client so Firestore rules can use the signed-in user's auth
    try {
      const data = {
        ...values,
        name_lowercase: values.name.toLowerCase(),
        progress: 0,
        startDate: new Date(values.startDate),
        createdAt: serverTimestamp(),
      } as any;

      const projRef = await addDoc(collection(firestore, 'projects'), data);

      // Best-effort activity log; don't block on failure
      addDoc(collection(firestore, 'activityLog'), {
        message: `New project created: ${values.name}`,
        type: 'PROJECT_CREATED',
        link: `/projects/${projRef.id}`,
        timestamp: serverTimestamp(),
      }).catch((err) => {
        console.warn('Failed to write activity log for project create:', err);
      });

  toast({ title: t('success'), description: 'Project added successfully.' });
      setIsDialogOpen(false);
      setProjectToEdit(null);
    } catch (error: any) {
      console.error('Failed to add project:', error);
  toast({ variant: 'destructive', title: t('error'), description: 'Failed to add project.' });
    }
  }

  async function handleDeleteProject() {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      const id = projectToDelete.id;
      const name = projectToDelete.name;
      await deleteDoc(doc(firestore, 'projects', id));

      // Best-effort activity log; don't block on failure
      addDoc(collection(firestore, 'activityLog'), {
        message: `Project deleted: ${name}`,
        type: 'PROJECT_DELETED',
        link: `/projects`,
        timestamp: serverTimestamp(),
      }).catch((err) => {
        console.warn('Failed to write activity log for project delete:', err);
      });

      toast({ title: t('success'), description: 'Project deleted successfully.' });
    } catch (error: any) {
      console.error('Failed to delete project:', error);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to delete project.' });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  }

  const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    });
    return `LE ${formatter.format(value)}`;
  };
  
  const handleFormDialog_onOpenChange = (open: boolean) => {
    if (!open) {
      setProjectToEdit(null);
    }
    setIsDialogOpen(open);
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            {t('projects.page_title')}
          </h1>
          <p className="text-muted-foreground">
            {t('projects.page_desc')}
          </p>
        </div>
        {profile?.role === 'admin' && (
            <Dialog open={isDialogOpen} onOpenChange={handleFormDialog_onOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setProjectToEdit(null)}>
                <PlusCircle className="mr-2" />
                {t('projects.add_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>{projectToEdit ? t('projects.edit_title') : t('projects.add_title')}</DialogTitle>
                <DialogDescription>
                    {projectToEdit ? t('projects.edit_desc') : t('projects.add_desc')}
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4 py-4"
                >
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('projects.name_label')}</FormLabel>
                        <FormControl>
                            <Input
                            placeholder={t('projects.name_placeholder')}
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('projects.desc_label')}</FormLabel>
                        <FormControl>
                            <Textarea
                            placeholder={t('projects.desc_placeholder')}
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('projects.client_label')}</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('projects.client_placeholder')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">{t('projects.none')}</SelectItem>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('projects.location_label')}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t('projects.location_placeholder')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="budget"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('projects.budget_label')}</FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                placeholder={t('projects.budget_placeholder')}
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('projects.start_date_label')}</FormLabel>
                            <FormControl>
                            <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </div>
                    <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('status')}</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={t('clients.select_status')} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Planning">{t('project_status_planning')}</SelectItem>
                            <SelectItem value="In Progress">
                                {t('project_status_in_progress')}
                            </SelectItem>
                            <SelectItem value="Completed">{t('project_status_completed')}</SelectItem>
                            <SelectItem value="On Hold">{t('project_status_on_hold')}</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            {t('saving')}
                        </>
                        ) : (
                        projectToEdit ? t('save_changes') : t('projects.save_button')
                        )}
                    </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
           <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>{t('projects.list_title')}</CardTitle>
              <CardDescription>
                {t('projects.list_desc')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-xs">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                      type="search"
                      placeholder={t('projects.search_placeholder')}
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                  />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('clients.filter_by_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('clients.all_statuses')}</SelectItem>
                  <SelectItem value="Planning">{t('project_status_planning')}</SelectItem>
                  <SelectItem value="In Progress">{t('project_status_in_progress')}</SelectItem>
                  <SelectItem value="Completed">{t('project_status_completed')}</SelectItem>
                  <SelectItem value="On Hold">{t('project_status_on_hold')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('projects.name_label')}</TableHead>
                <TableHead>{t('client')}</TableHead>
                <TableHead className="hidden md:table-cell">
                  {t('projects.start_date_label')}
                </TableHead>
                <TableHead>{t('projects.budget')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('projects.team_header')}</TableHead>
                <TableHead>{t('projects.progress')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Skeleton className="h-4 w-[250px]" />
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                     <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-[50px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[100px] rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                        disabled
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      {project.name}
                      {project.budget > 0 && (projectExpenses[project.id] || 0) / project.budget >= 0.9 && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          {t('projects.near_budget') || 'Near budget'}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {project.clientId && clientNames.has(project.clientId) ? (
                        <Link href={`/clients/${project.clientId}`} className="hover:underline">
                          {clientNames.get(project.clientId)}
                        </Link>
                      ) : (
                        'N/A'
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {project.startDate
                        ? format(project.startDate.toDate(), 'PPP')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{formatCurrency(project.budget)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-muted-foreground" />
                        <span>{project.teamMemberIds?.length || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Progress value={project.progress || 0} className="w-24" />
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[project.status]}>
                        {t(`project_status_${project.status.toLowerCase().replace(' ', '_')}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t('toggle_menu')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/projects/${project.id}`}>{t('view_details')}</Link>
                          </DropdownMenuItem>
                          {profile?.role === 'admin' && (
                            <>
                                <DropdownMenuItem onSelect={() => {
                                    setProjectToEdit(project);
                                    setIsDialogOpen(true);
                                }}>
                                    {t('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={() => {
                                    setProjectToDelete(project);
                                    setIsDeleteDialogOpen(true);
                                    }}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('delete')}
                                </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {t('projects.no_projects_match_filters')}
                  </TableCell>
                </TableRow>
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
          <AlertDialogDescription>
            {t('projects.delete_confirm_desc', { name: projectToDelete?.name ?? '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setProjectToDelete(null)}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteProject}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('deleting')}</>
            ) : (
              <><Trash2 className="mr-2 h-4 w-4" /> {t('delete')}</>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
