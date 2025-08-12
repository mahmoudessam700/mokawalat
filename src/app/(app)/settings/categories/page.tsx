
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
import { Loader2, MoreHorizontal, PlusCircle, Trash2, ArrowLeft, Shapes } from 'lucide-react';
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
import { addCategory, deleteCategory, updateCategory, type CategoryFormValues } from './actions';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { useLanguage } from '@/hooks/use-language';

const categoryFormSchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters long."),
});

type Category = {
  id: string;
  name: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const q = query(collection(firestore, 'inventoryCategories'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Category[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
      setCategories(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (categoryToEdit) {
      form.reset(categoryToEdit);
    } else {
      form.reset(form.formState.defaultValues);
    }
  }, [categoryToEdit, form]);

  async function onSubmit(values: CategoryFormValues) {
    const result = categoryToEdit
      ? await updateCategory(categoryToEdit.id, values)
      : await addCategory(values);

    if (result.errors) {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    } else {
      toast({ title: t('success'), description: result.message });
      setIsFormDialogOpen(false);
      setCategoryToEdit(null);
    }
  }

  async function handleDeleteCategory() {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    const result = await deleteCategory(categoryToDelete.id);
    setIsDeleting(false);

    if (result.success) {
      toast({ title: t('success'), description: result.message });
    } else {
      toast({ variant: 'destructive', title: t('error'), description: result.message });
    }
    setIsDeleteDialogOpen(false);
    setCategoryToDelete(null);
  }
  
  const handleFormDialogOpenChange = (open: boolean) => {
    if (!open) setCategoryToEdit(null);
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
                <h1 className="font-headline text-3xl font-bold tracking-tight">{t('inventory_categories_title')}</h1>
                <p className="text-muted-foreground">{t('inventory_categories_desc')}</p>
            </div>
        </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>{t('category_list')}</CardTitle>
            <CardDescription>{t('category_list_desc')}</CardDescription>
          </div>
          {profile?.role === 'admin' && (
            <Dialog open={isFormDialogOpen} onOpenChange={handleFormDialogOpenChange}>
            <DialogTrigger asChild>
                <Button onClick={() => setCategoryToEdit(null)}>
                <PlusCircle className="mr-2" />
                {t('add_category')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{categoryToEdit ? t('edit_category') : t('add_new_category')}</DialogTitle>
                    <DialogDescription>{categoryToEdit ? t('edit_category_desc') : t('add_new_category_desc')}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>{t('category_name')}</FormLabel><FormControl><Input placeholder={t('category_name_placeholder')} {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('saving')}</> : (categoryToEdit ? t('save_changes') : t('save_category'))}</Button>
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
                <TableHead>{t('category_name')}</TableHead>
                <TableHead className="text-right"><span className="sr-only">{t('actions')}</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                    <TableCell className="text-right"><Button aria-haspopup="true" size="icon" variant="ghost" disabled><MoreHorizontal className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))
              ) : categories.length > 0 ? (
                categories.map((category) => (
                    <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell className="text-right">
                        {profile?.role === 'admin' && (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">{t('toggle_menu')}</span></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
                                <DropdownMenuItem onSelect={() => { setCategoryToEdit(category); setIsFormDialogOpen(true); }}>{t('edit')}</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onSelect={() => { setCategoryToDelete(category); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />{t('delete')}</DropdownMenuItem>
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Shapes className="size-12" />
                        {t('no_categories_found')}
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
                <AlertDialogDescription>{t('delete_category_confirm_desc', { name: categoryToDelete?.name ?? '' })}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCategory} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
