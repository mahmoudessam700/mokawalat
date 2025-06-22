
'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, getDoc, type Timestamp, collection, query, getDocs, where, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Calendar, DollarSign, Activity, Users, ShoppingCart } from 'lucide-react';
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

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    });
    return `LE ${formatter.format(value)}`;
};

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [project, setProject] = useState<Project | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [procurements, setProcurements] = useState<ProcurementRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
        // Set loading false after project is fetched to avoid flicker
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
        setError('Failed to fetch procurement details. You may need to create a composite index in Firestore.');
    }));

    // Cleanup function
    return () => unsubscribes.forEach(unsub => unsub());

  }, [projectId]);
  
  const assignedTeam = useMemo(() => {
    if (!project?.teamMemberIds || !employees.length) {
      return [];
    }
    return employees.filter(employee => project.teamMemberIds!.includes(employee.id));
  }, [project, employees]);

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
                     <AssignTeamDialog
                        projectId={project.id}
                        employees={employees}
                        assignedEmployeeIds={project.teamMemberIds || []}
                    />
                </CardHeader>
                <CardContent>
                     {assignedTeam.length > 0 ? (
                        <ul className="space-y-4">
                            {assignedTeam.map(member => (
                                <li key={member.id} className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint="profile picture" />
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
                            <p className="text-xs">Use the "Assign Team" button to add members.</p>
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
    </div>
  );
}
