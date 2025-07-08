
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const maintenanceLogFormSchema = z.object({
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  type: z.string().min(1, "Type is required."),
  description: z.string().min(5, "Description must be at least 5 characters long."),
  cost: z.coerce.number().optional(),
  completedBy: z.string().optional(),
});

export type MaintenanceLogFormValues = z.infer<typeof maintenanceLogFormSchema>;

export async function addMaintenanceLog(assetId: string, values: MaintenanceLogFormValues) {
  if (!assetId) {
    return {
      errors: { _server: ['Asset ID is required.'] },
      message: 'Asset ID is missing.',
    };
  }

  const validatedFields = maintenanceLogFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const assetRef = doc(firestore, 'assets', assetId);
    const assetSnap = await getDoc(assetRef);
    if (!assetSnap.exists()) {
      throw new Error("Asset not found.");
    }
    const assetName = assetSnap.data().name;

    const logRef = collection(firestore, 'assets', assetId, 'maintenanceLogs');
    await addDoc(logRef, {
      ...validatedFields.data,
      date: new Date(validatedFields.data.date),
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Maintenance logged for asset: ${assetName}`,
        type: "ASSET_MAINTENANCE_LOGGED",
        link: `/assets/${assetId}`,
        timestamp: serverTimestamp(),
    });
    
    revalidatePath(`/assets/${assetId}`);
    return { message: 'Maintenance log added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding maintenance log:', error);
    return { message: 'Failed to add log.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}
