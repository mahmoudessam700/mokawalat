
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
// Using client-side Firestore writes so authenticated user context is applied to security rules
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, type Timestamp, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, where, getDocs, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';

type ClientStatus = 'Lead' | 'Active' | 'Inactive';

type Client = {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  status: ClientStatus;
  createdAt: Timestamp;
};

const statusVariant: { [key in ClientStatus]: 'default' | 'secondary' | 'destructive' } = {
  Lead: 'default',
  Active: 'secondary',
  Inactive: 'destructive',
};

const clientFormSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters long."),
  company: z.string().optional(),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  status: z.enum(["Lead", "Active", "Inactive"]),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    // Avoid ordering at query-level to ensure docs missing 'createdAt' are included.
    const q = query(collection(firestore, 'clients'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Client[] = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      // Sort locally: createdAt desc, fallback by name/name_lowercase
      data.sort((a: any, b: any) => {
        const aTs = a.createdAt && typeof (a.createdAt as any).toMillis === 'function' ? a.createdAt.toMillis() : 0;
        const bTs = b.createdAt && typeof (b.createdAt as any).toMillis === 'function' ? b.createdAt.toMillis() : 0;
        if (aTs !== bTs) return bTs - aTs;
        const an = (a.name_lowercase || a.name || '').toString();
        const bn = (b.name_lowercase || b.name || '').toString();
        return an.localeCompare(bn);
      });
      setClients(data as Client[]);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching clients: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch clients. Check security rules.',
      });
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const filteredClients = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase();
    return clients.filter((client) => {
      const matchesSearch = (
        client.name.toLowerCase().includes(lowercasedFilter) ||
        client.email.toLowerCase().includes(lowercasedFilter) ||
        (client.company && client.company.toLowerCase().includes(lowercasedFilter))
      );
      const matchesStatus = statusFilter === 'All' || client.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [clients, searchTerm, statusFilter]);

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      status: 'Lead',
    },
  });

  useEffect(() => {
    if (clientToEdit) {
      form.reset(clientToEdit);
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [clientToEdit, form]);


  async function onSubmit(values: ClientFormValues) {
    try {
      if (clientToEdit) {
        const clientRef = doc(firestore, 'clients', clientToEdit.id);
        await updateDoc(clientRef, {
          ...values,
          name_lowercase: values.name.toLowerCase(),
        });
        try {
          await addDoc(collection(firestore, 'activityLog'), {
            message: `Client updated: ${values.name}`,
            type: 'CLIENT_UPDATED',
            link: `/clients/${clientToEdit.id}`,
            timestamp: serverTimestamp(),
          });
        } catch (e) {
          // Ignore if rules disallow direct activityLog writes
          console.warn('activityLog write skipped:', e);
        }
        toast({ title: 'Success', description: 'Client updated successfully.' });
      } else {
        const clientRef = await addDoc(collection(firestore, 'clients'), {
          ...values,
          name_lowercase: values.name.toLowerCase(),
          createdAt: serverTimestamp(),
        });
        try {
          await addDoc(collection(firestore, 'activityLog'), {
            message: `New client added: ${values.name}`,
            type: 'CLIENT_ADDED',
            link: `/clients/${clientRef.id}`,
            timestamp: serverTimestamp(),
          });
        } catch (e) {
          console.warn('activityLog write skipped:', e);
        }
        toast({ title: 'Success', description: 'Client added successfully.' });
      }
      setIsFormDialogOpen(false);
      setClientToEdit(null);
    } catch (error) {
      console.error('Error saving client:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save client. Check your permissions.' });
    }
  }

  async function handleDeleteClient() {
    if (!clientToDelete) return;

    setIsDeleting(true);
    try {
      // Safeguards similar to server checks
      const clientId = clientToDelete.id;
      const projectsSnapshot = await getDocs(query(collection(firestore, 'projects'), where('clientId', '==', clientId)));
      if (!projectsSnapshot.empty) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete client with active projects. Please re-assign them first.' });
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setClientToDelete(null);
        return;
      }
      const transactionsSnapshot = await getDocs(query(collection(firestore, 'transactions'), where('clientId', '==', clientId)));
      if (!transactionsSnapshot.empty) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot delete client with existing financial transactions.' });
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
        setClientToDelete(null);
        return;
      }
      const clientRef = doc(firestore, 'clients', clientId);
      const clientSnap = await getDoc(clientRef);
      const clientName = clientSnap.exists() ? (clientSnap.data() as any).name : 'Client';
      await deleteDoc(clientRef);
      try {
        await addDoc(collection(firestore, 'activityLog'), {
          message: `Client deleted: ${clientName}`,
          type: 'CLIENT_DELETED',
          link: `/clients`,
          timestamp: serverTimestamp(),
        });
      } catch (e) {
        console.warn('activityLog write skipped:', e);
      }
      toast({ title: 'Success', description: 'Client deleted successfully.' });
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete client.' });
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
    setClientToDelete(null);
  }

  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) {
      setClientToEdit(null);
    }
    setIsFormDialogOpen(open);
  }


  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            {t('clients.page_title')}
          </h1>
          <p className="text-muted-foreground">
            {t('clients.page_desc')}
          </p>
        </div>
        {['admin', 'manager'].includes(profile?.role || '') && (
          <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={() => setClientToEdit(null)}>
                <PlusCircle className="mr-2" />
                {t('clients.add_button')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>{clientToEdit ? t('clients.edit_title') : t('clients.add_title')}</DialogTitle>
                <DialogDescription>
                  {clientToEdit ? t('clients.edit_desc') : t('clients.add_desc')}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('clients.name_label')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('clients.name_placeholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('clients.company_label')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('clients.company_placeholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('email')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('clients.email_placeholder')} type="email" {...field} />
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
                            <Input placeholder={t('clients.phone_placeholder')} type="tel" {...field} />
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
                            <SelectItem value="Lead">{t('clients.status.Lead')}</SelectItem>
                            <SelectItem value="Active">{t('clients.status.Active')}</SelectItem>
                            <SelectItem value="Inactive">{t('clients.status.Inactive')}</SelectItem>
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
                        clientToEdit ? t('save_changes') : t('clients.save_client_button')
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
              <CardTitle>{t('clients.list_title')}</CardTitle>
              <CardDescription>{t('clients.list_desc')}</CardDescription>
            </div>
            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
              <div className="relative w-full md:w-auto">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('clients.search_placeholder')}
                  className="w-full pl-8 md:w-[250px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t('clients.filter_by_status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">{t('clients.all_statuses')}</SelectItem>
                  <SelectItem value="Lead">{t('clients.status.Lead')}</SelectItem>
                  <SelectItem value="Active">{t('clients.status.Active')}</SelectItem>
                  <SelectItem value="Inactive">{t('clients.status.Inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('name')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('company')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('email')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('phone')}</TableHead>
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
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                    <TableCell>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.company || 'N/A'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{client.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{client.phone}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[client.status]}>
                        {t(`clients.status.${client.status}`)}
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
                            <Link href={`/clients/${client.id}`}>{t('view_details')}</Link>
                          </DropdownMenuItem>
                          {['admin', 'manager'].includes(profile?.role || '') && (
                            <>
                              <DropdownMenuItem onSelect={() => {
                                setClientToEdit(client);
                                setIsFormDialogOpen(true);
                              }}>{t('edit')}</DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onSelect={() => {
                                  setClientToDelete(client);
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
                    {clients.length > 0
                      ? t('clients.no_clients_match_filters')
                      : t('clients.no_clients_found')}
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
                    {t('clients.delete_confirm_desc', { name: clientToDelete?.name ?? '' })}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setClientToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                    onClick={handleDeleteClient}
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
