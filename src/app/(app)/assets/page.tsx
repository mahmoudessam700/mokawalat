
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
import { Loader2, MoreHorizontal, PlusCircle, Search, Trash2, Wrench, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { addAsset, deleteAsset, updateAsset } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { format, isPast, isFuture, differenceInDays } from 'date-fns';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type AssetStatus = 'Available' | 'In Use' | 'Under Maintenance' | 'Decommissioned';

type Asset = {
  id: string;
  name: string;
  category: string;
  status: AssetStatus;
  purchaseDate: Timestamp;
  purchaseCost: number;
  currentProjectId?: string;
  nextMaintenanceDate?: Timestamp;
};

type Project = {
    id: string;
    name: string;
}

const statusVariant: { [key in AssetStatus]: 'secondary' | 'default' | 'outline' | 'destructive' } = {
  'Available': 'secondary',
  'In Use': 'default',
  'Under Maintenance': 'outline',
  'Decommissioned': 'destructive',
};

const assetCategories = ["Heavy Machinery", "Vehicle", "Power Tool", "Scaffolding", "Formwork", "Other"];

const assetFormSchema = z.object({
  name: z.string().min(2, "Asset name must be at least 2 characters long."),
  category: z.string().min(1, "Category is required."),
  status: z.enum(["Available", "In Use", "Under Maintenance", "Decommissioned"]),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  purchaseCost: z.coerce.number().min(0, "Purchase cost must be a non-negative number."),
  currentProjectId: z.string().optional().default(''),
  nextMaintenanceDate: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    });
    return `LE ${formatter.format(value)}`;
};

const getMaintenanceStatus = (maintenanceDate?: Timestamp): 'ok' | 'upcoming' | 'overdue' => {
    if (!maintenanceDate) return 'ok';
    const date = maintenanceDate.toDate();
    if (isPast(date)) return 'overdue';
    if (isFuture(date) && differenceInDays(date, new Date()) <= 30) return 'upcoming';
    return 'ok';
};


export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [maintenanceFilter, setMaintenanceFilter] = useState('All');

  useEffect(() => {
    const qAssets = query(collection(firestore, 'assets'), orderBy('name', 'asc'));
    const unsubscribeAssets = onSnapshot(qAssets, (snapshot) => {
        setAssets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
        setIsLoading(false);
    });
    
    const qProjects = query(collection(firestore, 'projects'), orderBy('name', 'asc'));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
        setProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project)));
    });

    return () => {
      unsubscribeAssets();
      unsubscribeProjects();
    };
  }, []);

  const projectMap = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || asset.name.toLowerCase().includes(lowercasedTerm);
        const matchesCategory = categoryFilter === 'All' || asset.category === categoryFilter;
        const matchesStatus = statusFilter === 'All' || asset.status === statusFilter;
        
        const maintenanceStatus = getMaintenanceStatus(asset.nextMaintenanceDate);
        const matchesMaintenance = maintenanceFilter === 'All'
            || (maintenanceFilter === 'Upcoming' && maintenanceStatus === 'upcoming')
            || (maintenanceFilter === 'Overdue' && maintenanceStatus === 'overdue');

        return matchesSearch && matchesCategory && matchesStatus && matchesMaintenance;
    });
  }, [assets, searchTerm, categoryFilter, statusFilter, maintenanceFilter]);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: '',
      category: '',
      status: 'Available',
      purchaseDate: '',
      purchaseCost: 0,
      currentProjectId: '',
      nextMaintenanceDate: '',
    },
  });

  useEffect(() => {
    if (assetToEdit) {
      form.reset({
        ...assetToEdit,
        purchaseDate: assetToEdit.purchaseDate ? format(assetToEdit.purchaseDate.toDate(), 'yyyy-MM-dd') : '',
        nextMaintenanceDate: assetToEdit.nextMaintenanceDate ? format(assetToEdit.nextMaintenanceDate.toDate(), 'yyyy-MM-dd') : '',
        currentProjectId: assetToEdit.currentProjectId || '',
      });
    } else {
      form.reset({
        ...form.formState.defaultValues,
        purchaseDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [assetToEdit, form]);

  async function onSubmit(values: AssetFormValues) {
    const result = assetToEdit
        ? await updateAsset(assetToEdit.id, values)
        : await addAsset(values);

    if (result.errors) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      setIsFormDialogOpen(false);
      setAssetToEdit(null);
    }
  }

  async function handleDeleteAsset() {
    if (!assetToDelete) return;

    setIsDeleting(true);
    const result = await deleteAsset(assetToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsDeleteDialogOpen(false);
    setAssetToDelete(null);
  }
  
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) {
      setAssetToEdit(null);
    }
    setIsFormDialogOpen(open);
  }

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">Asset Management</h1>
          <p className="text-muted-foreground">Track vehicles, heavy machinery, and tools.</p>
        </div>
        {profile?.role === 'admin' && (
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setAssetToEdit(null)}>
                <PlusCircle className="mr-2" />
                Add Asset
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                <DialogTitle>{assetToEdit ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
                <DialogDescription>Fill in the details for the asset.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Asset Name</FormLabel><FormControl><Input placeholder="e.g., Caterpillar 320 Excavator" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl><SelectContent>{assetCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl><SelectContent>{Object.keys(statusVariant).map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="purchaseDate" render={({ field }) => (<FormItem><FormLabel>Purchase Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="purchaseCost" render={({ field }) => (<FormItem><FormLabel>Purchase Cost (LE)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1500000" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="currentProjectId" render={({ field }) => (<FormItem><FormLabel>Assigned Project (Optional)</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a project" /></SelectTrigger></FormControl><SelectContent><SelectItem value="">None</SelectItem>{projects.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="nextMaintenanceDate" render={({ field }) => (<FormItem><FormLabel>Next Maintenance (Optional)</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    </div>
                    <DialogFooter>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : (assetToEdit ? 'Save Changes' : 'Save Asset')}
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
              <CardTitle>Asset List</CardTitle>
              <CardDescription>A list of all company assets.</CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search by name..." className="w-full pl-8 md:w-[200px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by category" /></SelectTrigger><SelectContent><SelectItem value="All">All Categories</SelectItem>{assetCategories.map(cat => (<SelectItem key={cat} value={cat}>{cat}</SelectItem>))}</SelectContent></Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder="Filter by status" /></SelectTrigger><SelectContent><SelectItem value="All">All Statuses</SelectItem>{Object.keys(statusVariant).map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select>
               <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Maintenance Status" /></SelectTrigger><SelectContent><SelectItem value="All">All Maintenance</SelectItem><SelectItem value="Upcoming">Upcoming</SelectItem><SelectItem value="Overdue">Overdue</SelectItem></SelectContent></Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned Project</TableHead>
                <TableHead className="hidden md:table-cell">Next Maintenance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[100px] rounded-full" /></TableCell>
                    <TableCell><Button aria-haspopup="true" size="icon" variant="ghost" disabled><MoreHorizontal className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              ) : filteredAssets.length > 0 ? (
                filteredAssets.map((asset) => {
                  const maintenanceStatus = getMaintenanceStatus(asset.nextMaintenanceDate);
                  return (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{asset.category}</TableCell>
                    <TableCell>{asset.currentProjectId ? <Link href={`/projects/${asset.currentProjectId}`} className="hover:underline">{projectMap.get(asset.currentProjectId) || 'N/A'}</Link> : 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                           <span>{asset.nextMaintenanceDate ? format(asset.nextMaintenanceDate.toDate(), 'PPP') : 'N/A'}</span>
                           {maintenanceStatus !== 'ok' && (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <AlertCircle className={cn('size-4', maintenanceStatus === 'overdue' ? 'text-destructive' : 'text-yellow-500')} />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Maintenance {maintenanceStatus}</p>
                                    </TooltipContent>
                                </Tooltip>
                           )}
                        </div>
                    </TableCell>
                    <TableCell><Badge variant={statusVariant[asset.status]}>{asset.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {profile?.role === 'admin' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onSelect={() => { setAssetToEdit(asset); setIsFormDialogOpen(true); }}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onSelect={() => { setAssetToDelete(asset); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Wrench className="size-12" />
                        No assets match the current filters.
                    </div>
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
                <AlertDialogDescription>This action cannot be undone. This will permanently delete the asset "{assetToDelete?.name}".</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setAssetToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAsset} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </TooltipProvider>
  );
}
