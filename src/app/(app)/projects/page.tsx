
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Dummy data for projects
const projects = [
  {
    id: 'PROJ-001',
    name: 'Al-Rayan Tower Construction',
    status: 'In Progress',
    budget: '$5,000,000',
    startDate: '2023-01-15',
  },
  {
    id: 'PROJ-002',
    name: 'Jeddah Waterfront Development',
    status: 'Planning',
    budget: '$12,000,000',
    startDate: '2023-09-01',
  },
  {
    id: 'PROJ-003',
    name: 'King Salman Bridge',
    status: 'Completed',
    budget: '$25,000,000',
    startDate: '2020-03-10',
  },
  {
    id: 'PROJ-004',
    name: 'Riyadh Metro Line 3',
    status: 'On Hold',
    budget: '$8,500,000',
    startDate: '2022-05-20',
  },
   {
    id: 'PROJ-005',
    name: 'NEOM "The Line" Infrastructure',
    status: 'In Progress',
    budget: '$500,000,000,000',
    startDate: '2021-11-01',
  },
];

type ProjectStatus = 'In Progress' | 'Planning' | 'Completed' | 'On Hold';

const statusVariant: { [key in ProjectStatus]: 'secondary' | 'default' | 'outline' | 'destructive' } = {
  'In Progress': 'secondary',
  'Planning': 'default',
  'Completed': 'outline',
  'On Hold': 'destructive',
};

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Project Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage all construction projects.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2" />
          Add Project
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project List</CardTitle>
          <CardDescription>A list of all projects in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead className="hidden md:table-cell">Start Date</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{project.startDate}</TableCell>
                  <TableCell>{project.budget}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[project.status as ProjectStatus]}>
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                         <DropdownMenuItem>Assign Team</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
