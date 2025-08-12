
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
import { Loader2, MoreHorizontal, PlusCircle, Search, Star, Trash2 } from 'lucide-react';
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
import { addSupplier, deleteSupplier, updateSupplier } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/use-language';

// Define the supplier type
type Supplier = {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive';
  rating?: number;
};

const supplierFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  contactPerson: z.string().min(2, "Contact person must be at least 2 characters long."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  status: z.enum(["Active", "Inactive"]),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

function StarRatingDisplay({ rating = 0 }: { rating?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'size-4',
            rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
          )}
        />
      ))}
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');

  useEffect(() => {
    const q = query(collection(firestore, 'suppliers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const suppliersData: Supplier[] = [];
      querySnapshot.forEach((doc) => {
        suppliersData.push({ id: doc.id, ...doc.data() } as Supplier);
      });
      setSuppliers(suppliersData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching suppliers: ", error);
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch suppliers. Check console for details.',
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);
  
  const filteredSuppliers = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesSearch =
        lowercasedFilter === '' ||
        supplier.name.toLowerCase().includes(lowercasedFilter) ||
        supplier.contactPerson.toLowerCase().includes(lowercasedFilter);

      const matchesStatus = statusFilter === 'All' || supplier.status === statusFilter;

      const matchesRating =
        ratingFilter === 'All' ||
        (ratingFilter === 'Rated' && (supplier.rating ?? 0) > 0) ||
        (ratingFilter === 'Unrated' && !(supplier.rating ?? 0 > 0));

      return matchesSearch && matchesStatus && matchesRating;
    });
  }, [suppliers, searchTerm, statusFilter, ratingFilter]);


  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      status: 'Active',
    },
  });

  useEffect(() => {
    if (supplierToEdit) {
      form.reset(supplierToEdit);
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [supplierToEdit, form]);


  async function onSubmit(values: SupplierFormValues) {
    const result = supplierToEdit
        ? await updateSupplier(supplierToEdit.id, values)
        : await addSupplier(values);

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
      setIsFormDialogOpen(false);
      setSupplierToEdit(null);
    }
  }
  
  async function handleDeleteSupplier() {
    if (!supplierToDelete) return;

    setIsDeleting(true);
    const result = await deleteSupplier(supplierToDelete.id);
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
    setSupplierToDelete(null);
  }

  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) {
      setSupplierToEdit(null);
    }
    setIsFormDialogOpen(open);
  }

  return (
    <>
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            {t('suppliers.page_title')}
          </h1>
          <p className="text-muted-foreground">
            {t('suppliers.page_desc')}
          </p>
        </div>
        {profile?.role === 'admin' && (
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setSupplierToEdit(null)}>
                <PlusCircle className="mr-2" />
                {t('suppliers.add_button')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                <DialogTitle>{supplierToEdit ? t('suppliers.edit_title') : t('suppliers.add_title')}</DialogTitle>
                <DialogDescription>
                    {supplierToEdit ? t('suppliers.edit_desc') : t('suppliers.add_desc')}
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('suppliers.name_label')}</FormLabel>
                        <FormControl>
                            <Input placeholder={t('suppliers.name_placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>{t('suppliers.contact_person_label')}</FormLabel>
                        <FormControl>
                            <Input placeholder={t('suppliers.contact_person_placeholder')} {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('email')}</FormLabel>
                            <FormControl>
                            <Input placeholder={t('suppliers.email_placeholder')} type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('phone')}</FormLabel>
                            <FormControl>
                            <Input placeholder={t('suppliers.phone_placeholder')} type="tel" {...field} />
                            </FormControl>
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
                        <FormLabel>{t('status')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={t('clients.select_status')} />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Active">{t('suppliers.status.Active')}</SelectItem>
                            <SelectItem value="Inactive">{t('suppliers.status.Inactive')}</SelectItem>
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
                            {t('saving')}
                        </>
                        ) : (
                        supplierToEdit ? t('save_changes') : t('suppliers.save_supplier_button')
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
              <CardTitle>{t('suppliers.list_title')}</CardTitle>
              <CardDescription>{t('suppliers.list_desc')}</CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
               <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('suppliers.search_placeholder')}
                  className="w-full pl-8 md:w-[250px]"
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
                  <SelectItem value="Active">{t('suppliers.status.Active')}</SelectItem>
                  <SelectItem value="Inactive">{t('suppliers.status.Inactive')}</SelectItem>
                </SelectContent>
              </Select>
               <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder={t('suppliers.filter_by_rating')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('suppliers.all_ratings')}</SelectItem>
                  <SelectItem value="Rated">{t('suppliers.rated')}</SelectItem>
                  <SelectItem value="Unrated">{t('suppliers.unrated')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('suppliers.name_header')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('suppliers.contact_person_header')}</TableHead>
                <TableHead>{t('suppliers.rating_header')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                    <TableCell>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled>
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">{t('toggle_menu')}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{supplier.contactPerson}</TableCell>
                    <TableCell><StarRatingDisplay rating={supplier.rating} /></TableCell>
                    <TableCell>
                      <Badge variant={supplier.status === 'Active' ? 'secondary' : 'destructive'}>
                        {t(`suppliers.status.${supplier.status}`)}
                      </Badge>
                    </TableCell>
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
                            <Link href={`/suppliers/${supplier.id}`}>{t('view_details')}</Link>
                          </DropdownMenuItem>
                          {profile?.role === 'admin' && (
                            <>
                              <DropdownMenuItem onSelect={() => {
                                  setSupplierToEdit(supplier);
                                  setIsFormDialogOpen(true);
                              }}>
                                  {t('edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={() => {
                                  setSupplierToDelete(supplier);
                                  setIsDeleteDialogOpen(true);
                                  }}
                              >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  {t('delete')}
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                 <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    {suppliers.length > 0 ? t('suppliers.no_suppliers_match_filters') : t('suppliers.no_suppliers_found')}
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
                    {t('suppliers.delete_confirm_desc', { name: supplierToDelete?.name ?? '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteSupplier}
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
