'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

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
