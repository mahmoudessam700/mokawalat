
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const accountFormSchema = z.object({
  name: z.string().min(2, "Account name must be at least 2 characters long."),
  bankName: z.string().min(2, "Bank name is required."),
  accountNumber: z.string().optional(),
  initialBalance: z.coerce.number(),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

export async function addAccount(values: AccountFormValues) {
  const validatedFields = accountFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    await addDoc(collection(firestore, 'accounts'), {
      ...validatedFields.data,
      createdAt: serverTimestamp(),
    });
    revalidatePath('/financials/accounts');
    revalidatePath('/financials');
    return { message: 'Account added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding account:', error);
    return { message: 'Failed to add account.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateAccount(accountId: string, values: AccountFormValues) {
  if (!accountId) {
    return { message: 'Account ID is required.', errors: { _server: ['Account ID not provided.'] } };
  }

  const validatedFields = accountFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const accountRef = doc(firestore, 'accounts', accountId);
    await updateDoc(accountRef, validatedFields.data);
    revalidatePath('/financials/accounts');
    revalidatePath('/financials');
    return { message: 'Account updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating account:', error);
    return { message: 'Failed to update account.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteAccount(accountId: string) {
  if (!accountId) {
    return { success: false, message: 'Account ID is required.' };
  }
  
  const transactionsQuery = query(collection(firestore, 'transactions'), where('accountId', '==', accountId));
  const transactionsSnapshot = await getDocs(transactionsQuery);

  if (!transactionsSnapshot.empty) {
    return { success: false, message: 'Cannot delete account with existing transactions. Please re-assign them first.' };
  }

  try {
    await deleteDoc(doc(firestore, 'accounts', accountId));
    revalidatePath('/financials/accounts');
    revalidatePath('/financials');
    return { success: true, message: 'Account deleted successfully.' };
  } catch (error) {
    console.error('Error deleting account:', error);
    return { success: false, message: 'Failed to delete account.' };
  }
}
