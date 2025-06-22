'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const clientFormSchema = z.object({
  name: z.string().min(2, "Client name must be at least 2 characters long."),
  company: z.string().optional(),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
  status: z.enum(["Lead", "Active", "Inactive"]),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export async function addClient(values: ClientFormValues) {
  const validatedFields = clientFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    await addDoc(collection(firestore, 'clients'), {
      ...validatedFields.data,
      createdAt: serverTimestamp(),
    });
    revalidatePath('/clients');
    return { message: 'Client added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding client:', error);
    return { message: 'Failed to add client.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteClient(clientId: string) {
  if (!clientId) {
    return { success: false, message: 'Client ID is required.' };
  }

  try {
    await deleteDoc(doc(firestore, 'clients', clientId));
    revalidatePath('/clients');
    return { success: true, message: 'Client deleted successfully.' };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, message: 'Failed to delete client.' };
  }
}
