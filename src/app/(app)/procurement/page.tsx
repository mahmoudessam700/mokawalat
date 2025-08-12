
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
import { useLanguage } from '@/hooks/use-language';
import { OrderPoDialog } from './order-po-dialog';


type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Ordered' | 'Received';

type PurchaseOrder = {
  id: string;
  itemName: string;
  itemId: string;
  quantity: number;
  supplierId: string;
  projectId: string;
  unitCost: number;
  totalCost: number;
  status: RequestStatus;
  requestedAt: Timestamp;
};

type Project = { id: string; name: string; };
type Supplier = { id: string; name: string; rating?: number; };
type InventoryItem = { id: string; name: string };
type Account = { id: string; name: string };

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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [requestToEdit, setRequestToEdit] = useState<PurchaseOrder | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<PurchaseOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [projectFilter, setProjectFilter] = useState('All');
  const [supplierFilter, setSupplierFilter] = useState('All');

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const qRequests = query(collection(firestore, 'procurement'), orderBy('requestedAt', 'desc'));
    unsubscribes.push(onSnapshot(qRequests, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchaseOrder)));
      setIsLoading(false);
    }));

    const qProjects = query(collection(firestore, 'projects'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qProjects, (snapshot) => {
      setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    }));

    const qSuppliers = query(collection(firestore, 'suppliers'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qSuppliers, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    }));

    const qInventory = query(collection(firestore, 'inventory'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qInventory, (snapshot) => {
        setInventoryItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    }));
    
    const qAccounts = query(collection(firestore, 'accounts'), orderBy('name', 'asc'));
    unsubscribes.push(onSnapshot(qAccounts, (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account)));
    }));

    return () => unsubscribes.forEach(unsub => unsub());
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
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
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
      toast({ title: t('success'), description: result.message });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
    setIsDeleteDialogOpen(false);
    setRequestToDelete(null);
  }
  
  async function handleStatusUpdate(id: string, status: 'Approved' | 'Rejected') {
    const result = await updatePurchaseRequestStatus(id, status);
    if (result.success) {
        toast({ title: t('success'), description: result.message });
    } else {
        toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
  }

  async function handleMarkAsReceived(id: string) {
    const result = await markPOAsReceived(id);
    if (result.success) {
        toast({ title: t('success'), description: result.message });
    } else {
        toast({ variant: 'destructive', title: t('error'), description: result.message });
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
          <h1 className="font-headline text-3xl font-bold tracking-tight">{t('procurement.page_title')}</h1>
          <p className="text-muted-foreground">{t('procurement.page_desc')}</p>
        </div>
        {profile?.role === 'admin' && (
            <Dialog open={isDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setRequestToEdit(null)}>
                <PlusCircle className="mr-2" />
                {t('procurement.create_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>{requestToEdit ? t('procurement.edit_title') : t('procurement.add_title')}</DialogTitle>
                <DialogDescription>
                    {requestToEdit ? t('procurement.edit_desc') : t('procurement.add_desc')}
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField
                      control={form.control}
                      name="itemId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('item')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('procurement.item_placeholder')} />
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
                        <FormLabel>{t('inventory.quantity_label')}</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder={t('inventory.quantity_placeholder')} {...field} />
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
                            <FormLabel>{t('procurement.unit_cost_label')}</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder={t('procurement.unit_cost_placeholder')} {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                         <FormItem>
                            <FormLabel>{t('procurement.total_cost_label')}</FormLabel>
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
                        <FormLabel>{t('supplier')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={t('procurement.supplier_placeholder')} />
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
                        <FormLabel>{t('project')}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={t('procurement.project_placeholder')} />
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
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</>
                        ) : (
                        requestToEdit ? t('save_changes') : t('procurement.submit_button')
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
              <CardTitle>{t('purchase_orders')}</CardTitle>
              <CardDescription>{t('procurement.list_desc')}</CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('procurement.search_placeholder')}
                  className="w-full pl-8 md:w-[200px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder={t('clients.filter_by_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('clients.all_statuses')}</SelectItem>
                  {requestStatuses.map(status => (
                    <SelectItem key={status} value={status}>{t(`procurement.status.${status}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t('procurement.filter_by_project')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('procurement.all_projects')}</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
               <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t('procurement.filter_by_supplier')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('procurement.all_suppliers')}</SelectItem>
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
                <TableHead>{t('item')}</TableHead>
                <TableHead>{t('inventory.quantity_label')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('procurement.total_cost_header')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('supplier')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('project')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('procurement.requested_on')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead><span className="sr-only">{t('actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[50px]" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[100px]" /></TableCell>
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
                    <TableCell className="hidden lg:table-cell">{formatCurrency(request.totalCost)}</TableCell>
                    <TableCell className="hidden md:table-cell">{supplierNames.get(request.supplierId) || 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{projectNames.get(request.projectId) || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{request.requestedAt ? format(request.requestedAt.toDate(), 'PPP') : 'N/A'}</TableCell>
                    <TableCell><Badge variant={statusVariant[request.status]}>{t(`procurement.status.${request.status}`)}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t('toggle_menu')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                           <DropdownMenuItem asChild>
                              <Link href={`/procurement/${request.id}`}>{t('view_details')}</Link>
                            </DropdownMenuItem>
                          {['admin', 'manager'].includes(profile?.role || '') && (
                            <>
                              <DropdownMenuSeparator />
                              {request.status === 'Pending' && (
                                <>
                                  <DropdownMenuItem onSelect={() => handleStatusUpdate(request.id, 'Approved')}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    {t('procurement.approve_button')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive" onSelect={() => handleStatusUpdate(request.id, 'Rejected')}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    {t('procurement.reject_button')}
                                  </DropdownMenuItem>
                                </>
                              )}
                              {request.status === 'Approved' && (
                                <OrderPoDialog request={request} accounts={accounts}>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Send className="mr-2 h-4 w-4" />
                                        {t('procurement.mark_ordered_button')}
                                    </DropdownMenuItem>
                                </OrderPoDialog>
                              )}
                              {request.status === 'Ordered' && (
                                <DropdownMenuItem onSelect={() => handleMarkAsReceived(request.id)}>
                                    <ClipboardCheck className="mr-2 h-4 w-4" />
                                    {t('procurement.mark_received_button')}
                                </DropdownMenuItem>
                              )}
                              
                              {(request.status === 'Pending' && profile?.role === 'admin') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onSelect={() => {
                                    setRequestToEdit(request);
                                    setIsDialogOpen(true);
                                  }}>{t('edit')}</DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onSelect={() => {
                                      setRequestToDelete(request);
                                      setIsDeleteDialogOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    {t('delete')}
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
                    {requests.length > 0 ? t('procurement.no_po_match_filters') : t('procurement.no_po_found')}
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
                <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('procurement.delete_confirm_desc', { name: requestToDelete?.itemName ?? '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setRequestToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteRequest}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('deleting')}</>
                  ) : (
                    <><Trash2 className="mr-2 h-4 w-4" /> {t('delete')}</>
                  )}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
