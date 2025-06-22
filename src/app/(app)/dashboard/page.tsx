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

  const chartData = [
    { status: 'Planning', projects: 3 },
    { status: 'In Progress', projects: 7 },
    { status: 'Completed', projects: 2 },
    { status: 'On Hold', projects: 1 },
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
              <div className="text-2xl font-bold">{kpi.value}</div>
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
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart accessibilityLayer data={chartData}>
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
