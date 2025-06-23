
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
import { Loader2, MoreHorizontal, PlusCircle, Search, Trash2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect, useMemo } from 'react';
import { addInventoryItem, deleteInventoryItem, updateInventoryItem } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { AdjustStockDialog } from './adjust-stock-dialog';
import { useAuth } from '@/hooks/use-auth';

// Define the inventory item type
type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  warehouse: string;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
};

type Category = {
  id: string;
  name: string;
};

type Warehouse = {
    id: string;
    name: string;
};

const inventoryFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.'),
  category: z.string().min(1, 'Category is required.'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative.'),
  warehouse: z.string().min(1, 'Warehouse is required.'),
  status: z.enum(['In Stock', 'Low Stock', 'Out of Stock']),
});

type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<InventoryItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];
    
    const qItems = query(
      collection(firestore, 'inventory'),
      orderBy('name', 'asc')
    );
    unsubscribes.push(onSnapshot(
      qItems,
      (querySnapshot) => {
        const itemsData: InventoryItem[] = [];
        querySnapshot.forEach((doc) => {
          itemsData.push({ id: doc.id, ...doc.data() } as InventoryItem);
        });
        setItems(itemsData);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching inventory:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch inventory. Check permissions.',
        });
        setIsLoading(false);
      }
    ));

    const qCategories = query(collection(firestore, 'inventoryCategories'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qCategories, (snapshot) => {
        const categoriesData: Category[] = [];
        snapshot.forEach((doc) => {
            categoriesData.push({ id: doc.id, name: doc.data().name } as Category);
        });
        setCategories(categoriesData);
    }, (error) => {
        console.error('Error fetching categories:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load inventory categories.',
        });
    }));

    const qWarehouses = query(collection(firestore, 'warehouses'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qWarehouses, (snapshot) => {
        const warehousesData: Warehouse[] = [];
        snapshot.forEach((doc) => {
            warehousesData.push({ id: doc.id, name: doc.data().name } as Warehouse);
        });
        setWarehouses(warehousesData);
    }, (error) => {
        console.error('Error fetching warehouses:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load warehouses.',
        });
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [toast]);
  
  const filteredItems = useMemo(() => {
    return items.filter(item => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || item.name.toLowerCase().includes(lowercasedTerm);
        const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
        const matchesWarehouse = warehouseFilter === 'All' || item.warehouse === warehouseFilter;
        const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
        return matchesSearch && matchesCategory && matchesWarehouse && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, warehouseFilter, statusFilter]);

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      name: '',
      category: '',
      quantity: 0,
      warehouse: '',
      status: 'In Stock',
    },
  });

  useEffect(() => {
    if (itemToEdit) {
      form.reset(itemToEdit);
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [itemToEdit, form]);

  async function onSubmit(values: InventoryFormValues) {
    const result = itemToEdit
        ? await updateInventoryItem(itemToEdit.id, values)
        : await addInventoryItem(values);

    if (result.errors) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    } else {
      toast({
        title: 'Success',
        description: result.message,
      });
      setIsDialogOpen(false);
      setItemToEdit(null);
    }
  }

  async function handleDeleteItem() {
    if (!itemToDelete) return;

    setIsDeleting(true);
    const result = await deleteInventoryItem(itemToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      toast({
        title: 'Success',
        description: result.message,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message,
      });
    }
    setIsDeleteDialogOpen(false);
    setItemToDelete(null);
  }
  
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) {
      setItemToEdit(null);
    }
    setIsDialogOpen(open);
  }

  return (
    <>
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
        {profile?.role === 'admin' && (
            <Dialog open={isDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setItemToEdit(null)}>
                <PlusCircle className="mr-2" />
                Add Item
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>{itemToEdit ? 'Edit Item' : 'Add New Inventory Item'}</DialogTitle>
                <DialogDescription>
                    {itemToEdit ? "Update the item's details below." : 'Fill in the details below to add a new item to the inventory.'}
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4 py-4"
                >
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Item Name</FormLabel>
                        <FormControl>
                            <Input
                            placeholder="e.g., Cement Bags (50kg)"
                            {...field}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.length > 0 ? (
                                categories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.name}>
                                    {cat.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="disabled" disabled>No categories found</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                            <Input
                                type="number"
                                placeholder="e.g., 500"
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="warehouse"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Warehouse</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value}
                            >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a warehouse" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {warehouses.length > 0 ? (
                                        warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.name}>
                                            {w.name}
                                            </SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="disabled" disabled>No warehouses configured</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </div>
                    <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                            onValueChange={field.onChange}
                            value={field.value}
                        >
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="In Stock">In Stock</SelectItem>
                            <SelectItem value="Low Stock">Low Stock</SelectItem>
                            <SelectItem value="Out of Stock">
                                Out of Stock
                            </SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                        ) : (
                        itemToEdit ? 'Save Changes' : 'Save Item'
                        )}
                    </Button>
                    </DialogFooter>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <CardTitle>Inventory List</CardTitle>
                <CardDescription>A list of all items in your inventory.</CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by name..."
                    className="w-full pl-8 md:w-[200px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Categories</SelectItem>
                        {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                    <SelectTrigger className="w-full md:w-[180px]">
                        <SelectValue placeholder="Filter by warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Warehouses</SelectItem>
                        {warehouses.map(w => (
                            <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-[150px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="In Stock">In Stock</SelectItem>
                        <SelectItem value="Low Stock">Low Stock</SelectItem>
                        <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    </SelectContent>
                </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="hidden md:table-cell">
                  Warehouse
                </TableHead>
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
                    <TableCell>
                      <Skeleton className="h-4 w-[200px]" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-[150px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[80px]" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-4 w-[120px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-[100px] rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                        disabled
                      >
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.category}
                    </TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.warehouse}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === 'Low Stock'
                            ? 'outline'
                            : item.status === 'Out of Stock'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {profile?.role === 'admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-haspopup="true"
                              size="icon"
                              variant="ghost"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => {
                              setItemToEdit(item);
                              setIsDialogOpen(true);
                            }}>Edit</DropdownMenuItem>
                            <AdjustStockDialog item={item}>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                  Adjust Stock
                              </DropdownMenuItem>
                            </AdjustStockDialog>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={() => {
                                setItemToDelete(item);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {items.length > 0 ? "No items match the current filters." : "No items found. Add one to get started."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the item "{itemToDelete?.name}" from your inventory.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setItemToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteItem}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}

    