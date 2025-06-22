'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const projectFormSchema = z.object({
  name: z.string().min(3, 'Project name must be at least 3 characters long.'),
  description: z.string().optional(),
  budget: z.coerce.number().positive('Budget must be a positive number.'),
  startDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Please select a valid date.',
    }),
  status: z.enum(['Planning', 'In Progress', 'Completed', 'On Hold']),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export async function addProject(values: ProjectFormValues) {
  const validatedFields = projectFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    const { name, description, budget, startDate, status } =
      validatedFields.data;
    await addDoc(collection(firestore, 'projects'), {
      name,
      description: description || '',
      budget,
      startDate: new Date(startDate),
      status,
      createdAt: serverTimestamp(),
    });
    revalidatePath('/projects');
    return { message: 'Project added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding project:', error);
    return {
      message: 'Failed to add project.',
      errors: { _server: ['An unexpected error occurred.'] },
    };
  }
}
