
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, runTransaction, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const materialRequestFormSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});

export type MaterialRequestFormValues = z.infer<typeof materialRequestFormSchema>;

export async function addMaterialRequest(projectId: string, values: MaterialRequestFormValues) {
  if (!projectId) {
    return { message: 'Project ID is required.', errors: { _server: ['Project ID not provided.'] } };
  }

  const validatedFields = materialRequestFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }
  
  try {
    const itemRef = doc(firestore, 'inventory', validatedFields.data.itemId);
    const itemDoc = await getDoc(itemRef);

    if (!itemDoc.exists()) {
        return { message: 'Selected inventory item not found.', errors: { itemId: ['Invalid item selected.'] } };
    }
    
    const itemName = itemDoc.data().name;

    await addDoc(collection(firestore, 'materialRequests'), {
      ...validatedFields.data,
      projectId,
      itemName,
      status: 'Pending',
      requestedAt: serverTimestamp(),
    });
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `Material request for ${itemName} created for project`,
        type: "MATERIAL_REQUESTED",
        link: `/projects/${projectId}`,
        timestamp: serverTimestamp(),
    });
    
    revalidatePath(`/projects/${projectId}`);
    return { message: 'Material request submitted successfully.', errors: null };
  } catch (error) {
    console.error('Error adding material request:', error);
    return { message: 'Failed to submit material request.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateMaterialRequestStatus(requestId: string, newStatus: 'Approved' | 'Rejected') {
  if (!requestId) {
    return { success: false, message: 'Request ID is required.' };
  }
  
  const requestRef = doc(firestore, 'materialRequests', requestId);

  try {
    const requestSnapshot = await getDoc(requestRef);
    if (!requestSnapshot.exists()) {
      throw new Error("Request not found.");
    }
    const requestData = requestSnapshot.data();
    const projectId = requestData.projectId;
    const itemName = requestData.itemName;

    if (newStatus === 'Approved') {
        await runTransaction(firestore, async (transaction) => {
            const freshRequestDoc = await transaction.get(requestRef);
            if (!freshRequestDoc.exists()) throw new Error("Request disappeared during transaction.");
            const freshRequestData = freshRequestDoc.data();
            
            if (freshRequestData.status !== 'Pending') {
                throw new Error("This request has already been actioned.");
            }

            const itemRef = doc(firestore, 'inventory', freshRequestData.itemId);
            const itemDoc = await transaction.get(itemRef);

            if (!itemDoc.exists()) {
                throw new Error("Inventory item not found.");
            }
            
            const currentQuantity = itemDoc.data().quantity;
            const newQuantity = currentQuantity - freshRequestData.quantity;

            if (newQuantity < 0) {
                throw new Error(`Insufficient stock for ${itemDoc.data().name}. Required: ${freshRequestData.quantity}, Available: ${currentQuantity}.`);
            }
            
            let newItemStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
            if (newQuantity <= 0) {
                newItemStatus = 'Out of Stock';
            } else if (newQuantity <= 10) {
                newItemStatus = 'Low Stock';
            } else {
                newItemStatus = 'In Stock';
            }

            transaction.update(itemRef, { quantity: newQuantity, status: newItemStatus });
            transaction.update(requestRef, { status: 'Approved' });
        });
    } else { // 'Rejected'
        await updateDoc(requestRef, { status: 'Rejected' });
    }

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Material request for "${itemName}" was ${newStatus.toLowerCase()}`,
        type: newStatus === 'Approved' ? "MATERIAL_REQUEST_APPROVED" : "MATERIAL_REQUEST_REJECTED",
        link: `/projects/${projectId}`,
        timestamp: serverTimestamp(),
    });

    if (projectId) {
        revalidatePath(`/projects/${projectId}`);
    }
    revalidatePath('/material-requests');
    revalidatePath('/approvals');
    revalidatePath('/inventory');

    return { success: true, message: `Request has been ${newStatus.toLowerCase()}.` };

  } catch (error: any) {
    console.error('Error updating material request:', error);
    return { success: false, message: error.message || 'Failed to update request status.' };
  }
}
