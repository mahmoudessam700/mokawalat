
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Mail, Briefcase, Building, CheckCircle, ListTodo, Users, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive';
type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: EmployeeStatus;
  salary?: number;
};

type Project = {
    id: string;
    name: string;
    status: ProjectStatus;
    startDate: Timestamp;
};

const statusVariant: { [key in EmployeeStatus]: 'secondary' | 'outline' | 'destructive' } = {
  Active: 'secondary',
  'On Leave': 'outline',
  Inactive: 'destructive',
};

const projectStatusVariant: {
  [key in ProjectStatus]: 'secondary' | 'default' | 'outline' | 'destructive';
} = {
  'In Progress': 'secondary',
  Planning: 'default',
  Completed: 'outline',
  'On Hold': 'destructive',
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    });
    return `LE ${formatter.format(value)}`;
};


export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const employeeId = params.id;

  useEffect(() => {
    if (!employeeId) return;
    setIsLoading(true);
    setError(null);

    const unsubscribes: (() => void)[] = [];

    const employeeRef = doc(firestore, 'employees', employeeId);
    unsubscribes.push(onSnapshot(employeeRef, (doc) => {
        if (doc.exists()) {
            setEmployee({ id: doc.id, ...doc.data() } as Employee);
        } else {
            setError('Employee not found.');
        }
        setIsLoading(false);
    }, (err) => {
        console.error('Error fetching employee:', err);
        setError('Failed to fetch employee details.');
        setIsLoading(false);
    }));

    const projectsQuery = query(
        collection(firestore, 'projects'),
        where('teamMemberIds', 'array-contains', employeeId)
    );
    unsubscribes.push(onSnapshot(projectsQuery, (snapshot) => {
        const projectsData: Project[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(projectsData);
    }, (err) => {
        console.error('Error fetching projects:', err);
        setError('Failed to fetch assigned projects. If you see a Firestore error in the console, you may need to create a composite index.');
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [employeeId]);
  
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
            <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center text-center h-[50vh]">
        <Users className="w-16 h-16 mb-4 text-destructive" />
        <h2 className="text-2xl font-bold">Error</h2>
        <p className="text-muted-foreground">{error}</p>
         <Button asChild variant="outline" className="mt-4">
          <Link href="/employees">
            <ArrowLeft className="mr-2" />
            Back to Employees
          </Link>
        </Button>
      </div>
    );
  }

  if (!employee) return null;

  return (
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/employees">
                    <ArrowLeft />
                    <span className="sr-only">Back to Employees</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {employee.name}
                </h1>
                <p className="text-muted-foreground">
                    Detailed employee profile and project assignments.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
           <Card className="lg:col-span-1">
                <CardHeader>
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={`https://placehold.co/100x100.png`} data-ai-hint="profile picture" />
                            <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div className="text-center">
                            <CardTitle>{employee.name}</CardTitle>
                            <CardDescription>{employee.role}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4 border-t">
                     <div className="flex items-center gap-4">
                        <Mail className="size-4 text-muted-foreground" />
                        <a href={`mailto:${employee.email}`} className="text-sm hover:underline">{employee.email}</a>
                    </div>
                     <div className="flex items-center gap-4">
                        <Building className="size-4 text-muted-foreground" />
                        <span className="text-sm">{employee.department}</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <CheckCircle className="size-4 text-muted-foreground" />
                        <Badge variant={statusVariant[employee.status]}>{employee.status}</Badge>
                    </div>
                    {profile?.role === 'admin' && employee.salary && (
                        <div className="flex items-center gap-4 border-t pt-4">
                            <DollarSign className="size-4 text-muted-foreground" />
                            <span className="text-sm">{formatCurrency(employee.salary)} / month</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="lg:col-span-2">
                 <CardHeader>
                    <CardTitle>Assigned Projects</CardTitle>
                    <CardDescription>A list of all projects this employee is assigned to.</CardDescription>
                </CardHeader>
                <CardContent>
                    {projects.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Project Name</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {projects.map(project => (
                                    <TableRow key={project.id}>
                                        <TableCell className="font-medium">{project.name}</TableCell>
                                        <TableCell>{project.startDate ? format(project.startDate.toDate(), 'PPP') : 'N/A'}</TableCell>
                                        <TableCell>
                                            <Badge variant={projectStatusVariant[project.status]}>
                                                {project.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/projects/${project.id}`}>
                                                    View Project
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                            <ListTodo className="size-12" />
                            <p>This employee is not assigned to any projects yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
