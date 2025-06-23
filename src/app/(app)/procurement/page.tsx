
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CheckCircle2, ClipboardCheck, Loader2, MoreHorizontal, PlusCircle, Send, Trash2, XCircle, Search } from 'lucide-react';
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
  DialogFooter,
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
import { addPurchaseRequest, deletePurchaseRequest, updatePurchaseRequest, markPOAsReceived, updatePurchaseRequestStatus } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';

type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Ordered' | 'Received';

type PurchaseOrder = {
  id: string;
  itemName: string;
  itemId: string;
  quantity: number;
  supplierId: string;
  projectId: string;
  totalCost: number;
  status: RequestStatus;
  requestedAt: Timestamp;
};

type Project = { id: string; name: string; };
type Supplier = { id: string; name: string; rating?: number; };
type InventoryItem = { id: string; name: string };

const statusVariant: { [key in RequestStatus]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Pending: 'default',
  Approved: 'secondary',
  Ordered: 'outline',
  Received: 'secondary',
  Rejected: 'destructive',
};

const procurementFormSchema = z.object({
  itemId: z.string().min(1, "Item is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitCost: z.coerce.number().min(0, "Unit cost must be a non-negative number."),
  supplierId: z.string().min(1, "Supplier is required."),
  projectId: z.string().min(1, "Project is required."),
});

type ProcurementFormValues = z.infer<typeof procurementFormSchema>;

const requestStatuses: RequestStatus[] = ['Pending', 'Approved', 'Rejected', 'Ordered', 'Received'];

const renderRating = (rating?: number) => {
  if (!rating || rating === 0) return '';
  const filledStars = '★'.repeat(rating);
  const emptyStars = '☆'.repeat(5 - rating);
  return ` ${filledStars}${emptyStars}`;
};

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
    });
    return `LE ${formatter.format(value)}`;
};

export default function ProcurementPage() {
  const [requests, setRequests] = useState<PurchaseOrder[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState<PurchaseOrder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');

  useEffect(() => {
    const qRequests = query(collection(firestore, 'procurement'), orderBy('requestedAt', 'desc'));
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      const data: PurchaseOrder[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as PurchaseOrder);
      });
      setRequests(data);
      setIsLoading(false);
    });

    const qProjects = query(collection(firestore, 'projects'), orderBy('name', 'asc'));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    const qSuppliers = query(collection(firestore, 'suppliers'), orderBy('name', 'asc'));
    const unsubscribeSuppliers = onSnapshot(qSuppliers, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });

    const qInventory = query(collection(firestore, 'inventory'), orderBy('name', 'asc'));
    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
        setInventoryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });

    return () => {
      unsubscribeRequests();
      unsubscribeProjects();
      unsubscribeSuppliers();
      unsubscribeInventory();
    };
  }, []);

  const projectNames = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);
  const supplierNames = useMemo(() => new Map(suppliers.map(s => [s.id, s.name])), [suppliers]);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || req.itemName.toLowerCase().includes(lowercasedTerm);
        const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
        const matchesProject = projectFilter === 'All' || req.projectId === projectFilter;
        const matchesSupplier = supplierFilter === 'All' || req.supplierId === supplierFilter;
        return matchesSearch && matchesStatus && matchesProject && matchesSupplier;
    });
  }, [requests, searchTerm, statusFilter, projectFilter, supplierFilter]);

  const form = useForm<ProcurementFormValues>({
    resolver: zodResolver(procurementFormSchema),
    defaultValues: {
      itemId: '',
      quantity: 1,
      unitCost: 0,
      supplierId: '',
      projectId: '',
    },
  });

  const watchedQuantity = form.watch('quantity');
  const watchedUnitCost = form.watch('unitCost');
  const totalCost = useMemo(() => watchedQuantity * watchedUnitCost, [watchedQuantity, watchedUnitCost]);

  useEffect(() => {
    if (requestToEdit) {
      form.reset(requestToEdit);
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [requestToEdit, form]);

  async function onSubmit(values: ProcurementFormValues) {
    const result = requestToEdit
        ? await updatePurchaseRequest(requestToEdit.id, values)
        : await addPurchaseRequest(values);

    if (result.errors) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      setIsDialogOpen(false);
      setRequestToEdit(null);
    }
  }

  async function handleDeleteRequest() {
    if (!requestToDelete) return;

    setIsDeleting(true);
    const result = await deletePurchaseRequest(requestToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsDeleteDialogOpen(false);
    setRequestToDelete(null);
  }
  
  async function handleStatusUpdate(id: string, status: 'Approved' | 'Rejected' | 'Ordered') {
    const result = await updatePurchaseRequestStatus(id, status);
    if (result.success) {
        toast({ title: 'Success', description: result.message });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }

  async function handleMarkAsReceived(id: string) {
    const result = await markPOAsReceived(id);
    if (result.success) {
        toast({ title: 'Success', description: result.message });
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }

  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) {
      setRequestToEdit(null);
    }
    setIsDialogOpen(open);
  }

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Purchase Order Management</h1>
          <p className="text-muted-foreground">Create and track all purchase orders for materials.</p>
        </div>
        {profile?.role === 'admin' && (
            <Dialog open={isDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setRequestToEdit(null)}>
                <PlusCircle className="mr-2" />
                Create Purchase Order
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>{requestToEdit ? 'Edit Purchase Order' : 'New Purchase Order'}</DialogTitle>
                <DialogDescription>
                    {requestToEdit ? "Update the details of the purchase order." : "Fill in the details to create a new purchase order."}
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="itemId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Item</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an inventory item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {inventoryItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 10" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                        control={form.control}
                        name="unitCost"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Unit Cost (LE)</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="e.g., 150.50" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                         <FormItem>
                            <FormLabel>Total Cost (LE)</FormLabel>
                            <FormControl>
                                <Input type="text" readOnly value={formatCurrency(totalCost)} className="font-semibold bg-muted" />
                            </FormControl>
                        </FormItem>
                    </div>
                    <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a supplier" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {suppliers.map(supplier => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                    {supplier.name}{renderRating(supplier.rating)}
                                </SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a project" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            {projects.map(project => (
                                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                            ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                        ) : (
                        requestToEdit ? 'Save Changes' : 'Submit Order'
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
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>A list of all purchase orders in the system.</CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search by item name..."
                  className="w-full pl-8 md:w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  {requestStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Suppliers</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="hidden md:table-cell">Total Cost</TableHead>
                <TableHead className="hidden md:table-cell">Supplier</TableHead>
                <TableHead className="hidden lg:table-cell">Project</TableHead>
                <TableHead className="hidden md:table-cell">Requested On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px] rounded-full" /></TableCell>
                    <TableCell><Button aria-haspopup="true" size="icon" variant="ghost" disabled><MoreHorizontal className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">{request.itemName}</TableCell>
                    <TableCell>{request.quantity}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatCurrency(request.totalCost)}</TableCell>
                    <TableCell className="hidden md:table-cell">{supplierNames.get(request.supplierId) || 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{projectNames.get(request.projectId) || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{request.requestedAt ? format(request.requestedAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell><Badge variant={statusVariant[request.status]}>{request.status}</Badge></TableCell>
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
                           <DropdownMenuItem asChild>
                              <Link href={`/procurement/${request.id}`}>View Details</Link>
                            </DropdownMenuItem>
                          {profile?.role === 'admin' && (
                            <>
                              <DropdownMenuSeparator />
                              {request.status === 'Pending' && (
                                <>
                                  <DropdownMenuItem onSelect={() => handleStatusUpdate(request.id, 'Approved')}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onSelect={() => handleStatusUpdate(request.id, 'Rejected')}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {request.status === 'Approved' && (
                                <DropdownMenuItem onSelect={() => handleStatusUpdate(request.id, 'Ordered')}>
                                  <Send className="mr-2 h-4 w-4" />
                                  Mark as Ordered
                                </DropdownMenuItem>
                              )}
                              {request.status === 'Ordered' && (
                                <DropdownMenuItem onSelect={() => handleMarkAsReceived(request.id)}>
                                    <ClipboardCheck className="mr-2 h-4 w-4" />
                                    Mark as Received
                                </DropdownMenuItem>
                              )}
                              
                              {(request.status === 'Pending' || request.status === 'Approved') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => {
                                    setRequestToEdit(request);
                                    setIsDialogOpen(true);
                                  }}>Edit</DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={() => {
                                      setRequestToDelete(request);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {requests.length > 0 ? "No purchase orders match the current filters." : "No purchase orders found. Create one to get started."}
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
                    This action cannot be undone. This will permanently delete the purchase order for "{requestToDelete?.itemName}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRequestToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteRequest}
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
