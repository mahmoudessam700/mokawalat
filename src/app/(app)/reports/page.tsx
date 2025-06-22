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
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

// Types from other modules
type TransactionType = 'Income' | 'Expense';
type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
};
type InventoryItem = {
  id:string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const qTransactions = query(collection(firestore, 'transactions'));
    const unsubscribeTransactions = onSnapshot(qTransactions, (snapshot) => {
      const data: Transaction[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(data);
    }, (error) => {
      console.error("Error fetching transactions: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch financial data.' });
    });

    const qInventory = query(collection(firestore, 'inventory'));
    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
      const data: InventoryItem[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setInventory(data);
    }, (error) => {
      console.error("Error fetching inventory: ", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch inventory data.' });
    });

    // We can set loading to false after a short delay, assuming fetches will be quick
    const timer = setTimeout(() => setIsLoading(false), 1500);

    return () => {
      unsubscribeTransactions();
      unsubscribeInventory();
      clearTimeout(timer);
    };
  }, [toast]);

  const financialData = useMemo(() => {
    const totals = transactions.reduce((acc, t) => {
      if (t.type === 'Income') acc.income += t.amount;
      else if (t.type === 'Expense') acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });

    return [
      { type: 'Income', total: totals.income, fill: 'var(--color-income)' },
      { type: 'Expense', total: totals.expense, fill: 'var(--color-expense)' },
    ];
  }, [transactions]);
  
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


  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Reporting & Analytics
        </h1>
        <p className="text-muted-foreground">
          Generate and view detailed reports on all business activities.
        </p>
      </div>

       <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
         <Card>
           <CardHeader>
             <CardTitle>Financial Overview</CardTitle>
             <CardDescription>A summary of total income and expenses.</CardDescription>
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
                      outerRadius={100}
                    />
                  </PieChart>
                </ChartContainer>
             )}
           </CardContent>
         </Card>
      </div>
    </div>
  );
}
