
'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, collection, query, where, type Timestamp, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Mail, Briefcase, Building, CheckCircle, ListTodo, Users, DollarSign, Calendar, Clock } from 'lucide-react';
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
import { EmployeeAiSummary } from './employee-ai-summary';
import { useLanguage } from '@/hooks/use-language';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type EmployeeStatus = 'Active' | 'On Leave' | 'Inactive';
type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: EmployeeStatus;
  salary?: number;
  photoUrl?: string;
};

type Project = {
    id: string;
    name: string;
    status: ProjectStatus;
    startDate: Timestamp;
};

type LeaveRequest = {
    id: string;
    leaveType: string;
    startDate: Timestamp;
    endDate: Timestamp;
    status: LeaveStatus;
};

type AttendanceRecord = {
    id: string;
    checkInTime: Timestamp;
    checkOutTime?: Timestamp;
    status: string;
    date: string;
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

const leaveStatusVariant: { [key in LeaveStatus]: 'default' | 'secondary' | 'destructive' } = {
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


export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();
  const employeeId = params.id;
  const { t } = useLanguage();

  useEffect(() => {
    if (!employeeId) return;
    setIsLoading(true);
    setError(null);

    const unsubscribes: (() => void)[] = [];

    unsubscribes.push(onSnapshot(doc(firestore, 'employees', employeeId), (doc) => {
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

    unsubscribes.push(onSnapshot(query(collection(firestore, 'projects'), where('teamMemberIds', 'array-contains', employeeId)), (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }, (err) => console.error('Error fetching projects:', err)));

    unsubscribes.push(onSnapshot(query(collection(firestore, 'leaveRequests'), where('employeeId', '==', employeeId), orderBy('startDate', 'desc')), (snapshot) => {
        setLeaveRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest)));
    }, (err) => console.error('Error fetching leave requests:', err)));

    unsubscribes.push(onSnapshot(query(collection(firestore, 'attendance'), where('employeeId', '==', employeeId), orderBy('date', 'desc')), (snapshot) => {
        setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendanceRecord)));
    }, (err) => console.error('Error fetching attendance:', err)));

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
            {t('employees.back_to_employees')}
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
                    <span className="sr-only">{t('employees.back_to_employees')}</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">
                    {employee.name}
                </h1>
                <p className="text-muted-foreground">
                    {t('employees.detail_page_desc')}
                </p>
            </div>
        </div>

        <Tabs defaultValue="overview">
            <TabsList>
                <TabsTrigger value="overview">{t('clients.overview_tab')}</TabsTrigger>
                <TabsTrigger value="projects">{t('clients.projects_tab')}</TabsTrigger>
                <TabsTrigger value="leave">{t('human_capital_management.leave_management.title')}</TabsTrigger>
                <TabsTrigger value="attendance">{t('human_capital_management.attendance.title')}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-1 space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col items-center gap-4">
                                        <Avatar className="h-24 w-24">
                                            <AvatarImage src={employee.photoUrl || `https://placehold.co/100x100.png`} data-ai-hint="profile picture" />
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
                                        <Badge variant={statusVariant[employee.status]}>{t(`employees.status.${employee.status}`)}</Badge>
                                    </div>
                                    {profile?.role === 'admin' && employee.salary && (
                                        <div className="flex items-center gap-4 border-t pt-4">
                                            <DollarSign className="size-4 text-muted-foreground" />
                                            <span className="text-sm">{formatCurrency(employee.salary)} / {t('employees.per_month')}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                    </div>
                    <div className="lg:col-span-2">
                        <EmployeeAiSummary employeeId={employee.id} employeeName={employee.name} />
                    </div>
                </div>
            </TabsContent>
            <TabsContent value="projects" className="pt-4">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('employees.assigned_projects_title')}</CardTitle>
                        <CardDescription>{t('employees.assigned_projects_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {projects.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('clients.project_name_header')}</TableHead>
                                        <TableHead>{t('status')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.map(project => (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-medium">
                                                <Link href={`/projects/${project.id}`} className="hover:underline">
                                                    {project.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={projectStatusVariant[project.status]}>
                                                    {project.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                                <ListTodo className="size-12" />
                                <p>{t('employees.not_assigned_to_projects')}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="leave" className="pt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>{t('human_capital_management.leave_management.history_title')}</CardTitle>
                        <CardDescription>{t('human_capital_management.leave_management.history_desc', {name: employee.name})}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {leaveRequests.length > 0 ? (
                           <Table>
                            <TableHeader><TableRow><TableHead>{t('type')}</TableHead><TableHead>{t('projects.start_date')}</TableHead><TableHead>{t('human_capital_management.leave_management.end_date')}</TableHead><TableHead>{t('status')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {leaveRequests.map(req => (
                                <TableRow key={req.id}>
                                    <TableCell>{t(`human_capital_management.leave_management.leave_types.${req.leaveType}`)}</TableCell>
                                    <TableCell>{format(req.startDate.toDate(), 'PPP')}</TableCell>
                                    <TableCell>{format(req.endDate.toDate(), 'PPP')}</TableCell>
                                    <TableCell><Badge variant={leaveStatusVariant[req.status]}>{t(`human_capital_management.leave_management.status.${req.status}`)}</Badge></TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                           </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"><Calendar className="size-12" /><p>{t('human_capital_management.leave_management.no_history')}</p></div>
                        )}
                    </CardContent>
                 </Card>
            </TabsContent>
            <TabsContent value="attendance" className="pt-4">
                 <Card>
                    <CardHeader>
                        <CardTitle>{t('human_capital_management.attendance.history_title')}</CardTitle>
                        <CardDescription>{t('human_capital_management.attendance.history_desc', {name: employee.name})}</CardDescription>
                    </CardHeader>
                    <CardContent>
                         {attendance.length > 0 ? (
                           <Table>
                            <TableHeader><TableRow><TableHead>{t('date')}</TableHead><TableHead>{t('human_capital_management.attendance.check_in')}</TableHead><TableHead>{t('human_capital_management.attendance.check_out')}</TableHead><TableHead>{t('status')}</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {attendance.map(att => (
                                <TableRow key={att.id}>
                                    <TableCell>{format(new Date(att.date), 'PPP')}</TableCell>
                                    <TableCell>{format(att.checkInTime.toDate(), 'p')}</TableCell>
                                    <TableCell>{att.checkOutTime ? format(att.checkOutTime.toDate(), 'p') : 'N/A'}</TableCell>
                                    <TableCell><Badge variant={att.status === 'Present' ? 'secondary' : 'default'}>{t(`human_capital_management.attendance.status.${att.status}`)}</Badge></TableCell>
                                </TableRow>
                                ))}
                            </TableBody>
                           </Table>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground"><Clock className="size-12" /><p>{t('human_capital_management.attendance.no_history')}</p></div>
                        )}
                    </CardContent>
                 </Card>
            </TabsContent>
        </Tabs>
    </div>
  );
}
