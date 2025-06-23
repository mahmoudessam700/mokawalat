
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { summarizeClientInteractions } from '@/ai/flows/summarize-client-interactions';
import { format } from 'date-fns';

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
  fileUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

export type ContractFormValues = z.infer<typeof contractFormSchema>;

export async function addContract(clientId: string, values: ContractFormValues) {
  if (!clientId) {
    return { message: 'Client ID is required.', errors: { _server: ['Client ID is missing.'] } };
  }

  const validatedFields = contractFormSchema.safeParse(values);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data provided.' };
  }

  try {
    const contractsRef = collection(firestore, 'clients', clientId, 'contracts');
    await addDoc(contractsRef, {
      ...validatedFields.data,
      effectiveDate: new Date(validatedFields.data.effectiveDate),
      createdAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `New contract added for client: ${validatedFields.data.title}`,
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
    await deleteDoc(doc(firestore, 'clients', clientId, 'contracts', contractId));
    revalidatePath(`/clients/${clientId}`);
    return { success: true, message: 'Contract deleted successfully.' };
  } catch (error) {
    console.error('Error deleting contract:', error);
    return { success: false, message: 'Failed to delete contract.' };
  }
}
