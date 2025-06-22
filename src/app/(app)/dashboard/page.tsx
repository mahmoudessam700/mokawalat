'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, Warehouse, DollarSign } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, where, type Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth } from 'date-fns';

// Simplified types for dashboard calculations
type Project = { status: 'Planning' | 'In Progress' | 'Completed' | 'On Hold' };
type Transaction = { type: 'Income' | 'Expense'; amount: number; date: Timestamp };

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 1,
    });
    return `LE ${formatter.format(value)}`;
};

export default function DashboardPage() {
  const [projectCount, setProjectCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [projectStatusData, setProjectStatusData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const qProjects = query(collection(firestore, 'projects'));
    unsubscribes.push(onSnapshot(qProjects, (snapshot) => {
      setProjectCount(snapshot.docs.filter(doc => (doc.data() as Project).status === 'In Progress').length);
      const statusCounts = snapshot.docs
        .map(doc => doc.data() as Project)
        .reduce((acc, project) => {
          acc[project.status] = (acc[project.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      
      const chartData = [
        { status: 'Planning', projects: statusCounts['Planning'] || 0 },
        { status: 'In Progress', projects: statusCounts['In Progress'] || 0 },
        { status: 'Completed', projects: statusCounts['Completed'] || 0 },
        { status: 'On Hold', projects: statusCounts['On Hold'] || 0 },
      ];
      setProjectStatusData(chartData);
    }));

    const qEmployees = query(collection(firestore, 'employees'));
    unsubscribes.push(onSnapshot(qEmployees, (snapshot) => {
      setEmployeeCount(snapshot.size);
    }));

    const qInventory = query(collection(firestore, 'inventory'));
    unsubscribes.push(onSnapshot(qInventory, (snapshot) => {
      setInventoryCount(snapshot.size);
    }));
    
    // Fetch all transactions and filter client-side to avoid composite index requirement
    const qTransactions = query(collection(firestore, 'transactions'));
    unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        const revenue = snapshot.docs
            .map(doc => doc.data() as Transaction)
            .filter(transaction => {
                if (!transaction.date || typeof transaction.date.toDate !== 'function') {
                    return false;
                }
                const transactionDate = transaction.date.toDate();
                return transaction.type === 'Income' && transactionDate >= start && transactionDate <= end;
            })
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        setMonthlyRevenue(revenue);
    }));
    
    const timer = setTimeout(() => setIsLoading(false), 1500);
    unsubscribes.push(() => clearTimeout(timer));

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  const kpis = [
    {
      title: 'Active Projects',
      value: projectCount,
      icon: <Briefcase className="size-6 text-muted-foreground" />,
      isLoading: isLoading,
    },
    {
      title: 'Total Employees',
      value: employeeCount,
      icon: <Users className="size-6 text-muted-foreground" />,
      isLoading: isLoading,
    },
    {
      title: 'Inventory Items',
      value: inventoryCount,
      icon: <Warehouse className="size-6 text-muted-foreground" />,
      isLoading: isLoading,
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(monthlyRevenue),
      icon: <DollarSign className="size-6 text-muted-foreground" />,
      isLoading: isLoading,
    },
  ];

  const chartConfig = {
    projects: {
      label: 'Projects',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        Dashboard
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              {kpi.icon}
            </CardHeader>
            <CardContent>
              {kpi.isLoading ? <Skeleton className="h-8 w-24" /> : (
                <div className="text-2xl font-bold">{kpi.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Project Status Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart accessibilityLayer data={projectStatusData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="status"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                    allowDecimals={false}
                    stroke="hsl(var(--muted-foreground))"
                    />
                    <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar
                    dataKey="projects"
                    fill="var(--color-projects)"
                    radius={4}
                    />
                </BarChart>
                </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You have no pending tasks.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
