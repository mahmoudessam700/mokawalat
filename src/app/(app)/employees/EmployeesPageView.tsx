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
import { Loader2, MoreHorizontal, PlusCircle, Search, Trash2, DollarSign, ArrowLeft } from 'lucide-react';
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
import { addEmployee, deleteEmployee, updateEmployee } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import HR, { DepartmentKey, RoleKey } from '@/lib/hr.constants';

type Employee = {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  salary?: number;
};

const employeeFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.'),
  email: z.string().email('Please enter a valid email address.'),
  role: z.string().min(1, 'Role is required.'),
  department: z.string().min(1, 'Department is required.'),
  status: z.enum(['Active', 'On Leave', 'Inactive']),
  salary: z.coerce.number().optional(),
  photo: z.any().optional(),
});

type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export default function EmployeesPageView() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    const q = query(collection(firestore, 'employees'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const employeesData: Employee[] = [];
      querySnapshot.forEach((doc) => {
        employeesData.push({ id: doc.id, ...doc.data() } as Employee);
      });
      setEmployees(employeesData);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const lowercasedTerm = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        employee.name.toLowerCase().includes(lowercasedTerm) ||
        employee.email.toLowerCase().includes(lowercasedTerm);
      const matchesDepartment = departmentFilter === 'All' || employee.department === departmentFilter;
      const matchesStatus = statusFilter === 'All' || employee.status === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
      department: '',
      status: 'Active',
      salary: undefined,
      photo: undefined,
    },
  });

  useEffect(() => {
    if (employeeToEdit) {
      form.reset({
        ...employeeToEdit,
        salary: employeeToEdit.salary ?? undefined,
        photo: undefined,
      });
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [employeeToEdit, form]);

  async function onSubmit(values: EmployeeFormValues) {
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (key === 'photo' || value === undefined || value === null) return;
      formData.append(key, String(value));
    });
    if (values.photo && values.photo.length > 0) {
      formData.append('photo', values.photo[0]);
    }
    const result = employeeToEdit ? await updateEmployee(employeeToEdit.id, formData) : await addEmployee(formData);
    if (result.errors) {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    } else {
      toast({ title: 'Success', description: result.message });
      setIsFormDialogOpen(false);
      setEmployeeToEdit(null);
    }
  }

  async function handleDeleteEmployee() {
    if (!employeeToDelete) return;
    setIsDeleting(true);
    const result = await deleteEmployee(employeeToDelete.id);
    setIsDeleting(false);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  }

  const handleFormDialog_onOpenChange = (open: boolean) => {
    if (!open) setEmployeeToEdit(null);
    setIsFormDialogOpen(open);
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="icon">
              <Link href="/hr">
                <ArrowLeft />
                <span className="sr-only">{t('employees.back_to_hr')}</span>
              </Link>
            </Button>
            <div>
              <h1 className="font-headline text-3xl font-bold tracking-tight">{t('employees.page_title')}</h1>
              <p className="text-muted-foreground">{t('employees.page_desc')}</p>
            </div>
          </div>
          {['admin', 'manager'].includes(profile?.role || '') && (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline">
                <Link href="/employees/payroll">
                  <DollarSign className="mr-2" />
                  {t('employees.payroll_summary_button')}
                </Link>
              </Button>
              <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialog_onOpenChange}>
                <DialogTrigger asChild>
                  <Button onClick={() => setEmployeeToEdit(null)}>
                    <PlusCircle className="mr-2" />
                    {t('employees.add_employee_button')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{employeeToEdit ? t('employees.edit_employee_title') : t('employees.add_employee_title')}</DialogTitle>
                    <DialogDescription>{employeeToEdit ? t('employees.edit_employee_desc') : t('employees.add_employee_desc')}</DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('employees.full_name_label')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('employees.full_name_placeholder')} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('email')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('employees.email_placeholder')} type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="role" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('role')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('select_role')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {HR.roleKeys.map((role: RoleKey) => (
                                <SelectItem key={role} value={role}>
                                  {t(`job_roles.${role.replace(/ /g, '_')}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="department" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('department')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('employees.select_department')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {HR.departmentKeys.map((dep: DepartmentKey) => (
                                <SelectItem key={dep} value={dep}>
                                  {t(`departments.${dep.replace(/ /g, '_')}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('status')}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t('clients.select_status')} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Active">{t('employees.status.Active')}</SelectItem>
                              <SelectItem value="On Leave">{t('employees.status.On_Leave')}</SelectItem>
                              <SelectItem value="Inactive">{t('employees.status.Inactive')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="salary" render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('employees.salary_label')}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder={t('employees.salary_placeholder')}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value === '' ? undefined : +e.target.value)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="photo" render={() => (
                        <FormItem>
                          <FormLabel>{t('employees.photo_label')}</FormLabel>
                          <FormControl>
                            <Input type="file" accept="image/png, image/jpeg" {...form.register('photo')} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <DialogFooter>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                          {form.formState.isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('saving')}
                            </>
                          ) : employeeToEdit ? (
                            t('save_changes')
                          ) : (
                            t('employees.save_employee_button')
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{t('employees.list_title')}</CardTitle>
                <CardDescription>{t('employees.list_desc')}</CardDescription>
              </div>
              <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder={t('employees.filter_by_department')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">{t('employees.all_departments')}</SelectItem>
                    {HR.departmentKeys.map((dep: DepartmentKey) => (
                      <SelectItem key={dep} value={dep}>
                        {t(`departments.${dep.replace(/ /g, '_')}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder={t('clients.filter_by_status')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">{t('clients.all_statuses')}</SelectItem>
                    <SelectItem value="Active">{t('employees.status.Active')}</SelectItem>
                    <SelectItem value="On Leave">{t('employees.status.On_Leave')}</SelectItem>
                    <SelectItem value="Inactive">{t('employees.status.Inactive')}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-full md:w-auto">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('employees.search_placeholder')}
                    className="w-full pl-8 md:w-[250px]"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('email')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('department')}</TableHead>
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
                      <TableCell>
                        <Skeleton className="h-4 w-[150px]" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-[200px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Skeleton className="h-4 w-[100px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-[70px] rounded-full" />
                      </TableCell>
                      <TableCell>
                        <Button aria-haspopup="true" size="icon" variant="ghost" disabled>
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{t('toggle_menu')}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredEmployees.length > 0 ? (
                  filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">
                        <Link href={`/employees/${employee.id}`} className="hover:underline">
                          {employee.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{employee.email}</TableCell>
                      <TableCell>{employee.role}</TableCell>
                      <TableCell className="hidden md:table-cell">{employee.department}</TableCell>
                      <TableCell>
                        <Badge variant={employee.status === 'Active' ? 'secondary' : employee.status === 'On Leave' ? 'outline' : 'destructive'}>
                          {t(`employees.status.${employee.status.replace(/ /g, '_')}`)}
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
                              <Link href={`/employees/${employee.id}`}>{t('view_details')}</Link>
                            </DropdownMenuItem>
                            {['admin', 'manager'].includes(profile?.role || '') && (
                              <>
                                <DropdownMenuItem
                                  onSelect={() => {
                                    setEmployeeToEdit(employee);
                                    setIsFormDialogOpen(true);
                                  }}
                                >
                                  {t('edit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onSelect={() => {
                                    setEmployeeToDelete(employee);
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
                      {employees.length > 0 ? t('employees.no_employees_match_filters') : t('employees.no_employees_found')}
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
              {t('employees.delete_confirm_desc', { name: employeeToDelete?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmployee} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> {t('delete')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
