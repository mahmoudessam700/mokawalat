
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where, orderBy, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, Users, DollarSign, Loader2, CalendarClock } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { runPayroll } from './actions';
import { format } from 'date-fns';
import { useLanguage } from '@/hooks/use-language';

type Employee = {
  id: string;
  name: string;
  role: string;
  department: string;
  salary: number;
};

type Account = {
  id: string;
  name: string;
};

type PayrollRun = {
    id: string;
    runAt: Timestamp;
    runByEmail: string;
    totalAmount: number;
    employeeCount: number;
    accountId: string;
};

const runPayrollSchema = z.object({
  accountId: z.string().min(1, 'A bank account is required to run payroll.'),
  payrollDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
});

type RunPayrollFormValues = z.infer<typeof runPayrollSchema>;

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};

export default function PayrollSummaryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();

  const form = useForm<RunPayrollFormValues>({
    resolver: zodResolver(runPayrollSchema),
    defaultValues: {
      accountId: '',
      payrollDate: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  useEffect(() => {
    if (!isAuthLoading && !['admin', 'manager'].includes(profile?.role || '')) {
      toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this page.',
      });
      router.replace('/employees');
    }
  }, [profile, isAuthLoading, router, toast]);

  useEffect(() => {
    if (!['admin', 'manager'].includes(profile?.role || '')) return;
    
    const unsubscribes: (() => void)[] = [];

    const qEmployees = query(
        collection(firestore, 'employees'), 
        where('status', '==', 'Active')
    );
    unsubscribes.push(onSnapshot(qEmployees, (querySnapshot) => {
      const employeesData: Employee[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Employee;
        if (data.salary && data.salary > 0) {
            const { id: _ignored, ...rest } = data as any;
            employeesData.push({ id: doc.id, ...(rest as any) });
        }
      });
      employeesData.sort((a,b) => (b.salary || 0) - (a.salary || 0));
      setEmployees(employeesData);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching payroll data: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to fetch payroll data.',
        });
        setIsLoading(false);
    }));

    const qAccounts = query(collection(firestore, 'accounts'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qAccounts, (snapshot) => {
        setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
    }));
    
    const qRuns = query(collection(firestore, 'payrollRuns'), orderBy('id', 'desc'));
    unsubscribes.push(onSnapshot(qRuns, (snapshot) => {
        setPayrollRuns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PayrollRun)));
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast, profile]);

  const totalPayroll = useMemo(() => {
    return employees.reduce((acc, employee) => acc + (employee.salary || 0), 0);
  }, [employees]);
  
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a.name])), [accounts]);

  async function onRunPayrollSubmit(values: RunPayrollFormValues) {
    if (!profile) {
      toast({ variant: 'destructive', title: t('error'), description: 'You must be logged in to run payroll.' });
      return;
    }
    const result = await runPayroll({ uid: profile.uid, email: profile.email }, values);
    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      setIsDialogOpen(false);
    }
  }

  if (isAuthLoading || !['admin', 'manager'].includes(profile?.role || '')) {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div>
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-4 w-48 mt-2" />
                </div>
            </div>
            <Card><CardContent className="p-6"><Skeleton className="h-80 w-full" /></CardContent></Card>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/employees">
                    <ArrowLeft />
                    <span className="sr-only">{t('employees.back_to_employees')}</span>
                </Link>
            </Button>
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight">
                {t('employees.payroll_summary_title')}
              </h1>
              <p className="text-muted-foreground">
                {t('employees.payroll_summary_desc')}
              </p>
            </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button disabled={employees.length === 0 || accounts.length === 0}>
                    <CalendarClock className="mr-2"/> {t('employees.run_payroll_button')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('employees.confirm_payroll_title')}</DialogTitle>
                    <DialogDescription>
                        {t('employees.confirm_payroll_desc', { count: employees.length.toString(), total: formatCurrency(totalPayroll) })}
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onRunPayrollSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="accountId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('employees.payment_account_label')}</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                        <SelectValue placeholder={t('employees.select_account_placeholder')} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {accounts.map(account => (
                                            <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="payrollDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('employees.payroll_date_label')}</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="bg-destructive hover:bg-destructive/90">
                                {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('employees.processing')}</> : t('employees.confirm_run_payroll_button')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>{t('employees.salaries_title')}</CardTitle>
            <CardDescription>{t('employees.salaries_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('employees.employee_name_header')}</TableHead>
                <TableHead>{t('department')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead className="text-right">{t('employees.monthly_salary_header')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : employees.length > 0 ? (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.department}</TableCell>
                    <TableCell>{employee.role}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(employee.salary)}</TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Users className="size-12" />
                        {t('employees.no_active_employees_with_salaries')}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="font-bold text-lg">{t('employees.total_monthly_payroll')}</TableCell>
                    <TableCell className="text-right font-bold text-lg font-mono">{formatCurrency(totalPayroll)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>{t('employees.payroll_history')}</CardTitle>
            <CardDescription>{t('employees.payroll_history_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('employees.period')}</TableHead>
                <TableHead>{t('employees.date_run')}</TableHead>
                <TableHead>{t('employees.run_by')}</TableHead>
                <TableHead>{t('financials.account_header')}</TableHead>
                <TableHead>{t('employees.employees_count')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : payrollRuns.length > 0 ? (
                payrollRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-mono">{format(new Date(run.id), 'MMMM yyyy')}</TableCell>
                    <TableCell>{format(run.runAt.toDate(), 'PPP p')}</TableCell>
                    <TableCell>{run.runByEmail}</TableCell>
                    <TableCell>{accountMap.get(run.accountId) || 'N/A'}</TableCell>
                    <TableCell>{run.employeeCount}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(run.totalAmount)}</TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Users className="size-12" />
                        {t('employees.no_payroll_history')}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
