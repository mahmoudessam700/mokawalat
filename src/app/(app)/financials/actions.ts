'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const transactionFormSchema = z.object({
  description: z.string().min(2, "Description must be at least 2 characters long."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  type: z.enum(["Income", "Expense"]),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  projectId: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export async function addTransaction(values: TransactionFormValues) {
  const validatedFields = transactionFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    await addDoc(collection(firestore, 'transactions'), {
        ...validatedFields.data,
        date: new Date(validatedFields.data.date),
        createdAt: serverTimestamp(),
    });
    revalidatePath('/financials');
    return { message: 'Transaction added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding transaction:', error);
    return { message: 'Failed to add transaction.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

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
    revalidatePath('/financials');
    return { message: 'Transaction updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating transaction:', error);
    return { message: 'Failed to update transaction.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteTransaction(transactionId: string) {
  if (!transactionId) {
    return { success: false, message: 'Transaction ID is required.' };
  }

  try {
    await deleteDoc(doc(firestore, 'transactions', transactionId));
    revalidatePath('/financials');
    return { success: true, message: 'Transaction deleted successfully.' };
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return { success: false, message: 'Failed to delete transaction.' };
  }
}
