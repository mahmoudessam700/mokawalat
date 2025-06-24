
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
        title: 'Error',
        description: result.message,
      });
    } else {
      toast({
        title: 'Success',
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
            <span className="sr-only">Back to Settings</span>
          </Link>
        </Button>
        <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            User Management
          </h1>
          <p className="text-muted-foreground">
            Manage user accounts and assign roles.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
          <CardDescription>A list of all registered users in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
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
                      <Badge variant={roleVariant[user.role]}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost" disabled={user.uid === profile.uid}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => {
                            setUserToEdit(user);
                            setIsFormDialogOpen(true);
                          }}>
                            Change Role
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No users found.
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
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Change the role for <span className="font-semibold">{userToEdit?.email}</span>.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="user">User</SelectItem>
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
                    ) : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
    </>
  );
}
