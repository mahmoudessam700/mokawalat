
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Briefcase,
  Users,
  Warehouse,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Contact,
  Bell,
  FileText,
  ShoppingCart,
  ClipboardList,
  Truck,
  Wrench,
  AlertCircle,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type Timestamp,
  limit,
  orderBy,
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth, formatDistanceToNow, addDays, isPast } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';

// Simplified types for dashboard calculations
type Project = { status: 'Planning' | 'In Progress' | 'Completed' | 'On Hold' };
type Transaction = {
  type: 'Income' | 'Expense';
  amount: number;
  date: Timestamp;
};
type ProcurementRequest = {
  itemName: string;
  quantity: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Ordered' | 'Received';
};
type InventoryItem = {
  id: string;
  name: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};
type MaterialRequest = {
  itemName: string;
  projectId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};
type PendingTask = {
  id: string;
  title: string;
  type: string;
  link: string;
};
type Activity = {
  id: string;
  message: string;
  type: string;
  link: string;
  timestamp: Timestamp;
};
type Asset = {
    id: string;
    name: string;
    nextMaintenanceDate: Timestamp;
};


const formatCurrency = (value: number) => {
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  return `LE ${formatter.format(value)}`;
};

const activityIcons: { [key: string]: React.ReactNode } = {
  PROJECT_CREATED: <Briefcase className="size-4" />,
  CLIENT_ADDED: <Contact className="size-4" />,
  EMPLOYEE_HIRED: <Users className="size-4" />,
  TRANSACTION_ADDED: <DollarSign className="size-4" />,
  SUPPLIER_ADDED: <Truck className="size-4" />,
  INVENTORY_ADDED: <Warehouse className="size-4" />,
  PO_CREATED: <ShoppingCart className="size-4" />,
  CONTRACT_ADDED: <FileText className="size-4" />,
  MATERIAL_REQUESTED: <ClipboardList className="size-4" />,
  DEFAULT: <Bell className="size-4" />,
};


export default function DashboardPage() {
  const [projectCount, setProjectCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [clientCount, setClientCount] = useState(0);
  const [supplierCount, setSupplierCount] = useState(0);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [monthlyFinancials, setMonthlyFinancials] = useState({
    revenue: 0,
    expenses: 0,
  });
  const [projectStatusData, setProjectStatusData] = useState<any[]>([]);
  const [procurementTasks, setProcurementTasks] = useState<PendingTask[]>([]);
  const [inventoryTasks, setInventoryTasks] = useState<PendingTask[]>([]);
  const [materialRequestTasks, setMaterialRequestTasks] = useState<PendingTask[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [maintenanceTasks, setMaintenanceTasks] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { t, locale } = useLanguage();

  const fnsLocale = useMemo(() => (locale === 'ar' ? ar : enUS), [locale]);

  const pendingTasks = useMemo(
    () => [...procurementTasks, ...inventoryTasks, ...materialRequestTasks],
    [procurementTasks, inventoryTasks, materialRequestTasks]
  );
  const netBalance = useMemo(
    () => monthlyFinancials.revenue - monthlyFinancials.expenses,
    [monthlyFinancials]
  );

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const qProjects = query(collection(firestore, 'projects'));
    unsubscribes.push(
      onSnapshot(qProjects, (snapshot) => {
        setProjectCount(
          snapshot.docs.filter(
            (doc) => (doc.data() as Project).status === 'In Progress'
          ).length
        );
        const statusCounts = snapshot.docs
          .map((doc) => doc.data() as Project)
          .reduce(
            (acc, project) => {
              acc[project.status] = (acc[project.status] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          );

        const chartData = [
          { status: t('project_status_planning'), projects: statusCounts['Planning'] || 0 },
          {
            status: t('project_status_in_progress'),
            projects: statusCounts['In Progress'] || 0,
          },
          { status: t('project_status_completed'), projects: statusCounts['Completed'] || 0 },
          { status: t('project_status_on_hold'), projects: statusCounts['On Hold'] || 0 },
        ];
        setProjectStatusData(chartData);
      })
    );

    const qEmployees = query(collection(firestore, 'employees'));
    unsubscribes.push(
      onSnapshot(qEmployees, (snapshot) => {
        setEmployeeCount(snapshot.size);
      })
    );

    const qClients = query(collection(firestore, 'clients'));
    unsubscribes.push(
        onSnapshot(qClients, (snapshot) => {
            setClientCount(snapshot.size);
        })
    );

    const qSuppliers = query(collection(firestore, 'suppliers'));
    unsubscribes.push(
        onSnapshot(qSuppliers, (snapshot) => {
            setSupplierCount(snapshot.size);
        })
    );

    const qAssets = query(collection(firestore, 'assets'));
    unsubscribes.push(
        onSnapshot(qAssets, (snapshot) => {
            setAssetCount(snapshot.size);
        })
    );

    const qInventory = query(collection(firestore, 'inventory'));
    unsubscribes.push(
      onSnapshot(qInventory, (snapshot) => {
        setInventoryCount(snapshot.size);
        const lowStockTasks = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() } as InventoryItem))
          .filter((item) => item.status === 'Low Stock')
          .map((item) => ({
            id: item.id,
            title: `Low stock for "${item.name}"`,
            type: 'Inventory',
            link: '/inventory',
          }));
        setInventoryTasks(lowStockTasks);
      })
    );

    // Fetch all transactions and filter client-side to avoid composite index requirement
    const qTransactions = query(collection(firestore, 'transactions'));
    unsubscribes.push(
      onSnapshot(qTransactions, (snapshot) => {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);
        const monthlyTotals = snapshot.docs
          .map((doc) => doc.data() as Transaction)
          .filter((transaction) => {
            if (
              !transaction.date ||
              typeof transaction.date.toDate !== 'function'
            ) {
              return false;
            }
            const transactionDate = transaction.date.toDate();
            return transactionDate >= start && transactionDate <= end;
          })
          .reduce(
            (acc, transaction) => {
              if (transaction.type === 'Income') {
                acc.revenue += transaction.amount;
              } else {
                acc.expenses += transaction.amount;
              }
              return acc;
            },
            { revenue: 0, expenses: 0 }
          );
        setMonthlyFinancials(monthlyTotals);
      })
    );

    const qProcurement = query(
      collection(firestore, 'procurement'),
      where('status', '==', 'Pending')
    );
    unsubscribes.push(
      onSnapshot(qProcurement, (snapshot) => {
        const tasks = snapshot.docs.map((doc) => {
          const data = doc.data() as ProcurementRequest;
          return {
            id: doc.id,
            title: `PO for ${data.quantity}x ${data.itemName}`,
            type: 'Purchase Order',
            link: `/procurement/${doc.id}`,
          };
        });
        setProcurementTasks(tasks);
      })
    );
    
    const qMaterialRequests = query(
      collection(firestore, 'materialRequests'),
      where('status', '==', 'Pending')
    );
    unsubscribes.push(
      onSnapshot(qMaterialRequests, (snapshot) => {
        const tasks = snapshot.docs.map((doc) => {
          const data = doc.data() as MaterialRequest;
          return {
            id: doc.id,
            title: `Material request for "${data.itemName}"`,
            type: 'Project Request',
            link: '/material-requests',
          };
        });
        setMaterialRequestTasks(tasks);
      })
    );

    const qActivities = query(collection(firestore, 'activityLog'), orderBy('timestamp', 'desc'), limit(5));
    unsubscribes.push(onSnapshot(qActivities, (snapshot) => {
        const activitiesData: Activity[] = [];
        snapshot.forEach(doc => {
            activitiesData.push({ id: doc.id, ...doc.data() } as Activity);
        });
        setRecentActivities(activitiesData);
    }));

    const qMaintenanceAssets = query(collection(firestore, 'assets'), where('nextMaintenanceDate', '!=', null), orderBy('nextMaintenanceDate', 'asc'));
    unsubscribes.push(onSnapshot(qMaintenanceAssets, (snapshot) => {
        const now = new Date();
        const thirtyDaysFromNow = addDays(now, 30);
        const maintenance = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Asset))
            .filter(asset => {
                const maintenanceDate = asset.nextMaintenanceDate.toDate();
                return isPast(maintenanceDate) || (maintenanceDate >= now && maintenanceDate <= thirtyDaysFromNow);
            });
        setMaintenanceTasks(maintenance);
    }));


    const timer = setTimeout(() => setIsLoading(false), 1500);
    unsubscribes.push(() => clearTimeout(timer));

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [t]);

  const chartConfig = {
    projects: {
      label: t('projects_chart_label'),
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">
        {t('dashboard_title')}
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('active_projects')}</CardTitle>
            <Briefcase className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{projectCount}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_employees')}</CardTitle>
            <Users className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{employeeCount}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_clients')}</CardTitle>
            <Contact className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{clientCount}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_suppliers')}</CardTitle>
            <Truck className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{supplierCount}</div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-success/10 border-success">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('monthly_revenue')}
            </CardTitle>
            <TrendingUp className="size-5 text-success" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-success">
                {formatCurrency(monthlyFinancials.revenue)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('monthly_expenses')}
            </CardTitle>
            <TrendingDown className="size-5 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(monthlyFinancials.expenses)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('net_balance')}</CardTitle>
            <DollarSign
              className={cn(
                'size-5 text-muted-foreground',
                netBalance >= 0 ? 'text-success' : 'text-destructive'
              )}
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div
                className={cn(
                  'text-2xl font-bold',
                  netBalance >= 0 ? 'text-success' : 'text-destructive'
                )}
              >
                {formatCurrency(netBalance)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_assets')}</CardTitle>
            <Wrench className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{assetCount}</div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('project_status_overview')}</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
            <CardTitle>{t('pending_tasks')}</CardTitle>
            <CardDescription>
              {pendingTasks.length > 0
                ? t('pending_tasks_desc').replace('{count}', pendingTasks.length.toString())
                : t('pending_tasks_desc_none')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : pendingTasks.length > 0 ? (
              <div className="space-y-4">
                {pendingTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between"
                  >
                    <div>
                      <p className="font-semibold">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.type}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="outline">
                      <Link href={task.link}>{t('view')}</Link>
                    </Button>
                  </div>
                ))}
                {pendingTasks.length > 5 && (
                  <p className="text-sm text-muted-foreground pt-2">
                    {t('and_x_more').replace('{count}', (pendingTasks.length - 5).toString())}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex h-24 flex-col items-center justify-center text-center">
                <p className="text-sm text-muted-foreground">
                  {t('no_pending_tasks')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('upcoming_maintenance')}</CardTitle>
            <CardDescription>
                {t('upcoming_maintenance_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : maintenanceTasks.length > 0 ? (
                <div className="space-y-4">
                    {maintenanceTasks.slice(0, 5).map((asset) => {
                        const isOverdue = isPast(asset.nextMaintenanceDate.toDate());
                        return (
                           <div key={asset.id} className="flex items-center justify-between">
                                <div>
                                    <Link href={`/assets/${asset.id}`} className="font-semibold hover:underline">{asset.name}</Link>
                                    <p className={cn("text-sm", isOverdue ? 'text-destructive' : 'text-muted-foreground')}>
                                        {formatDistanceToNow(asset.nextMaintenanceDate.toDate(), { addSuffix: true, locale: fnsLocale })}
                                    </p>
                                </div>
                                <AlertCircle className={cn('size-5', isOverdue ? 'text-destructive' : 'text-yellow-500')} />
                            </div>
                        )
                    })}
                    {maintenanceTasks.length > 5 && (
                        <p className="text-sm text-muted-foreground pt-2">
                            {t('and_x_more').replace('{count}', (maintenanceTasks.length - 5).toString())}
                        </p>
                    )}
                </div>
            ) : (
                 <div className="flex h-24 flex-col items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('no_upcoming_maintenance')}
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('recent_activity')}</CardTitle>
            <CardDescription>
              {t('recent_activity_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-[300px]" />
                        <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivities.length > 0 ? (
              <div className="space-y-6">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {activityIcons[activity.type] || activityIcons.DEFAULT}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground">
                        <Link href={activity.link} className="hover:underline">
                          {t('view_details')}
                        </Link>{' '}
                        &middot;{' '}
                        {activity.timestamp ? formatDistanceToNow(activity.timestamp.toDate(), {
                          addSuffix: true,
                          locale: fnsLocale,
                        }) : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-24 flex-col items-center justify-center text-center">
                <FileText className="size-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('no_recent_activity')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
