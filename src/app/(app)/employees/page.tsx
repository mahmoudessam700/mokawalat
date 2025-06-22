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

const employees = [
  {
    name: 'Ahmed Ali',
    email: 'ahmed.ali@example.com',
    role: 'Project Manager',
    department: 'Engineering',
    status: 'Active',
  },
  {
    name: 'Fatima Zahra',
    email: 'fatima.zahra@example.com',
    role: 'HR Specialist',
    department: 'Human Resources',
    status: 'Active',
  },
  {
    name: 'Youssef Ibrahim',
    email: 'youssef.ibrahim@example.com',
    role: 'Accountant',
    department: 'Finance',
    status: 'On Leave',
  },
  {
    name: 'Layla Hassan',
    email: 'layla.hassan@example.com',
    role: 'Civil Engineer',
    department: 'Engineering',
    status: 'Active',
  },
  {
    name: 'Omar Abdullah',
    email: 'omar.abdullah@example.com',
    role: 'Procurement Officer',
    department: 'Procurement',
    status: 'Inactive',
  },
];

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Employee Management
          </h1>
          <p className="text-muted-foreground">
            View, add, and manage all company employees.
          </p>
        </div>
        <Button>
          <PlusCircle className="mr-2" />
          Add Employee
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>A list of all employees in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.email}>
                  <TableCell className="font-medium">{employee.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{employee.email}</TableCell>
                  <TableCell>{employee.role}</TableCell>
                  <TableCell className="hidden md:table-cell">{employee.department}</TableCell>
                  <TableCell>
                    <Badge variant={employee.status === 'Active' ? 'secondary' : employee.status === 'On Leave' ? 'outline' : 'destructive'}>
                      {employee.status}
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
