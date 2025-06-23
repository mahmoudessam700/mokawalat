
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const warehouseFormSchema = z.object({
  name: z.string().min(2, "Warehouse name must be at least 2 characters long."),
  location: z.string().optional(),
});

export type WarehouseFormValues = z.infer<typeof warehouseFormSchema>;

export async function addWarehouse(values: WarehouseFormValues) {
  const validatedFields = warehouseFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    await addDoc(collection(firestore, 'warehouses'), {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
      createdAt: serverTimestamp(),
    });
    revalidatePath('/settings/warehouses');
    revalidatePath('/inventory');
    return { message: 'Warehouse added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding warehouse:', error);
    return { message: 'Failed to add warehouse.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateWarehouse(warehouseId: string, values: WarehouseFormValues) {
  if (!warehouseId) {
    return { message: 'Warehouse ID is required.', errors: { _server: ['Warehouse ID not provided.'] } };
  }

  const validatedFields = warehouseFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const warehouseRef = doc(firestore, 'warehouses', warehouseId);
    await updateDoc(warehouseRef, {
        ...validatedFields.data,
        name_lowercase: validatedFields.data.name.toLowerCase(),
    });
    revalidatePath('/settings/warehouses');
    revalidatePath('/inventory');
    return { message: 'Warehouse updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating warehouse:', error);
    return { message: 'Failed to update warehouse.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteWarehouse(warehouseId: string) {
  if (!warehouseId) {
    return { success: false, message: 'Warehouse ID is required.' };
  }
  
  try {
    // Note: We might want to check if any inventory items are using this warehouse before deleting.
    // For now, we will allow deletion. A more advanced implementation would prevent this.
    await deleteDoc(doc(firestore, 'warehouses', warehouseId));
    revalidatePath('/settings/warehouses');
    revalidatePath('/inventory');
    return { success: true, message: 'Warehouse deleted successfully.' };
  } catch (error) {
    console.error('Error deleting warehouse:', error);
    return { success: false, message: 'Failed to delete warehouse.' };
  }
}
