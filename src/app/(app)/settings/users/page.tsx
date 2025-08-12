
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
import { Loader2, MoreHorizontal, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
import { useState, useEffect } from 'react';
import { updateUserRole } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useAuth, type UserRole } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/hooks/use-language';

type User = {
  uid: string;
  email: string;
  role: UserRole;
};

const roleVariant: { [key in UserRole]: 'default' | 'secondary' | 'destructive' } = {
  admin: 'default',
  manager: 'destructive',
  user: 'secondary',
};

const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'user']),
});

type UpdateUserRoleFormValues = z.infer<typeof updateUserRoleSchema>;

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const { toast } = useToast();
  const { profile, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { t } = useLanguage();
  
  useEffect(() => {
    if (!isAuthLoading && profile?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [profile, isAuthLoading, router]);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const q = query(collection(firestore, 'users'), orderBy('email', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: User[] = snapshot.docs.map(doc => doc.data() as User);
      setUsers(data);
      setIsDataLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to fetch users. Check security rules.',
      });
      setIsDataLoading(false);
    });

    return () => unsubscribe();
  }, [toast, profile]);

  const form = useForm<UpdateUserRoleFormValues>({
    resolver: zodResolver(updateUserRoleSchema),
  });

  useEffect(() => {
    if (userToEdit) {
      form.reset({ role: userToEdit.role });
    }
  }, [userToEdit, form]);

  async function onSubmit(values: UpdateUserRoleFormValues) {
    if (!userToEdit) return;

    const result = await updateUserRole(userToEdit.uid, values);

    if (result.errors) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: result.message,
      });
    } else {
      toast({
        title: t('success'),
        description: result.message,
      });
      setIsFormDialogOpen(false);
      setUserToEdit(null);
    }
  }
  
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) {
      setUserToEdit(null);
    }
    setIsFormDialogOpen(open);
  }

  if (isAuthLoading || profile?.role !== 'admin') {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div>
                    <Skeleton className="h-9 w-64" />
                    <Skeleton className="h-5 w-80 mt-2" />
                </div>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-72 mt-2" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-40 w-full" />
                </CardContent>
            </Card>
        </div>
    );
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
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            {t('user_management_title')}
          </h1>
          <p className="text-muted-foreground">
            {t('user_management_desc')}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('user_list')}</CardTitle>
          <CardDescription>{t('user_list_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDataLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[70px] rounded-full" /></TableCell>
                    <TableCell>
                      <Button aria-haspopup="true" size="icon" variant="ghost" disabled>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.uid}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariant[user.role]} className="capitalize">
                        {t(`roles.${user.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" disabled={user.uid === profile.uid}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">{t('toggle_menu')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => {
                            setUserToEdit(user);
                            setIsFormDialogOpen(true);
                          }}>
                            {t('change_role')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    {t('no_users_found')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </div>
      <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogOpenChange}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('change_user_role_title')}</DialogTitle>
              <DialogDescription>
                {t('change_user_role_desc', { email: userToEdit?.email ?? '' })}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('role')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_role')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                          <SelectItem value="manager">{t('roles.manager')}</SelectItem>
                          <SelectItem value="user">{t('roles.user')}</SelectItem>
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
                    ) : t('save_changes')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
    </>
  );
}
