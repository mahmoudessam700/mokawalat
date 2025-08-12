
'use server';
/**
 * @fileoverview Server actions for the Financials module.
 * This file contains functions for adding, updating, and deleting financial transactions.
 * It handles data validation, database interactions with Firestore, and revalidates relevant Next.js caches.
 */

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { sendBudgetAlertWebhooks } from '@/lib/alerts';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const transactionFormSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters long."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  type: z.enum(["Income", "Expense"]),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  accountId: z.string().min(1, "An account is required."),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  supplierId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  contractId: z.string().optional(),
  contractType: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

/**
 * Adds a new financial transaction to Firestore.
 * @param {TransactionFormValues} values - The transaction data, validated against transactionFormSchema.
 * @returns {Promise<{message: string, errors: object|null}>} An object containing a success or error message.
 */
export async function addTransaction(values: TransactionFormValues) {
  const validatedFields = transactionFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
  const createdRef = await addDoc(collection(firestore, 'transactions'), {
        ...validatedFields.data,
        date: new Date(validatedFields.data.date),
        createdAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `${validatedFields.data.type} of ${validatedFields.data.amount.toLocaleString()} recorded: ${validatedFields.data.description}`,
        type: "TRANSACTION_ADDED",
        link: `/financials`,
        timestamp: serverTimestamp(),
    });

    // If this is a project expense, check budget thresholds and log alerts
    if (validatedFields.data.type === 'Expense' && validatedFields.data.projectId) {
      try {
        const projectRef = doc(firestore, 'projects', validatedFields.data.projectId);
        const projectSnap = await getDoc(projectRef);
        if (projectSnap.exists()) {
          const projectData = projectSnap.data() as { name?: string; budget?: number };
          const budget = Math.max(0, Number(projectData.budget || 0));
          if (budget > 0) {
            const txQ = query(collection(firestore, 'transactions'), where('projectId', '==', validatedFields.data.projectId));
            const txSnap = await getDocs(txQ);
            const totalExpense = txSnap.docs
              .map(d => d.data() as any)
              .filter(d => d.type === 'Expense')
              .reduce((sum, d) => sum + Number(d.amount || 0), 0);
            const prevTotal = totalExpense - Number(validatedFields.data.amount || 0);
            const prevPct = budget ? (prevTotal / budget) * 100 : 0;
            const newPct = budget ? (totalExpense / budget) * 100 : 0;
            const thresholds = [75, 90, 100];
            for (const th of thresholds) {
              if (prevPct < th && newPct >= th) {
                await addDoc(collection(firestore, 'activityLog'), {
                  message: `Budget alert: Project "${projectData.name || validatedFields.data.projectId}" reached ${th}% of budget`,
                  type: 'BUDGET_ALERT',
                  link: `/projects/${validatedFields.data.projectId}`,
                  projectId: validatedFields.data.projectId,
                  threshold: th,
                  timestamp: serverTimestamp(),
                });
                // Fire optional webhooks
                await sendBudgetAlertWebhooks({
                  projectId: validatedFields.data.projectId,
                  projectName: projectData.name,
                  threshold: th,
                  budget,
                  totalExpense,
                  percent: newPct,
                  link: `/projects/${validatedFields.data.projectId}`,
                });
              }
            }
            // revalidate project page since budget status may change
            revalidatePath(`/projects/${validatedFields.data.projectId}`);
          }
        }
      } catch (e) {
        console.warn('Budget alert check failed:', e);
      }
    }

    revalidatePath('/financials');
    revalidatePath('/financials/accounts');
    if (validatedFields.data.clientId) revalidatePath(`/clients/${validatedFields.data.clientId}`);
    if (validatedFields.data.supplierId) revalidatePath(`/suppliers/${validatedFields.data.supplierId}`);
    if (validatedFields.data.purchaseOrderId) {
        revalidatePath(`/procurement/${validatedFields.data.purchaseOrderId}`);
        revalidatePath('/procurement');
    }
    return { message: 'Transaction added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding transaction:', error);
    return { message: 'Failed to add transaction.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

/**
 * Updates an existing financial transaction in Firestore.
 * @param {string} transactionId - The ID of the transaction to update.
 * @param {TransactionFormValues} values - The new transaction data.
 * @returns {Promise<{message: string, errors: object|null}>} An object containing a success or error message.
 */
export async function updateTransaction(transactionId: string, values: TransactionFormValues) {
  if (!transactionId) {
    return { message: 'Transaction ID is required.', errors: { _server: ['Transaction ID not provided.'] } };
  }

  const validatedFields = transactionFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const transactionRef = doc(firestore, 'transactions', transactionId);
    await updateDoc(transactionRef, {
      ...validatedFields.data,
      date: new Date(validatedFields.data.date),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Transaction updated: ${validatedFields.data.description}`,
        type: "TRANSACTION_UPDATED",
        link: `/financials`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/financials');
    revalidatePath('/financials/accounts');
    if (validatedFields.data.clientId) revalidatePath(`/clients/${validatedFields.data.clientId}`);
    if (validatedFields.data.supplierId) revalidatePath(`/suppliers/${validatedFields.data.supplierId}`);
    if (validatedFields.data.purchaseOrderId) {
        revalidatePath(`/procurement/${validatedFields.data.purchaseOrderId}`);
        revalidatePath('/procurement');
    }
    return { message: 'Transaction updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { message: 'Failed to update transaction.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

/**
 * Deletes a financial transaction from Firestore.
 * @param {string} transactionId - The ID of the transaction to delete.
 * @returns {Promise<{success: boolean, message: string}>} An object indicating success or failure.
 */
export async function deleteTransaction(transactionId: string) {
  if (!transactionId) {
    return { success: false, message: 'Transaction ID is required.' };
  }

  try {
    const transactionRef = doc(firestore, 'transactions', transactionId);
    const transactionSnap = await getDoc(transactionRef);

    if (transactionSnap.exists()) {
        const transactionData = transactionSnap.data();
        await addDoc(collection(firestore, 'activityLog'), {
            message: `Transaction deleted: ${transactionData.description}`,
            type: "TRANSACTION_DELETED",
            link: `/financials`,
            timestamp: serverTimestamp(),
        });
    }

    await deleteDoc(transactionRef);
    
    revalidatePath('/financials');
    revalidatePath('/financials/accounts');
    revalidatePath('/clients');
    revalidatePath('/suppliers');
    revalidatePath('/procurement');
    return { success: true, message: 'Transaction deleted successfully.' };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, message: 'Failed to delete transaction.' };
  }
}
