
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, type Timestamp, collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Briefcase, Calendar, DollarSign, Activity, Users, ShoppingCart, PackagePlus, PackageCheck, PackageX, PackageSearch } from 'lucide-react';
import { format } from 'date-fns';
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
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { addMaterialRequest, updateMaterialRequestStatus, type MaterialRequestFormValues } from '../actions';
import { Loader2 } from 'lucide-react';

type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';

type Project = {
  id: string;
  name: string;
  description?: string;
  budget: number;
  startDate: Timestamp;
  status: ProjectStatus;
  teamMemberIds?: string[];
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

type InventoryItem = {
    id: string;
    name: string;
    quantity: number;
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

const materialRequestFormSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});


export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [procurements, setProcurements] = useState<ProcurementRequest[]>([]);
  const [materialRequests, setMaterialRequests] = useState<MaterialRequest[]>([]);
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
          <CardContent className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

        <Card>
            <CardHeader>
                <CardTitle>Project Details</CardTitle>
                {project.description && (
                    <CardDescription>{project.description}</CardDescription>
                )}
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        </div>
        
        <Card>
            <CardHeader className="flex-row items-center justify-between">
                <div>
                    <CardTitle>Material Requests</CardTitle>
                    <CardDescription>Requests for materials from inventory for this project.</CardDescription>
                </div>
                 <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PackagePlus className="mr-2" /> Request Material
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
                                <TableHead>Quantity</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                {profile?.role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materialRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium">{req.itemName}</TableCell>
                                    <TableCell>{req.quantity}</TableCell>
                                    <TableCell>{req.requestedAt ? format(req.requestedAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge variant={materialRequestStatusVariant[req.status]}>{req.status}</Badge>
                                    </TableCell>
                                    {profile?.role === 'admin' && (
                                        <TableCell className="text-right">
                                            {req.status === 'Pending' && (
                                                <div className="flex gap-2 justify-end">
                                                    <Button size="sm" variant="outline" className="text-success hover:text-success border-green-500 hover:bg-green-50" onClick={() => handleRequestStatusUpdate(req.id, 'Approved')}>
                                                        <PackageCheck className="mr-2" /> Approve
                                                    </Button>
                                                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive border-red-500 hover:bg-red-50" onClick={() => handleRequestStatusUpdate(req.id, 'Rejected')}>
                                                        <PackageX className="mr-2" /> Reject
                                                    </Button>
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
                        <p className="text-xs">Use the "Request Material" button to get started.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
