import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Users, Warehouse, DollarSign } from 'lucide-react';

export default function DashboardPage() {
  const kpis = [
    {
      title: 'Active Projects',
      value: '12',
      icon: <Briefcase className="size-6 text-muted-foreground" />,
    },
    {
      title: 'Total Employees',
      value: '150',
      icon: <Users className="size-6 text-muted-foreground" />,
    },
    {
      title: 'Inventory Items',
      value: '2,345',
      icon: <Warehouse className="size-6 text-muted-foreground" />,
    },
    {
      title: 'Monthly Revenue',
      value: '$1.2M',
      icon: <DollarSign className="size-6 text-muted-foreground" />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-headline text-3xl font-bold tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              {kpi.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">No recent activity to display.</p>
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
