
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const procurementFormSchema = z.object({
  itemName: z.string().min(2, "Item name must be at least 2 characters long."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  supplierId: z.string().min(1, "Supplier is required."),
  projectId: z.string().min(1, "Project is required."),
  status: z.enum(["Pending", "Approved", "Rejected", "Ordered"]),
});

export type ProcurementFormValues = z.infer<typeof procurementFormSchema>;

export async function addPurchaseRequest(values: ProcurementFormValues) {
  const validatedFields = procurementFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    await addDoc(collection(firestore, 'procurement'), {
      ...validatedFields.data,
      requestedAt: serverTimestamp(),
    });
    revalidatePath('/procurement');
    return { message: 'Purchase request created successfully.', errors: null };
  } catch (error) {
    console.error('Error creating purchase request:', error);
    return { message: 'Failed to create purchase request.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updatePurchaseRequest(requestId: string, values: ProcurementFormValues) {
    if (!requestId) {
        return { message: 'Request ID is required.', errors: { _server: ['Request ID not provided.'] } };
    }

    const validatedFields = procurementFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Invalid data provided. Please check the form.',
        };
    }

    try {
        const requestRef = doc(firestore, 'procurement', requestId);
        await updateDoc(requestRef, validatedFields.data);
        revalidatePath('/procurement');
        revalidatePath(`/procurement/${requestId}`);
        return { message: 'Purchase request updated successfully.', errors: null };
    } catch (error) {
        console.error('Error updating purchase request:', error);
        return { message: 'Failed to update purchase request.', errors: { _server: ['An unexpected error occurred.'] } };
    }
}

export async function deletePurchaseRequest(requestId: string) {
    if (!requestId) {
        return { success: false, message: 'Request ID is required.' };
    }

    try {
        await deleteDoc(doc(firestore, 'procurement', requestId));
        revalidatePath('/procurement');
        return { success: true, message: 'Purchase request deleted successfully.' };
    } catch (error) {
        console.error('Error deleting purchase request:', error);
        return { success: false, message: 'Failed to delete purchase request.' };
    }
}
