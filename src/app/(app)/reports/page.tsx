
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
import { subDays, format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

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


const chartConfig = {
  income: {
    label: 'Income',
    color: 'hsl(var(--chart-2))',
  },
  expense: {
    label: 'Expense',
    color: 'hsl(var(--chart-5))',
  },
  inStock: {
    label: 'In Stock',
    color: 'hsl(var(--chart-2))',
  },
  lowStock: {
    label: 'Low Stock',
    color: 'hsl(var(--chart-4))',
  },
  outOfStock: {
    label: 'Out of Stock',
    color: 'hsl(var(--chart-5))',
  },
  Budget: {
    label: "Budget",
    color: "hsl(var(--chart-1))",
  },
  Expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-3))",
  },
  Income: {
    label: 'Income',
    color: 'hsl(var(--chart-2))',
  },
  Expense: {
    label: 'Expense',
    color: 'hsl(var(--chart-5))',
  },
} satisfies ChartConfig;


export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    
    const qTransactions = query(collection(firestore, 'transactions'));
    unsubscribes.push(onSnapshot(qTransactions, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => {
      console.error("Error fetching transactions: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch financial data.' });
    }));

    const qInventory = query(collection(firestore, 'inventory'));
    unsubscribes.push(onSnapshot(qInventory, (snapshot) => {
      const data: InventoryItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(data);
    }, (error) => {
      console.error("Error fetching inventory: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch inventory data.' });
    }));

    const qEmployees = query(collection(firestore, 'employees'));
    unsubscribes.push(onSnapshot(qEmployees, (snapshot) => {
        const data: Employee[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
        setEmployees(data);
    }, (error) => {
        console.error("Error fetching employees: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch employee data.' });
    }));

    const qClients = query(collection(firestore, 'clients'));
    unsubscribes.push(onSnapshot(qClients, (snapshot) => {
        const data: Client[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(data);
    }, (error) => {
        console.error("Error fetching clients: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch client data.' });
    }));

    const qProjects = query(collection(firestore, 'projects'));
    unsubscribes.push(onSnapshot(qProjects, (snapshot) => {
        const data: Project[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
        setProjects(data);
    }, (error) => {
      console.error("Error fetching projects: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch project data.' });
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
    const totals = filteredTransactions.reduce((acc, t) => {
      if (t.type === 'Income') acc.income += t.amount;
      else if (t.type === 'Expense') acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });

    return [
      { type: 'Income', total: totals.income, fill: 'var(--color-income)' },
      { type: 'Expense', total: totals.expense, fill: 'var(--color-expense)' },
    ];
  }, [filteredTransactions]);

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
      { name: 'In Stock', value: statusCounts.inStock, fill: 'var(--color-inStock)' },
      { name: 'Low Stock', value: statusCounts.lowStock, fill: 'var(--color-lowStock)' },
      { name: 'Out of Stock', value: statusCounts.outOfStock, fill: 'var(--color-outOfStock)' },
    ].filter(d => d.value > 0);
  }, [inventory]);

  const employeeDepartmentData = useMemo(() => {
    const departmentCounts = employees.reduce((acc, employee) => {
        const department = employee.department || 'Unassigned';
        acc[department] = (acc[department] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(departmentCounts).map(([name, value], index) => ({
        name,
        value,
        fill: `hsl(var(--chart-${(index % 5) + 1}))`,
    })).filter(d => d.value > 0);
  }, [employees]);

  const clientStatusData = useMemo(() => {
    const statusCounts = clients.reduce((acc, client) => {
        const status = client.status || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const colors: {[key: string]: string} = {
        Lead: 'hsl(var(--chart-1))',
        Active: 'hsl(var(--chart-2))',
        Inactive: 'hsl(var(--chart-5))',
        Unknown: 'hsl(var(--chart-3))'
    };

    return Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value,
        fill: colors[name],
    })).filter(d => d.value > 0);
}, [clients]);

 const projectFinancialsChartData = useMemo(() => {
    return projects.map(project => {
        const projectExpenses = transactions
            .filter(t => t.projectId === project.id && t.type === 'Expense')
            .reduce((acc, t) => acc + t.amount, 0);
        
        return {
            name: project.name,
            Budget: project.budget,
            Expenses: projectExpenses,
        };
    }).sort((a, b) => b.Budget - a.Budget);
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
            Income: income,
            Expense: expense,
        };
    }).sort((a,b) => (b.Income - b.Expense) - (a.Income - a.Expense));
  }, [projects, transactions]);


  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
            Reporting & Analytics
            </h1>
            <p className="text-muted-foreground">
            Generate and view detailed reports on all business activities.
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
                    >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                        date.to ? (
                        <>
                            {format(date.from, "LLL dd, y")} -{" "}
                            {format(date.to, "LLL dd, y")}
                        </>
                        ) : (
                        format(date.from, "LLL dd, y")
                        )
                    ) : (
                        <span>Pick a date</span>
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
                <CardTitle className="text-sm font-medium">Transactions in Period</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{filteredTransactions.length}</div>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects Started</CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{periodMetrics.projects}</div>}
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Clients Acquired</CardTitle>
                <Contact className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{periodMetrics.clients}</div>}
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
           <CardHeader>
             <CardTitle>Financial Overview</CardTitle>
             <CardDescription>A summary of total income and expenses for the selected period.</CardDescription>
           </CardHeader>
           <CardContent className="pl-2">
             {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={financialChartData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid horizontal={false} />
                    <YAxis
                    dataKey="type"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={10}
                    />
                    <XAxis dataKey="total" type="number" hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <Bar dataKey="total" radius={4} />
                </BarChart>
                </ChartContainer>
             )}
           </CardContent>
         </Card>
          <Card>
           <CardHeader>
             <CardTitle>Inventory Status</CardTitle>
             <CardDescription>The current status of all inventory items.</CardDescription>
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
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
             )}
           </CardContent>
         </Card>
          <Card>
           <CardHeader>
             <CardTitle>Employee Distribution</CardTitle>
             <CardDescription>Breakdown of employees by department.</CardDescription>
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
             <CardTitle>Client Status</CardTitle>
             <CardDescription>A breakdown of clients by their status.</CardDescription>
           </CardHeader>
           <CardContent className="flex items-center justify-center pl-2">
             {isLoading ? <Skeleton className="h-[250px] w-[250px] rounded-full" /> : (
                <ChartContainer config={{}} className="h-[250px] w-full">
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
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
             )}
           </CardContent>
         </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Project Budget vs. Actuals</CardTitle>
                <CardDescription>
                    An overview of budget consumption across all projects. This report includes all expenses ever linked to a project, regardless of the date range selected above.
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
                            <Bar dataKey="Budget" fill="var(--color-Budget)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Expenses" fill="var(--color-Expenses)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                        <DollarSign className="size-12" />
                        <p>No project data available to generate a report.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Completed Project Profitability</CardTitle>
                <CardDescription>
                    An overview of income versus expenses for all completed projects.
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
                            <Bar dataKey="Income" fill="var(--color-Income)" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Expense" fill="var(--color-Expense)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ChartContainer>
                ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
                        <DollarSign className="size-12" />
                        <p>No completed projects with financial data found.</p>
                    </div>
                )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
