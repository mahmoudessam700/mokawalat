
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
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { ArrowLeft, Users, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Employee = {
  id: string;
  name: string;
  role: string;
  department: string;
  salary: number;
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};

export default function PayrollSummaryPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthLoading && profile?.role !== 'admin') {
      toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this page.',
      });
      router.replace('/employees');
    }
  }, [profile, isAuthLoading, router, toast]);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    // Query for employees who have a salary defined and greater than 0
    const q = query(
        collection(firestore, 'employees'), 
        where('salary', '>', 0),
        orderBy('salary', 'desc')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const employeesData: Employee[] = [];
      querySnapshot.forEach((doc) => {
        employeesData.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(employeesData);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching payroll data: ", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to fetch payroll data. You may need to create a Firestore index.',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast, profile]);

  const totalPayroll = useMemo(() => {
    return employees.reduce((acc, employee) => acc + (employee.salary || 0), 0);
  }, [employees]);

  if (isAuthLoading || profile?.role !== 'admin') {
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
                    <span className="sr-only">Back to Employees</span>
                </Link>
            </Button>
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight">
                Payroll Summary
              </h1>
              <p className="text-muted-foreground">
                A summary of monthly salary expenses for all employees.
              </p>
            </div>
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle>Employee Salaries</CardTitle>
            <CardDescription>A list of all employees with defined salaries, sorted by highest salary.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Monthly Salary</TableHead>
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
                        No employees with salaries found.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3} className="font-bold text-lg">Total Monthly Payroll</TableCell>
                    <TableCell className="text-right font-bold text-lg font-mono">{formatCurrency(totalPayroll)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
