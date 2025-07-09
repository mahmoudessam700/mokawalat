
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, where, getDocs, getDoc } from 'firebase/firestore';
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
    const clientRef = await addDoc(collection(firestore, 'clients'), {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New client added: ${validatedFields.data.name}`,
        type: "CLIENT_ADDED",
        link: `/clients/${clientRef.id}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/clients');
    return { message: 'Client added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding client:', error);
    return { message: 'Failed to add client.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateClient(clientId: string, values: ClientFormValues) {
  if (!clientId) {
    return { message: 'Client ID is required.', errors: { _server: ['Client ID not provided.'] } };
  }

  const validatedFields = clientFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const clientRef = doc(firestore, 'clients', clientId);
    await updateDoc(clientRef, {
      ...validatedFields.data,
      name_lowercase: validatedFields.data.name.toLowerCase(),
    });
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `Client updated: ${validatedFields.data.name}`,
        type: "CLIENT_UPDATED",
        link: `/clients/${clientId}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/clients');
    revalidatePath(`/clients/${clientId}`);
    return { message: 'Client updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating client:', error);
    return { message: 'Failed to update client.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteClient(clientId: string) {
  if (!clientId) {
    return { success: false, message: 'Client ID is required.' };
  }

  try {
    const clientRef = doc(firestore, 'clients', clientId);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) {
        return { success: false, message: 'Client not found.' };
    }
    const clientName = clientSnap.data().name;

    // Check for linked projects
    const projectsQuery = query(collection(firestore, 'projects'), where('clientId', '==', clientId));
    const projectsSnapshot = await getDocs(projectsQuery);
    if (!projectsSnapshot.empty) {
      return { success: false, message: 'Cannot delete client with active projects. Please re-assign them first.' };
    }

    // Check for linked transactions
    const transactionsQuery = query(collection(firestore, 'transactions'), where('clientId', '==', clientId));
    const transactionsSnapshot = await getDocs(transactionsQuery);
    if (!transactionsSnapshot.empty) {
      return { success: false, message: 'Cannot delete client with existing financial transactions.' };
    }

    await deleteDoc(clientRef);

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Client deleted: ${clientName}`,
        type: "CLIENT_DELETED",
        link: `/clients`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/clients');
    return { success: true, message: 'Client deleted successfully.' };
  } catch (error) {
    console.error('Error deleting client:', error);
    return { success: false, message: 'Failed to delete client.' };
  }
}
