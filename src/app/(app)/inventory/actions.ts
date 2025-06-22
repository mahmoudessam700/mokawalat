'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const inventoryFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  category: z.string().min(2, "Category is required."),
  quantity: z.coerce.number().min(0, "Quantity cannot be negative."),
  warehouse: z.string().min(2, "Warehouse is required."),
  status: z.enum(["In Stock", "Low Stock", "Out of Stock"]),
});

export type InventoryFormValues = z.infer<typeof inventoryFormSchema>;

export async function addInventoryItem(values: InventoryFormValues) {
  const validatedFields = inventoryFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    await addDoc(collection(firestore, 'inventory'), validatedFields.data);
    revalidatePath('/inventory');
    return { message: 'Item added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding inventory item:', error);
    return { message: 'Failed to add item.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateInventoryItem(itemId: string, values: InventoryFormValues) {
  if (!itemId) {
    return { message: 'Item ID is required.', errors: { _server: ['Item ID not provided.'] } };
  }

  const validatedFields = inventoryFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const itemRef = doc(firestore, 'inventory', itemId);
    await updateDoc(itemRef, validatedFields.data);
    revalidatePath('/inventory');
    return { message: 'Item updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return { message: 'Failed to update item.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteInventoryItem(itemId: string) {
  if (!itemId) {
    return { success: false, message: 'Item ID is required.' };
  }

  try {
    await deleteDoc(doc(firestore, 'inventory', itemId));
    revalidatePath('/inventory');
    return { success: true, message: 'Item deleted successfully.' };
  } catch (error) {
    console.error('Error deleting item:', error);
    return { success: false, message: 'Failed to delete item.' };
  }
}
