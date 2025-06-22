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
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Define the supplier type
type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
};

// Dummy data for suppliers
const dummySuppliers: Supplier[] = [
  { id: '1', name: 'Al-Foulad Steel Co.', contactPerson: 'Ahmed Saleh', email: 'sales@al-foulad.com', phone: '+966 11 123 4567', status: 'Active' },
  { id: '2', name: 'Modern Concrete Solutions', contactPerson: 'Fatima Ali', email: 'fatima.ali@mcs.com', phone: '+966 12 765 4321', status: 'Active' },
  { id: '3', name: 'Global Equipment Rentals', contactPerson: 'Youssef Mansour', email: 'y.mansour@ger.com', phone: '+966 13 888 9900', status: 'Inactive' },
  { id: '4', name: 'Najran Cement Factory', contactPerson: 'Khalid Abdullah', email: 'k.abdullah@najrancement.com', phone: '+966 14 555 1212', status: 'Active' },
];


export default function SuppliersPage() {
  const [suppliers] = useState<Supplier[]>(dummySuppliers);
  const [isLoading] = useState(false); // Set to false since it's dummy data for now
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Supplier Management
          </h1>
          <p className="text-muted-foreground">
            Manage all your company's suppliers and vendors.
          </p>
        </div>
         <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2" />
            Add Supplier
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier List</CardTitle>
          <CardDescription>A list of all suppliers in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Supplier Name</TableHead>
                <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                    <TableCell>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : suppliers.length > 0 ? (
                suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{supplier.contactPerson}</TableCell>
                    <TableCell className="hidden lg:table-cell">{supplier.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{supplier.phone}</TableCell>
                    <TableCell>
                      <Badge variant={supplier.status === 'Active' ? 'secondary' : 'destructive'}>
                        {supplier.status}
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
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No suppliers found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
