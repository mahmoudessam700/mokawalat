'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
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
