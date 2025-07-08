
'use server';
/**
 * @fileoverview Server actions for the Inventory module.
 * This file contains functions for adding, updating, deleting, and adjusting stock for inventory items.
 * It handles data validation, database interactions with Firestore (including transactions), and cache revalidation.
 */

import { firestore } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc, runTransaction, serverTimestamp, getDoc } from 'firebase/firestore';
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

/**
 * Adds a new item to the inventory.
 * @param {InventoryFormValues} values - The data for the new inventory item.
 * @returns {Promise<{message: string, errors: object|null}>} An object containing a success or error message.
 */
export async function addInventoryItem(values: InventoryFormValues) {
  const validatedFields = inventoryFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const itemRef = await addDoc(collection(firestore, 'inventory'), {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
      createdAt: serverTimestamp(),
    });
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `New item added to inventory: ${validatedFields.data.name}`,
        type: "INVENTORY_ADDED",
        link: `/inventory`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/inventory');
    return { message: 'Item added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding inventory item:', error);
    return { message: 'Failed to add item.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

/**
 * Updates an existing inventory item.
 * @param {string} itemId - The ID of the item to update.
 * @param {InventoryFormValues} values - The new data for the inventory item.
 * @returns {Promise<{message: string, errors: object|null}>} An object containing a success or error message.
 */
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
    await updateDoc(itemRef, {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
    });
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `Inventory item updated: ${validatedFields.data.name}`,
        type: "INVENTORY_UPDATED",
        link: `/inventory`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/inventory');
    return { message: 'Item updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating inventory item:', error);
    return { message: 'Failed to update item.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

/**
 * Deletes an inventory item from Firestore.
 * @param {string} itemId - The ID of the item to delete.
 * @returns {Promise<{success: boolean, message: string}>} An object indicating success or failure.
 */
export async function deleteInventoryItem(itemId: string) {
  if (!itemId) {
    return { success: false, message: 'Item ID is required.' };
  }

  try {
    const itemRef = doc(firestore, 'inventory', itemId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) {
        return { success: false, message: 'Item not found.' };
    }
    const itemName = itemSnap.data().name;

    await deleteDoc(itemRef);

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Inventory item deleted: ${itemName}`,
        type: "INVENTORY_DELETED",
        link: `/inventory`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/inventory');
    return { success: true, message: 'Item deleted successfully.' };
  } catch (error) {
    console.error('Error deleting item:', error);
    return { success: false, message: 'Failed to delete item.' };
  }
}


const adjustStockFormSchema = z.object({
  adjustment: z.coerce.number().int().refine(val => val !== 0, { message: "Adjustment cannot be zero." }),
});

export type AdjustStockFormValues = z.infer<typeof adjustStockFormSchema>;

/**
 * Adjusts the stock quantity of an inventory item within a Firestore transaction.
 * @param {string} itemId - The ID of the item to adjust.
 * @param {AdjustStockFormValues} values - The adjustment value (can be positive or negative).
 * @returns {Promise<{message: string, errors: object|null}>} An object containing a success or error message.
 */
export async function adjustStock(itemId: string, values: AdjustStockFormValues) {
  if (!itemId) {
    return { message: 'Item ID is required.', errors: { _server: ['Item ID not provided.'] } };
  }

  const validatedFields = adjustStockFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  const { adjustment } = validatedFields.data;

  try {
    const itemRef = doc(firestore, 'inventory', itemId);
    let itemName = '';
    
    await runTransaction(firestore, async (transaction) => {
      const itemDoc = await transaction.get(itemRef);
      if (!itemDoc.exists()) {
        throw new Error("Item not found.");
      }

      itemName = itemDoc.data().name;
      const currentQuantity = itemDoc.data().quantity;
      const newQuantity = currentQuantity + adjustment;

      if (newQuantity < 0) {
        throw new Error("Stock quantity cannot be negative.");
      }

      let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
      if (newQuantity <= 0) {
        newStatus = 'Out of Stock';
      } else if (newQuantity <= 10) {
        newStatus = 'Low Stock';
      } else {
        newStatus = 'In Stock';
      }

      transaction.update(itemRef, { quantity: newQuantity, status: newStatus });
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Stock for "${itemName}" adjusted by ${adjustment > 0 ? '+' : ''}${adjustment}`,
        type: "INVENTORY_ADJUSTED",
        link: `/inventory`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/inventory');
    return { message: 'Stock adjusted successfully.', errors: null };
  } catch (error: any) {
    console.error('Error adjusting stock:', error);
    return { message: error.message || 'Failed to adjust stock.', errors: { _server: [error.message || 'An unexpected error occurred.'] } };
  }
}
