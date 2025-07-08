
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, where, getDocs, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const assetFormSchema = z.object({
  name: z.string().min(2, "Asset name must be at least 2 characters long."),
  category: z.string().min(1, "Category is required."),
  status: z.enum(["Available", "In Use", "Under Maintenance", "Decommissioned"]),
  purchaseDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  purchaseCost: z.coerce.number().min(0, "Purchase cost must be a non-negative number."),
  currentProjectId: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export async function addAsset(values: AssetFormValues) {
  const validatedFields = assetFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const assetRef = await addDoc(collection(firestore, 'assets'), {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
      purchaseDate: new Date(validatedFields.data.purchaseDate),
      nextMaintenanceDate: validatedFields.data.nextMaintenanceDate ? new Date(validatedFields.data.nextMaintenanceDate) : null,
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New asset added: ${validatedFields.data.name}`,
        type: "ASSET_ADDED",
        link: `/assets/${assetRef.id}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/assets');
    return { message: 'Asset added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding asset:', error);
    return { message: 'Failed to add asset.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateAsset(assetId: string, values: AssetFormValues) {
  if (!assetId) {
    return { message: 'Asset ID is required.', errors: { _server: ['Asset ID not provided.'] } };
  }

  const validatedFields = assetFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const assetRef = doc(firestore, 'assets', assetId);
    await updateDoc(assetRef, {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
      purchaseDate: new Date(validatedFields.data.purchaseDate),
      nextMaintenanceDate: validatedFields.data.nextMaintenanceDate ? new Date(validatedFields.data.nextMaintenanceDate) : null,
    });
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `Asset updated: ${validatedFields.data.name}`,
        type: "ASSET_UPDATED",
        link: `/assets/${assetId}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/assets');
    revalidatePath(`/assets/${assetId}`);
    return { message: 'Asset updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating asset:', error);
    return { message: 'Failed to update asset.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteAsset(assetId: string) {
  if (!assetId) {
    return { success: false, message: 'Asset ID is required.' };
  }

  try {
    const assetRef = doc(firestore, 'assets', assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) {
        return { success: false, message: 'Asset not found.' };
    }
    const assetName = assetSnap.data().name;

    await deleteDoc(assetRef);

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Asset deleted: ${assetName}`,
        type: "ASSET_DELETED",
        link: `/assets`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/assets');
    return { success: true, message: 'Asset deleted successfully.' };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return { success: false, message: 'Failed to delete asset.' };
  }
}
