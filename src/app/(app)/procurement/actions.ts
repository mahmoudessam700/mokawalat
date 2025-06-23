
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, runTransaction } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const procurementFormSchema = z.object({
  itemId: z.string().min(1, "Item is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  supplierId: z.string().min(1, "Supplier is required."),
  projectId: z.string().min(1, "Project is required."),
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
    const itemRef = doc(firestore, 'inventory', validatedFields.data.itemId);
    const itemDoc = await getDoc(itemRef);

    if (!itemDoc.exists()) {
        return { message: 'Selected inventory item not found.', errors: { itemId: ['Invalid item selected.'] } };
    }
    
    const itemName = itemDoc.data().name;

    const poRef = await addDoc(collection(firestore, 'procurement'), {
      ...validatedFields.data,
      itemName,
      status: 'Pending',
      requestedAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New PO created for ${itemName}`,
        type: "PO_CREATED",
        link: `/procurement/${poRef.id}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/procurement');
    return { message: 'Purchase order created successfully.', errors: null };
  } catch (error) {
    console.error('Error creating purchase order:', error);
    return { message: 'Failed to create purchase order.', errors: { _server: ['An unexpected error occurred.'] } };
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
        const itemRef = doc(firestore, 'inventory', validatedFields.data.itemId);
        const itemDoc = await getDoc(itemRef);

        if (!itemDoc.exists()) {
            return { message: 'Selected inventory item not found.', errors: { itemId: ['Invalid item selected.'] } };
        }
        
        const itemName = itemDoc.data().name;

        const requestRef = doc(firestore, 'procurement', requestId);
        await updateDoc(requestRef, {
            ...validatedFields.data,
            itemName,
        });

        revalidatePath('/procurement');
        revalidatePath(`/procurement/${requestId}`);
        return { message: 'Purchase order updated successfully.', errors: null };
    } catch (error) {
        console.error('Error updating purchase order:', error);
        return { message: 'Failed to update purchase order.', errors: { _server: ['An unexpected error occurred.'] } };
    }
}

export async function deletePurchaseRequest(requestId: string) {
    if (!requestId) {
        return { success: false, message: 'Request ID is required.' };
    }

    try {
        await deleteDoc(doc(firestore, 'procurement', requestId));
        revalidatePath('/procurement');
        return { success: true, message: 'Purchase order deleted successfully.' };
    } catch (error) {
        console.error('Error deleting purchase order:', error);
        return { success: false, message: 'Failed to delete purchase order.' };
    }
}

export async function updatePurchaseRequestStatus(requestId: string, newStatus: 'Approved' | 'Rejected' | 'Ordered') {
  if (!requestId) {
    return { success: false, message: 'Request ID is required.' };
  }
  
  const requestRef = doc(firestore, 'procurement', requestId);

  try {
    const poDoc = await getDoc(requestRef);
    if (!poDoc.exists()) {
      throw new Error("Purchase Order not found.");
    }

    const currentStatus = poDoc.data().status;

    const allowedTransitions: { [key: string]: string[] } = {
        'Pending': ['Approved', 'Rejected'],
        'Approved': ['Ordered'],
    };

    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(newStatus)) {
        throw new Error(`Cannot change status from '${currentStatus}' to '${newStatus}'.`);
    }
    
    await updateDoc(requestRef, { status: newStatus });
    
    revalidatePath('/procurement');
    revalidatePath(`/procurement/${requestId}`);
    return { success: true, message: `Purchase Order status updated to ${newStatus}.` };
  } catch (error: any) {
    console.error('Error updating PO status:', error);
    return { success: false, message: error.message || 'Failed to update status.' };
  }
}


export async function markPOAsReceived(purchaseOrderId: string) {
    if (!purchaseOrderId) {
        return { success: false, message: 'Purchase Order ID is required.' };
    }

    const poRef = doc(firestore, 'procurement', purchaseOrderId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const poDoc = await transaction.get(poRef);
            if (!poDoc.exists()) {
                throw new Error("Purchase order not found.");
            }
            const poData = poDoc.data();

            if (poData.status !== 'Ordered') {
                throw new Error("Only 'Ordered' purchase orders can be marked as received.");
            }
            if (!poData.itemId) {
                 throw new Error("This purchase order is not linked to a specific inventory item and cannot be automatically received.");
            }

            const itemRef = doc(firestore, 'inventory', poData.itemId);
            const itemDoc = await transaction.get(itemRef);

            if (!itemDoc.exists()) {
                throw new Error("Linked inventory item not found.");
            }

            const currentQuantity = itemDoc.data().quantity;
            const newQuantity = currentQuantity + poData.quantity;

            let newStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
            if (newQuantity <= 0) {
                newStatus = 'Out of Stock';
            } else if (newQuantity <= 10) {
                newStatus = 'Low Stock';
            } else {
                newStatus = 'In Stock';
            }

            transaction.update(itemRef, { quantity: newQuantity, status: newStatus });
            transaction.update(poRef, { status: 'Received' });
        });

        revalidatePath('/procurement');
        revalidatePath('/inventory');
        return { success: true, message: 'Order marked as received and inventory updated.' };

    } catch (error: any) {
        console.error('Error receiving purchase order:', error);
        return { success: false, message: error.message || 'Failed to process receipt.' };
    }
}
