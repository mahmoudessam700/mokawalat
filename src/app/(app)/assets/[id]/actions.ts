
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
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
    const logRef = collection(firestore, 'assets', assetId, 'maintenanceLogs');
    await addDoc(logRef, {
      ...validatedFields.data,
      date: new Date(validatedFields.data.date),
      createdAt: serverTimestamp(),
    });
    
    revalidatePath(`/assets/${assetId}`);
    return { message: 'Maintenance log added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding maintenance log:', error);
    return { message: 'Failed to add log.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}
