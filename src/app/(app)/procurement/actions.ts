
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, runTransaction, query, where, getDocs, limit, writeBatch } from 'firebase/firestore';
import { sendBudgetAlertWebhooks } from '@/lib/alerts';
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

// New schema for the dialog form
const orderPoFormSchema = z.object({
  accountId: z.string().min(1, 'A bank account is required.'),
});
export type OrderPoFormValues = z.infer<typeof orderPoFormSchema>;


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

        await addDoc(collection(firestore, 'activityLog'), {
            message: `PO updated for: ${itemName}`,
            type: "PO_UPDATED",
            link: `/procurement/${requestId}`,
            timestamp: serverTimestamp(),
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
    const poData = requestSnap.data();
    const poName = poData.itemName;

    // Only allow deleting Pending requests to keep history consistent
    if (poData.status && poData.status !== 'Pending') {
      return { success: false, message: `Cannot delete a ${poData.status} purchase order. Only Pending requests can be deleted.` };
    }
        
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

export async function orderAndPayPurchaseRequest(requestId: string, values: OrderPoFormValues) {
  if (!requestId) {
    return { success: false, message: 'Request ID is required.' };
  }

  const validatedFields = orderPoFormSchema.safeParse(values);
  if (!validatedFields.success) {
      return { success: false, message: 'Invalid data provided.' };
  }

  const { accountId } = validatedFields.data;
  const requestRef = doc(firestore, 'procurement', requestId);
  
  try {
    const poDoc = await getDoc(requestRef);
    if (!poDoc.exists()) {
      throw new Error("Purchase Order not found.");
    }
    const poData = poDoc.data();

    if (poData.status !== 'Approved') {
      throw new Error("Only 'Approved' purchase orders can be ordered and paid.");
    }

    const batch = writeBatch(firestore);

    // 1. Update PO status to 'Ordered'
    batch.update(requestRef, { status: 'Ordered' });

    // 2. Create new Expense transaction
    const newTransactionRef = doc(collection(firestore, 'transactions'));
    batch.set(newTransactionRef, {
        description: `Payment for PO: ${poData.itemName}`,
        amount: poData.totalCost,
        type: 'Expense',
        date: serverTimestamp(),
        accountId,
        projectId: poData.projectId,
        supplierId: poData.supplierId,
        purchaseOrderId: requestId,
        createdAt: serverTimestamp(),
    });

    // 3. Log the status change
    const statusLogRef = doc(collection(firestore, 'activityLog'));
    batch.set(statusLogRef, {
        message: `PO for "${poData.itemName}" status changed to Ordered`,
        type: "PO_STATUS_CHANGED",
        link: `/procurement/${requestId}`,
        timestamp: serverTimestamp(),
    });

    // 4. Log the financial transaction
    const transactionLogRef = doc(collection(firestore, 'activityLog'));
    batch.set(transactionLogRef, {
        message: `Expense of ${poData.totalCost.toLocaleString()} recorded for PO: ${poData.itemName}`,
        type: "TRANSACTION_ADDED",
        link: `/financials`,
        timestamp: serverTimestamp(),
    });

  await batch.commit();

    revalidatePath('/procurement');
    revalidatePath(`/procurement/${requestId}`);
    revalidatePath('/financials');
    revalidatePath('/financials/accounts');
    if (poData.projectId) {
      try {
        // After expense creation, compute budget threshold crossing similarly to financials/actions
        const projectRef = doc(firestore, 'projects', poData.projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const projectData = projectSnap.data() as { name?: string; budget?: number };
          const budget = Math.max(0, Number(projectData.budget || 0));
          if (budget > 0) {
            const txQ = query(collection(firestore, 'transactions'), where('projectId', '==', poData.projectId));
            const txSnap = await getDocs(txQ);
            const totalExpense = txSnap.docs
              .map(d => d.data() as any)
              .filter(d => d.type === 'Expense')
              .reduce((sum, d) => sum + Number(d.amount || 0), 0);
            const prevTotal = totalExpense - Number(poData.totalCost || 0);
            const prevPct = budget ? (prevTotal / budget) * 100 : 0;
            const newPct = budget ? (totalExpense / budget) * 100 : 0;
            const thresholds = [75, 90, 100];
            for (const th of thresholds) {
              if (prevPct < th && newPct >= th) {
                await addDoc(collection(firestore, 'activityLog'), {
                  message: `Budget alert: Project "${projectData.name || poData.projectId}" reached ${th}% of budget`,
                  type: 'BUDGET_ALERT',
                  link: `/projects/${poData.projectId}`,
                  projectId: poData.projectId,
                  threshold: th,
                  timestamp: serverTimestamp(),
                });
                await sendBudgetAlertWebhooks({
                  projectId: poData.projectId,
                  projectName: projectData.name,
                  threshold: th,
                  budget,
                  totalExpense,
                  percent: newPct,
                  link: `/projects/${poData.projectId}`,
                });
              }
            }
            revalidatePath(`/projects/${poData.projectId}`);
          }
        }
      } catch (e) {
        console.warn('Budget alert check (PO) failed:', e);
      }
    }
    revalidatePath('/approvals');

    return { success: true, message: 'Purchase Order marked as Ordered and payment transaction created.' };
  } catch (error: any) {
    console.error('Error ordering PO:', error);
    return { success: false, message: error.message || 'Failed to update status and create transaction.' };
  }
}


export async function updatePurchaseRequestStatus(requestId: string, newStatus: 'Approved' | 'Rejected') {
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

    if (poData.status !== 'Pending') {
        throw new Error(`Cannot change status from '${poData.status}' to '${newStatus}'. Only pending requests can be actioned here.`);
    }
    
    await updateDoc(requestRef, { status: newStatus });
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `PO for "${poData.itemName}" status changed to ${newStatus}`,
        type: "PO_STATUS_CHANGED",
        link: `/procurement/${requestId}`,
        timestamp: serverTimestamp(),
    });
    
    revalidatePath('/procurement');
    revalidatePath(`/procurement/${requestId}`);
    revalidatePath('/approvals');

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
        let poDataForLog: any;
        await runTransaction(firestore, async (transaction) => {
            const poDoc = await transaction.get(poRef);
            if (!poDoc.exists()) {
                throw new Error("Purchase order not found.");
            }
            const poData = poDoc.data();
            poDataForLog = poData;

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

      // Update inventory with the computed status
      transaction.update(itemRef, { quantity: newQuantity, status: newStatus });
            transaction.update(poRef, { status: 'Received' });
        });

        if (poDataForLog) {
            await addDoc(collection(firestore, 'activityLog'), {
                message: `PO for "${poDataForLog.itemName}" marked as Received`,
                type: "PO_STATUS_CHANGED",
                link: `/procurement/${purchaseOrderId}`,
                timestamp: serverTimestamp(),
            });
        }

  revalidatePath('/procurement');
  revalidatePath(`/procurement/${purchaseOrderId}`);
  revalidatePath('/inventory');
        return { success: true, message: 'Order marked as received and inventory updated.' };

    } catch (error: any) {
        console.error('Error receiving purchase order:', error);
        return { success: false, message: error.message || 'Failed to process receipt.' };
    }
}
