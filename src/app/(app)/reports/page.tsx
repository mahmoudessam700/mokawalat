
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
} from '@/components/ui/chart';
import { useToast } from '@/hooks/use-toast';
import { firestore } from '@/lib/firebase';
import { collection, onSnapshot, query, type Timestamp } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis, Legend, Label } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
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
} satisfies ChartConfig;

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
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


    // We can set loading to false after a short delay, assuming fetches will be quick
    const timer = setTimeout(() => setIsLoading(false), 1500);
    unsubscribes.push(() => clearTimeout(timer));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);

  const financialData = useMemo(() => {
    const filteredTransactions = transactions.filter(t => {
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

    const totals = filteredTransactions.reduce((acc, t) => {
      if (t.type === 'Income') acc.income += t.amount;
      else if (t.type === 'Expense') acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });

    return [
      { type: 'Income', total: totals.income, fill: 'var(--color-income)' },
      { type: 'Expense', total: totals.expense, fill: 'var(--color-expense)' },
    ];
  }, [transactions, date]);
  
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


  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
            <h1 className="font-headline text-3xl font-bold tracking-tight">
            Reporting &amp; Analytics
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

       <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
         <Card>
           <CardHeader>
             <CardTitle>Financial Overview</CardTitle>
             <CardDescription>A summary of total income and expenses for the selected period.</CardDescription>
           </CardHeader>
           <CardContent className="pl-2">
             {isLoading ? <Skeleton className="h-[250px] w-full" /> : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={financialData} layout="vertical" margin={{ left: 20 }}>
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
                    <Legend/>
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
                    <Legend/>
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
                    <Legend/>
                  </PieChart>
                </ChartContainer>
             )}
           </CardContent>
         </Card>
      </div>
    </div>
  );
}
