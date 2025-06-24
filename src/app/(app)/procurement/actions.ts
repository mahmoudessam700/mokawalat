
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, runTransaction, query, where, getDocs, limit, writeBatch } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const procurementFormSchema = z.object({
  itemId: z.string().min(1, "Item is required."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  unitCost: z.coerce.number().min(0, "Unit cost must be a non-negative number."),
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
    const totalCost = validatedFields.data.quantity * validatedFields.data.unitCost;

    const poRef = await addDoc(collection(firestore, 'procurement'), {
      ...validatedFields.data,
      itemName,
      totalCost,
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
        const totalCost = validatedFields.data.quantity * validatedFields.data.unitCost;

        const requestRef = doc(firestore, 'procurement', requestId);
        await updateDoc(requestRef, {
            ...validatedFields.data,
            itemName,
            totalCost,
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
        const requestRef = doc(firestore, 'procurement', requestId);
        const requestSnap = await getDoc(requestRef);
        if (!requestSnap.exists()) {
            return { success: false, message: 'Purchase order not found.' };
        }
        const poName = requestSnap.data().itemName;
        
        await deleteDoc(requestRef);

        await addDoc(collection(firestore, 'activityLog'), {
            message: `Purchase Order deleted for: ${poName}`,
            type: "PO_DELETED",
            link: `/procurement`,
            timestamp: serverTimestamp(),
        });

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
    const poData = poDoc.data();
    const currentStatus = poData.status;

    const allowedTransitions: { [key: string]: string[] } = {
        'Pending': ['Approved', 'Rejected'],
        'Approved': ['Ordered'],
    };

    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(newStatus)) {
        throw new Error(`Cannot change status from '${currentStatus}' to '${newStatus}'.`);
    }
    
    if (newStatus === 'Ordered') {
        const transactionsQuery = query(collection(firestore, 'transactions'), where('purchaseOrderId', '==', requestId), limit(1));
        const transactionSnapshot = await getDocs(transactionsQuery);
        
        if (!transactionSnapshot.empty) {
            await updateDoc(requestRef, { status: newStatus });
        } else {
            const accountsQuery = query(collection(firestore, 'accounts'), limit(1));
            const accountsSnap = await getDocs(accountsQuery);
            if (accountsSnap.empty) {
                throw new Error("No bank accounts found. Please add an account in Financials > Manage Accounts before ordering.");
            }
            const accountId = accountsSnap.docs[0].id;
            
            const batch = writeBatch(firestore);

            // 1. Update PO status
            batch.update(requestRef, { status: newStatus });

            // 2. Create new transaction
            const newTransactionRef = doc(collection(firestore, 'transactions'));
            batch.set(newTransactionRef, {
                description: `Purchase Order for: ${poData.itemName}`,
                amount: poData.totalCost,
                type: 'Expense',
                date: serverTimestamp(),
                accountId: accountId,
                projectId: poData.projectId,
                supplierId: poData.supplierId,
                purchaseOrderId: requestId,
                createdAt: serverTimestamp(),
            });
            
            // 3. Log the financial transaction
            const activityLogRef = doc(collection(firestore, 'activityLog'));
            batch.set(activityLogRef, {
                message: `Expense of ${poData.totalCost.toLocaleString()} recorded for PO: ${poData.itemName}`,
                type: "TRANSACTION_ADDED",
                link: `/financials`,
                timestamp: serverTimestamp(),
            });

            await batch.commit();
        }
    } else {
        await updateDoc(requestRef, { status: newStatus });
    }
    
    const poDocForLog = await getDoc(requestRef);
    if (poDocForLog.exists()) {
      const poDataForLog = poDocForLog.data();
      await addDoc(collection(firestore, 'activityLog'), {
          message: `PO for "${poDataForLog.itemName}" status changed to ${newStatus}`,
          type: "PO_STATUS_CHANGED",
          link: `/procurement/${requestId}`,
          timestamp: serverTimestamp(),
      });
    }
    
    revalidatePath('/procurement');
    revalidatePath(`/procurement/${requestId}`);
    revalidatePath('/financials');
    revalidatePath('/financials/accounts');

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

            transaction.update(itemRef, { quantity: newQuantity, status: newItemStatus });
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
