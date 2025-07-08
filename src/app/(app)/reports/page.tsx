
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, onSnapshot, query, type Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, DollarSign, Briefcase, Contact } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { subDays, format, differenceInDays } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';

// Types from other modules
type TransactionType = 'Income' | 'Expense';
type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  date: Timestamp;
  projectId?: string;
};
type InventoryItem = {
  id:string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};
type Employee = {
  id: string;
  department: string;
};
type Client = {
  id: string;
  status: 'Lead' | 'Active' | 'Inactive';
  createdAt: Timestamp;
};
type Project = {
    id: string;
    name: string;
    budget: number;
    startDate: Timestamp;
    status: 'In Progress' | 'Planning' | 'Completed' | 'On Hold';
};


export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { t, locale } = useLanguage();
  
  const [date, setDate] = useState<DateRange | undefined>(undefined);
  
  const fnsLocale = useMemo(() => (locale === 'ar' ? ar : enUS), [locale]);

  const chartConfig: ChartConfig = useMemo(() => ({
    income: {
      label: t('financials.income'),
      color: 'hsl(var(--chart-2))',
    },
    expense: {
      label: t('financials.expense'),
      color: 'hsl(var(--chart-5))',
    },
    inStock: {
      label: t('inventory.status.In Stock'),
      color: 'hsl(var(--chart-2))',
    },
    lowStock: {
      label: t('inventory.status.Low Stock'),
      color: 'hsl(var(--chart-4))',
    },
    outOfStock: {
      label: t('inventory.status.Out of Stock'),
      color: 'hsl(var(--chart-5))',
    },
    budget: {
      label: t('projects.budget'),
      color: "hsl(var(--chart-1))",
    },
    Lead: {
      label: t('clients.status.Lead'),
      color: 'hsl(var(--chart-1))'
    },
    Active: {
      label: t('clients.status.Active'),
      color: 'hsl(var(--chart-2))'
    },
    Inactive: {
      label: t('clients.status.Inactive'),
      color: 'hsl(var(--chart-5))'
    }
  }), [t]);

  useEffect(() => {
    // Set the initial date range only on the client side after hydration
    setDate({
      from: subDays(new Date(), 29),
      to: new Date(),
    });
  }, []);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    
    const qTransactions = query(collection(firestore, 'transactions'));
    unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => {
      console.error("Error fetching transactions: ", error);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to fetch financial data.' });
    }));

    const qInventory = query(collection(firestore, 'inventory'));
    unsubscribes.push(onSnapshot(qInventory, (snapshot) => {
      const data: InventoryItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(data);
    }, (error) => {
      console.error("Error fetching inventory: ", error);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to fetch inventory data.' });
    }));

    const qEmployees = query(collection(firestore, 'employees'));
    unsubscribes.push(onSnapshot(qEmployees, (snapshot) => {
        const data: Employee[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(data);
    }, (error) => {
        console.error("Error fetching employees: ", error);
        toast({ variant: 'destructive', title: t('error'), description: 'Failed to fetch employee data.' });
    }));

    const qClients = query(collection(firestore, 'clients'));
    unsubscribes.push(onSnapshot(qClients, (snapshot) => {
        const data: Client[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(data);
    }, (error) => {
        console.error("Error fetching clients: ", error);
        toast({ variant: 'destructive', title: t('error'), description: 'Failed to fetch client data.' });
    }));

    const qProjects = query(collection(firestore, 'projects'));
    unsubscribes.push(onSnapshot(qProjects, (snapshot) => {
        const data: Project[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(data);
    }, (error) => {
      console.error("Error fetching projects: ", error);
      toast({ variant: 'destructive', title: t('error'), description: 'Failed to fetch project data.' });
    }));


    // We can set loading to false after a short delay, assuming fetches will be quick
    const timer = setTimeout(() => setIsLoading(false), 1500);
    unsubscribes.push(() => clearTimeout(timer));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        if (!date || !t.date) return false; // if no date range or transaction date, exclude
        const transactionDate = t.date.toDate();
        // Set time to 00:00:00 for the 'from' date and 23:59:59 for the 'to' date for inclusive range
        const from = date.from ? new Date(new Date(date.from).setHours(0, 0, 0, 0)) : null;
        const to = date.to ? new Date(new Date(date.to).setHours(23, 59, 59, 999)) : null;
        
        if (from && to) {
            return transactionDate >= from && transactionDate <= to;
        }
        if (from) {
            return transactionDate >= from;
        }
        if (to) {
            return transactionDate <= to;
        }
        return false; // No date range selected
    });
  }, [transactions, date]);

  const financialChartData = useMemo(() => {
    if (!date?.from || !date?.to) return [];

    const isLongRange = differenceInDays(date.to, date.from) > 90;
    const groupFormat = isLongRange ? 'yyyy-MM' : 'yyyy-MM-dd';
    const displayFormat = isLongRange ? 'MMM yyyy' : 'dd MMM';

    const groupedData = filteredTransactions.reduce((acc, t) => {
      if (!t.date) return acc;
      const dateKey = format(t.date.toDate(), groupFormat);
      
      if (!acc[dateKey]) {
        acc[dateKey] = { date: dateKey, displayDate: format(t.date.toDate(), displayFormat, { locale: fnsLocale }), income: 0, expense: 0 };
      }
      
      if (t.type === 'Income') {
        acc[dateKey].income += t.amount;
      } else {
        acc[dateKey].expense += t.amount;
      }
      
      return acc;
    }, {} as Record<string, { date: string, displayDate: string, income: number, expense: number }>);
    
    return Object.values(groupedData).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTransactions, date, fnsLocale]);

  const periodMetrics = useMemo(() => {
    const from = date?.from ? new Date(new Date(date.from).setHours(0, 0, 0, 0)) : null;
    const to = date?.to ? new Date(new Date(date.to).setHours(23, 59, 59, 999)) : null;

    if (!from || !to) return { projects: 0, clients: 0 };

    const newProjects = projects.filter(p => {
        if (!p.startDate) return false;
        const projectDate = p.startDate.toDate();
        return projectDate >= from && projectDate <= to;
    }).length;

    const newClients = clients.filter(c => {
        if (!c.createdAt) return false;
        const clientDate = c.createdAt.toDate();
        return clientDate >= from && clientDate <= to;
    }).length;

    return {
        projects: newProjects,
        clients: newClients,
    }
}, [projects, clients, date]);
  
  const inventoryStatusData = useMemo(() => {
    const statusCounts = inventory.reduce((acc, item) => {
        if (item.status === 'In Stock') acc.inStock++;
        else if (item.status === 'Low Stock') acc.lowStock++;
        else if (item.status === 'Out of Stock') acc.outOfStock++;
        return acc;
    }, { inStock: 0, lowStock: 0, outOfStock: 0 });

    return [
      { name: 'inStock', value: statusCounts.inStock, fill: 'var(--color-inStock)' },
      { name: 'lowStock', value: statusCounts.lowStock, fill: 'var(--color-lowStock)' },
      { name: 'outOfStock', value: statusCounts.outOfStock, fill: 'var(--color-outOfStock)' },
    ].filter(d => d.value > 0);
  }, [inventory]);

  const employeeDepartmentData = useMemo(() => {
    const departmentCounts = employees.reduce((acc, employee) => {
        const department = employee.department || 'Unassigned';
        acc[department] = (acc[department] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(departmentCounts).map(([name, value], index) => ({
        name: t(`departments.${name.replace(/ /g, '_')}`),
        value,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    })).filter(d => d.value > 0);
  }, [employees, t]);

  const clientStatusData = useMemo(() => {
    const statusCounts = clients.reduce((acc, client) => {
        const status = client.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return [
        { name: 'Lead', value: statusCounts.Lead || 0, fill: 'var(--color-Lead)' },
        { name: 'Active', value: statusCounts.Active || 0, fill: 'var(--color-Active)' },
        { name: 'Inactive', value: statusCounts.Inactive || 0, fill: 'var(--color-Inactive)' },
    ].filter(d => d.value > 0);
}, [clients]);

 const projectFinancialsChartData = useMemo(() => {
    return projects.map(project => {
        const projectExpenses = transactions
            .filter(t => t.projectId === project.id && t.type === 'Expense')
            .reduce((acc, t) => acc + t.amount, 0);
        
        return {
            name: project.name,
            budget: project.budget,
            expense: projectExpenses,
        };
    }).sort((a, b) => b.budget - a.budget);
  }, [projects, transactions]);

  const projectProfitabilityData = useMemo(() => {
    const completedProjects = projects.filter(p => p.status === 'Completed');
    
    return completedProjects.map(project => {
        const projectTransactions = transactions.filter(t => t.projectId === project.id);
        const income = projectTransactions
            .filter(t => t.type === 'Income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expense = projectTransactions
            .filter(t => t.type === 'Expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        return {
            name: project.name,
            income: income,
            expense: expense,
        };
    }).sort((a,b) => (b.income - b.expense) - (a.income - a.expense));
  }, [projects, transactions]);


  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
              {t('reports_page.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('reports_page.desc')}
            </p>
        </div>
        <div className="flex items-center gap-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal md:w-[300px]",
                        !date && "text-muted-foreground"
                    )}
                    disabled={!date}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                        date.to ? (
                        <>
                            {format(date.from, "LLL dd, y", { locale: fnsLocale })} -{" "}
                            {format(date.to, "LLL dd, y", { locale: fnsLocale })}
                        </>
                        ) : (
                        format(date.from, "LLL dd, y", { locale: fnsLocale })
                        )
                    ) : (
                        <span>{t('reports_page.pick_date_range')}</span>
                    )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
      </div>

       <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('reports_page.transactions_in_period')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{filteredTransactions.length}</div>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('reports_page.projects_started')}</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{periodMetrics.projects}</div>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('reports_page.new_clients_acquired')}</CardTitle>
                <Contact className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{periodMetrics.clients}</div>}
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
           <CardHeader>
             <CardTitle>{t('reports_page.income_vs_expense_title')}</CardTitle>
             <CardDescription>{t('reports_page.income_vs_expense_desc')}</CardDescription>
           </CardHeader>
           <CardContent className="pl-2">
             {isLoading ? <Skeleton className="h-[350px] w-full" /> : (
                <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <BarChart data={financialChartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                        dataKey="displayDate"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                    />
                    <YAxis 
                        tickFormatter={(value) => `LE ${(Number(value) / 1000).toLocaleString()}k`}
                    />
                    <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="dot" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
                </BarChart>
                </ChartContainer>
             )}
           </CardContent>
         </Card>
          <Card>
           <CardHeader>
             <CardTitle>{t('reports_page.inventory_status')}</CardTitle>
             <CardDescription>{t('reports_page.inventory_status_desc')}</CardDescription>
           </CardHeader>
           <CardContent className="flex items-center justify-center pl-2">
             {isLoading ? <Skeleton className="h-[250px] w-[250px] rounded-full" /> : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie
                      data={inventoryStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    />
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
             )}
           </CardContent>
         </Card>
          <Card>
           <CardHeader>
             <CardTitle>{t('reports_page.employee_distribution')}</CardTitle>
             <CardDescription>{t('reports_page.employee_distribution_desc')}</CardDescription>
           </CardHeader>
           <CardContent className="flex items-center justify-center pl-2">
             {isLoading ? <Skeleton className="h-[250px] w-[250px] rounded-full" /> : (
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie
                      data={employeeDepartmentData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
             )}
           </CardContent>
         </Card>
          <Card>
           <CardHeader>
             <CardTitle>{t('reports_page.client_status')}</CardTitle>
             <CardDescription>{t('reports_page.client_status_desc')}</CardDescription>
           </CardHeader>
           <CardContent className="flex items-center justify-center pl-2">
             {isLoading ? <Skeleton className="h-[250px] w-[250px] rounded-full" /> : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                    <Pie
                      data={clientStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    />
                    <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                  </PieChart>
                </ChartContainer>
             )}
           </CardContent>
         </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>{t('reports_page.project_budget_vs_actuals')}</CardTitle>
                <CardDescription>
                    {t('reports_page.project_budget_vs_actuals_desc')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                ) : projectFinancialsChartData.length > 0 ? (
                   <ChartContainer config={chartConfig} className="h-[400px] w-full">
                        <BarChart 
                            data={projectFinancialsChartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                angle={-35}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis tickFormatter={(value) => `LE ${(Number(value) / 1000).toLocaleString()}k`} />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="line" />}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Bar dataKey="budget" fill="var(--color-budget)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                        <DollarSign className="size-12" />
                        <p>{t('reports_page.no_project_data')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>{t('reports_page.completed_project_profitability')}</CardTitle>
                <CardDescription>
                    {t('reports_page.completed_project_profitability_desc')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <Skeleton className="h-[400px] w-full" />
                ) : projectProfitabilityData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[400px] w-full">
                        <BarChart 
                            data={projectProfitabilityData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="name"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                                angle={-35}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis tickFormatter={(value) => `LE ${(Number(value) / 1000).toLocaleString()}k`} />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="line" />}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Bar dataKey="income" fill="var(--color-income)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" fill="var(--color-expense)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                        <DollarSign className="size-12" />
                        <p>{t('reports_page.no_completed_projects')}</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
