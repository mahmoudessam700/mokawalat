
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
import React from 'react';
import { useLanguage } from '@/hooks/use-language';


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
  currentProjectId: z.string().optional().default('none'),
  nextMaintenanceDate: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

const formatCurrency = (value: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
    });
    return `LE ${formatter.format(value)}`;
};

/**
 * Determines the maintenance status of an asset based on its next maintenance date.
 * This is safe to use on both server and client, but will give client-local time,
 * so it's best used inside a useEffect for indicators.
 */
const getMaintenanceStatus = (maintenanceDate?: Timestamp): 'ok' | 'upcoming' | 'overdue' => {
  if (!maintenanceDate) {
    return 'ok';
  }
  const date = maintenanceDate.toDate();
  if (isPast(date)) {
    return 'overdue';
  }
  if (isFuture(date) && differenceInDays(date, new Date()) <= 30) {
    return 'upcoming';
  }
  return 'ok';
};

/**
 * A client-side component to safely render maintenance status without causing hydration errors.
 * It uses useEffect to calculate the status only after the initial client render.
 */
function MaintenanceStatusIndicator({ maintenanceDate }: { maintenanceDate?: Timestamp }) {
  const [status, setStatus] = React.useState<'ok' | 'upcoming' | 'overdue'>('ok');
  const { t } = useLanguage();

  useEffect(() => {
    // This logic now runs only on the client, avoiding server-client mismatch
    setStatus(getMaintenanceStatus(maintenanceDate));
  }, [maintenanceDate]);

  if (status === 'ok') {
    return null; // Don't render anything if maintenance is not due
  }

  return (
    <Tooltip>
      <TooltipTrigger>
        <AlertCircle className={cn('size-4', status === 'overdue' ? 'text-destructive' : 'text-yellow-500')} />
      </TooltipTrigger>
      <TooltipContent>
        <p>{t('assets.maintenance_status')} {status === 'overdue' ? t('assets.overdue') : t('assets.upcoming')}</p>
      </TooltipContent>
    </Tooltip>
  );
}


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
  const { t } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [maintenanceFilter, setMaintenanceFilter] = useState('All');
  
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);


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
    const baseFiltered = assets.filter(asset => {
        const lowercasedTerm = searchTerm.toLowerCase();
        const matchesSearch = !searchTerm || asset.name.toLowerCase().includes(lowercasedTerm);
        const matchesCategory = categoryFilter === 'All' || asset.category === categoryFilter;
        const matchesStatus = statusFilter === 'All' || asset.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    if (maintenanceFilter === 'All' || !isClient) {
        return baseFiltered;
    }
    
    return baseFiltered.filter(asset => {
        const status = getMaintenanceStatus(asset.nextMaintenanceDate);
        if (maintenanceFilter === 'Upcoming' && status === 'upcoming') return true;
        if (maintenanceFilter === 'Overdue' && status === 'overdue') return true;
        return false;
    });
  }, [assets, searchTerm, categoryFilter, statusFilter, maintenanceFilter, isClient]);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: '',
      category: '',
      status: 'Available',
      purchaseDate: '',
      purchaseCost: 0,
      currentProjectId: 'none',
      nextMaintenanceDate: '',
    },
  });

  useEffect(() => {
    if (!isClient) return;

    if (assetToEdit) {
      form.reset({
        ...assetToEdit,
        purchaseDate: assetToEdit.purchaseDate ? format(assetToEdit.purchaseDate.toDate(), 'yyyy-MM-dd') : '',
        nextMaintenanceDate: assetToEdit.nextMaintenanceDate ? format(assetToEdit.nextMaintenanceDate.toDate(), 'yyyy-MM-dd') : '',
        currentProjectId: assetToEdit.currentProjectId || 'none',
      });
    } else {
      form.reset({
        name: '',
        category: '',
        status: 'Available',
        purchaseDate: new Date().toISOString().split('T')[0],
        purchaseCost: 0,
        currentProjectId: 'none',
        nextMaintenanceDate: '',
      });
    }
  }, [assetToEdit, form, isClient]);

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
    <>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight">{t('assets.page_title')}</h1>
              <p className="text-muted-foreground">{t('assets.page_desc')}</p>
            </div>
            {['admin', 'manager'].includes(profile?.role || '') && (
                <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogOpenChange}>
                <DialogTrigger asChild>
                    <Button onClick={() => setAssetToEdit(null)}>
                    <PlusCircle className="mr-2" />
                    {t('assets.add_button')}
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                    <DialogTitle>{assetToEdit ? t('assets.edit_title') : t('assets.add_title')}</DialogTitle>
                    <DialogDescription>{assetToEdit ? t('assets.edit_desc') : t('assets.add_desc')}</DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('assets.name_label')}</FormLabel><FormControl><Input placeholder={t('assets.name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>{t('category')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('assets.select_category')} /></SelectTrigger></FormControl><SelectContent>{assetCategories.map(cat => (<SelectItem key={cat} value={cat}>{t(`asset_categories.${cat.replace(/ /g, '_')}`)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="status" render={({ field }) => (<FormItem><FormLabel>{t('status')}</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder={t('assets.select_status')} /></SelectTrigger></FormControl><SelectContent>{Object.keys(statusVariant).map(s => (<SelectItem key={s} value={s}>{t(`assets.status.${s.replace(/ /g, '_')}`)}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="purchaseDate" render={({ field }) => (<FormItem><FormLabel>{t('assets.purchase_date')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="purchaseCost" render={({ field }) => (<FormItem><FormLabel>{t('assets.purchase_cost_label')}</FormLabel><FormControl><Input type="number" placeholder={t('assets.purchase_cost_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="currentProjectId" render={({ field }) => (<FormItem><FormLabel>{t('assets.assigned_project_optional')}</FormLabel><Select onValueChange={(value) => field.onChange(value === 'none' ? '' : value)} value={field.value || 'none'}><FormControl><SelectTrigger><SelectValue placeholder={t('assets.select_project')} /></SelectTrigger></FormControl><SelectContent><SelectItem value="none">{t('projects.none')}</SelectItem>{projects.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="nextMaintenanceDate" render={({ field }) => (<FormItem><FormLabel>{t('assets.next_maintenance_optional')}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <DialogFooter>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('saving')}</> : (assetToEdit ? t('save_changes') : t('assets.save_asset_button'))}
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
                  <CardTitle>{t('assets.list_title')}</CardTitle>
                  <CardDescription>{t('assets.list_desc')}</CardDescription>
                </div>
                <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                  <div className="relative w-full md:w-auto">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder={t('assets.search_placeholder')} className="w-full pl-8 md:w-[200px]" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder={t('assets.filter_by_category')} /></SelectTrigger><SelectContent><SelectItem value="All">{t('assets.all_categories')}</SelectItem>{assetCategories.map(cat => (<SelectItem key={cat} value={cat}>{t(`asset_categories.${cat.replace(/ /g, '_')}`)}</SelectItem>))}</SelectContent></Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full md:w-[150px]"><SelectValue placeholder={t('clients.filter_by_status')} /></SelectTrigger><SelectContent><SelectItem value="All">{t('assets.all_statuses')}</SelectItem>{Object.keys(statusVariant).map(s => (<SelectItem key={s} value={s}>{t(`assets.status.${s.replace(/ /g, '_')}`)}</SelectItem>))}</SelectContent></Select>
                   <Select value={maintenanceFilter} onValueChange={setMaintenanceFilter}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder={t('assets.maintenance_status')} /></SelectTrigger><SelectContent><SelectItem value="All">{t('assets.all_maintenance')}</SelectItem><SelectItem value="Upcoming">{t('assets.upcoming')}</SelectItem><SelectItem value="Overdue">{t('assets.overdue')}</SelectItem></SelectContent></Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('assets.asset_name_header')}</TableHead>
                    <TableHead>{t('assets.category_header')}</TableHead>
                    <TableHead>{t('assets.assigned_project_header')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('assets.next_maintenance_header')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead><span className="sr-only">{t('actions')}</span></TableHead>
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
                    filteredAssets.map((asset) => (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          <Link href={`/assets/${asset.id}`} className="hover:underline">
                            {asset.name}
                          </Link>
                        </TableCell>
                        <TableCell>{t(`asset_categories.${asset.category.replace(/ /g, '_')}`)}</TableCell>
                        <TableCell>{asset.currentProjectId ? <Link href={`/projects/${asset.currentProjectId}`} className="hover:underline">{projectMap.get(asset.currentProjectId) || 'N/A'}</Link> : 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                            <div className="flex items-center gap-2">
                               <span>{asset.nextMaintenanceDate ? format(asset.nextMaintenanceDate.toDate(), 'PPP') : 'N/A'}</span>
                               {isClient && <MaintenanceStatusIndicator maintenanceDate={asset.nextMaintenanceDate} />}
                            </div>
                        </TableCell>
                        <TableCell><Badge variant={statusVariant[asset.status]}>{t(`assets.status.${asset.status.replace(/ /g, '_')}`)}</Badge></TableCell>
                        <TableCell className="text-right">
                          {['admin', 'manager'].includes(profile?.role || '') && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">{t('toggle_menu')}</span></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => { setAssetToEdit(asset); setIsFormDialogOpen(true); }}>{t('edit')}</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => { setAssetToDelete(asset); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t('delete')}</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Wrench className="size-12" />
                            {t('assets.no_assets_match_filters')}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('assets.delete_confirm_desc', { name: assetToDelete?.name ?? '' })}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setAssetToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAsset} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('deleting')}</> : <><Trash2 className="mr-2 h-4 w-4" />{t('delete')}</>}</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

