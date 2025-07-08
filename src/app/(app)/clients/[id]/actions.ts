
'use server';

import { firestore, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, Timestamp, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { summarizeClientInteractions } from '@/ai/flows/summarize-client-interactions';
import { format } from 'date-fns';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const interactionFormSchema = z.object({
  type: z.enum(["Call", "Email", "Meeting", "Note"]),
  notes: z.string().min(5, "Notes must be at least 5 characters long."),
  date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
});

export type InteractionFormValues = z.infer<typeof interactionFormSchema>;

export async function addInteraction(clientId: string, values: InteractionFormValues) {
  if (!clientId) {
    return {
      errors: { _server: ['Client ID is required.'] },
      message: 'Client ID is missing.',
    };
  }

  const validatedFields = interactionFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const interactionRef = collection(firestore, 'clients', clientId, 'interactions');
    await addDoc(interactionRef, {
      ...validatedFields.data,
      date: new Date(validatedFields.data.date),
      createdAt: serverTimestamp(),
    });
    
    revalidatePath(`/clients/${clientId}`);
    return { message: 'Interaction logged successfully.', errors: null };
  } catch (error) {
    console.error('Error adding interaction:', error);
    return { message: 'Failed to log interaction.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}


export async function getInteractionSummary(clientId: string) {
    if (!clientId) {
        return { error: true, message: 'Client ID is required.', data: null };
    }

    try {
        const interactionsQuery = query(
            collection(firestore, 'clients', clientId, 'interactions'),
            orderBy('date', 'desc')
        );
        const snapshot = await getDocs(interactionsQuery);
        
        if (snapshot.empty) {
            return { error: false, message: 'No interactions to summarize.', data: { summary: 'This client has no recorded interactions yet.'} };
        }
        
        const interactionLog = snapshot.docs.map(doc => {
            const data = doc.data() as { date: Timestamp; type: string; notes: string };
            const date = data.date ? format(data.date.toDate(), 'PPP') : 'N/A';
            return `- Date: ${date}, Type: ${data.type}\n  Notes: ${data.notes}`;
        }).join('\n\n');

        const result = await summarizeClientInteractions({ interactionLog });
        
        if (result.summary) {
             return { error: false, message: 'Summary generated.', data: result };
        } else {
            return { error: true, message: 'AI could not generate a summary.', data: null };
        }

    } catch(error) {
        console.error('Error generating interaction summary:', error);
        return { error: true, message: 'An unexpected error occurred while generating the summary.', data: null };
    }
}


const contractFormSchema = z.object({
  title: z.string().min(3, 'Contract title must be at least 3 characters long.'),
  effectiveDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  value: z.coerce.number().optional(),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;

export async function addContract(clientId: string, formData: FormData) {
  if (!clientId) {
    return { message: 'Client ID is required.', errors: { _server: ['Client ID is missing.'] } };
  }

  const formValues = {
      title: formData.get('title'),
      effectiveDate: formData.get('effectiveDate'),
      value: formData.get('value') ? Number(formData.get('value')) : undefined,
  }

  const validatedFields = contractFormSchema.safeParse(formValues);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data provided.' };
  }
  
  const file = formData.get('file') as File | null;

  try {
    const newContractRef = doc(collection(firestore, 'clients', clientId, 'contracts'));
    let fileUrl = '';
    let filePath = '';

    if (file && file.size > 0) {
      filePath = `contracts/clients/${clientId}/${newContractRef.id}/${file.name}`;
      const storageRef = ref(storage, filePath);
      await uploadBytes(storageRef, file);
      fileUrl = await getDownloadURL(storageRef);
    }

    const contractData = {
      ...validatedFields.data,
      effectiveDate: new Date(validatedFields.data.effectiveDate),
      fileUrl: fileUrl,
      filePath: filePath,
      createdAt: serverTimestamp(),
    };
    
    await setDoc(newContractRef, contractData);

    const clientSnap = await getDoc(doc(firestore, 'clients', clientId));
    const clientName = clientSnap.exists() ? clientSnap.data().name : 'Unknown Client';
    
    await addDoc(collection(firestore, 'activityLog'), {
        message: `New contract "${validatedFields.data.title}" added for client: ${clientName}`,
        type: "CONTRACT_ADDED",
        link: `/clients/${clientId}`,
        timestamp: serverTimestamp(),
    });

    revalidatePath(`/clients/${clientId}`);
    return { message: 'Contract added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding contract:', error);
    return { message: 'Failed to add contract.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteContract(clientId: string, contractId: string) {
  if (!clientId || !contractId) {
    return { success: false, message: 'Client and Contract ID are required.' };
  }

  try {
    const contractRef = doc(firestore, 'clients', clientId, 'contracts', contractId);
    const contractSnap = await getDoc(contractRef);

    if (contractSnap.exists()) {
        const contractData = contractSnap.data();
        if (contractData.filePath) {
            const fileRef = ref(storage, contractData.filePath);
            await deleteObject(fileRef).catch(err => {
                console.error("Failed to delete contract file from storage:", err);
            });
        }
        await addDoc(collection(firestore, 'activityLog'), {
            message: `Contract "${contractData.title}" deleted from client`,
            type: "CONTRACT_DELETED",
            link: `/clients/${clientId}`,
            timestamp: serverTimestamp(),
        });
    }

    await deleteDoc(contractRef);
    revalidatePath(`/clients/${clientId}`);
    return { success: true, message: 'Contract deleted successfully.' };
  } catch (error) {
    console.error('Error deleting contract:', error);
    return { success: false, message: 'Failed to delete contract.' };
  }
}
