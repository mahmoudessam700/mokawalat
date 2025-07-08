
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const categoryFormSchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters long."),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export async function addCategory(values: CategoryFormValues) {
  const validatedFields = categoryFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    await addDoc(collection(firestore, 'inventoryCategories'), {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
      createdAt: serverTimestamp(),
    });
    revalidatePath('/settings/categories');
    revalidatePath('/inventory');
    return { message: 'Category added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding category:', error);
    return { message: 'Failed to add category.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateCategory(categoryId: string, values: CategoryFormValues) {
  if (!categoryId) {
    return { message: 'Category ID is required.', errors: { _server: ['Category ID not provided.'] } };
  }

  const validatedFields = categoryFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const categoryRef = doc(firestore, 'inventoryCategories', categoryId);
    await updateDoc(categoryRef, {
        ...validatedFields.data,
        name_lowercase: validatedFields.data.name.toLowerCase(),
    });
    revalidatePath('/settings/categories');
    revalidatePath('/inventory');
    return { message: 'Category updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating category:', error);
    return { message: 'Failed to update category.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteCategory(categoryId: string) {
  if (!categoryId) {
    return { success: false, message: 'Category ID is required.' };
  }
  
  try {
    await deleteDoc(doc(firestore, 'inventoryCategories', categoryId));
    revalidatePath('/settings/categories');
    revalidatePath('/inventory');
    return { success: true, message: 'Category deleted successfully.' };
  } catch (error) {
    console.error('Error deleting category:', error);
    return { success: false, message: 'Failed to delete category.' };
  }
}
