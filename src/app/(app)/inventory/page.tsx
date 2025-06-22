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

// Define the inventory item type
type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  warehouse: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

const sampleInventory: InventoryItem[] = [
    { id: '1', name: 'Cement Bags (50kg)', category: 'Building Materials', quantity: 500, warehouse: 'Main Warehouse', status: 'In Stock' },
    { id: '2', name: 'Steel Rebar (12mm)', category: 'Structural Steel', quantity: 150, warehouse: 'Yard A', status: 'Low Stock' },
    { id: '3', name: 'Construction Sand', category: 'Aggregates', quantity: 2000, warehouse: 'Main Warehouse', status: 'In Stock' },
    { id: '4', name: 'Safety Helmets', category: 'Safety Gear', quantity: 0, warehouse: 'Site Office', status: 'Out of Stock' },
    { id: '5', name: 'PVC Pipes (4-inch)', category: 'Plumbing', quantity: 300, warehouse: 'Warehouse B', status: 'In Stock' },
];

const statusVariant: { [key in InventoryItem['status']]: 'secondary' | 'outline' | 'destructive' } = {
  'In Stock': 'secondary',
  'Low Stock': 'outline',
  'Out of Stock': 'destructive',
};


export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>(sampleInventory);
  const [isLoading, setIsLoading] = useState(false); // Will be used for DB fetching
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Track and manage materials, tools, and equipment.
          </p>
        </div>
        <Button>
            <PlusCircle className="mr-2" />
            Add Item
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory List</CardTitle>
          <CardDescription>A list of all items in your inventory.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="hidden md:table-cell">Warehouse</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{item.category}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="hidden md:table-cell">{item.warehouse}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[item.status]}>
                        {item.status}
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
                          <DropdownMenuItem>Adjust Stock</DropdownMenuItem>
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
