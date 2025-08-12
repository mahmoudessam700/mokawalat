
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreHorizontal, PlusCircle, Trash2, ArrowLeft, Warehouse as WarehouseIcon } from 'lucide-react';
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
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useEffect } from 'react';
import { addWarehouse, deleteWarehouse, updateWarehouse, type WarehouseFormValues } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';

const warehouseFormSchema = z.object({
  name: z.string().min(2, "Warehouse name must be at least 2 characters long."),
  location: z.string().optional(),
});

type Warehouse = {
  id: string;
  name: string;
  location?: string;
};

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [warehouseToEdit, setWarehouseToEdit] = useState<Warehouse | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const q = query(collection(firestore, 'warehouses'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Warehouse[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Warehouse));
      setWarehouses(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const form = useForm<WarehouseFormValues>({
    resolver: zodResolver(warehouseFormSchema),
    defaultValues: {
      name: '',
      location: '',
    },
  });

  useEffect(() => {
    if (warehouseToEdit) {
      form.reset(warehouseToEdit);
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [warehouseToEdit, form]);

  async function onSubmit(values: WarehouseFormValues) {
    const result = warehouseToEdit
      ? await updateWarehouse(warehouseToEdit.id, values)
      : await addWarehouse(values);

    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      setIsFormDialogOpen(false);
      setWarehouseToEdit(null);
    }
  }

  async function handleDeleteWarehouse() {
    if (!warehouseToDelete) return;
    setIsDeleting(true);
    const result = await deleteWarehouse(warehouseToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      toast({ title: t('success'), description: result.message });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
    setIsDeleteDialogOpen(false);
    setWarehouseToDelete(null);
  }
  
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) setWarehouseToEdit(null);
    setIsFormDialogOpen(open);
  }

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
                <Link href="/settings">
                    <ArrowLeft />
                    <span className="sr-only">{t('back_to_settings')}</span>
                </Link>
            </Button>
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">{t('warehouse_management_title')}</h1>
                <p className="text-muted-foreground">{t('warehouse_management_desc')}</p>
            </div>
        </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('warehouse_list')}</CardTitle>
            <CardDescription>{t('warehouse_list_desc')}</CardDescription>
          </div>
          {profile?.role === 'admin' && (
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setWarehouseToEdit(null)}>
                <PlusCircle className="mr-2" />
                {t('add_warehouse')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{warehouseToEdit ? t('edit_warehouse') : t('add_new_warehouse')}</DialogTitle>
                    <DialogDescription>{warehouseToEdit ? t('edit_warehouse_desc') : t('add_new_warehouse_desc')}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('warehouse_name')}</FormLabel><FormControl><Input placeholder={t('warehouse_name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <FormField control={form.control} name="location" render={({ field }) => (<FormItem><FormLabel>{t('location_optional')}</FormLabel><FormControl><Input placeholder={t('location_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('saving')}</> : (warehouseToEdit ? t('save_changes') : t('save_warehouse'))}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('warehouse_name')}</TableHead>
                <TableHead>{t('location')}</TableHead>
                <TableHead className="text-right"><span className="sr-only">{t('actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell className="text-right"><Button aria-haspopup="true" size="icon" variant="ghost" disabled><MoreHorizontal className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              ) : warehouses.length > 0 ? (
                warehouses.map((warehouse) => (
                    <TableRow key={warehouse.id}>
                        <TableCell className="font-medium">{warehouse.name}</TableCell>
                        <TableCell>{warehouse.location || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                        {profile?.role === 'admin' && (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">{t('toggle_menu')}</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => { setWarehouseToEdit(warehouse); setIsFormDialogOpen(true); }}>{t('edit')}</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => { setWarehouseToDelete(warehouse); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t('delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <WarehouseIcon className="size-12" />
                        {t('no_warehouses_found')}
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
                <AlertDialogTitle>{t('are_you_sure')}</AlertDialogTitle>
                <AlertDialogDescription>{t('delete_warehouse_confirm_desc', { name: warehouseToDelete?.name ?? '' })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setWarehouseToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteWarehouse} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
