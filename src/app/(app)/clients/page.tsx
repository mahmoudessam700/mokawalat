
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
import { addClient, deleteClient, updateClient } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy, type Timestamp } from 'firebase/firestore';
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
    const q = query(collection(firestore, 'clients'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Client[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Client);
      });
      setClients(data);
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
    const result = clientToEdit
        ? await updateClient(clientToEdit.id, values)
        : await addClient(values);

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
      setClientToEdit(null);
    }
  }

  async function handleDeleteClient() {
    if (!clientToDelete) return;

    setIsDeleting(true);
    const result = await deleteClient(clientToDelete.id);
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
