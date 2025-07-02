
'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, getDoc, getDocs, query, where } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const jobFormSchema = z.object({
  title: z.string().min(3, "Job title must be at least 3 characters long."),
  description: z.string().min(10, "Description must be at least 10 characters long."),
  department: z.string().min(1, "Department is required."),
  status: z.enum(["Open", "Closed"]),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

export async function addJob(values: JobFormValues) {
  const validatedFields = jobFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided. Please check the form.',
    };
  }

  try {
    await addDoc(collection(firestore, 'jobs'), {
      ...validatedFields.data,
      title_lowercase: validatedFields.data.title.toLowerCase(),
      createdAt: serverTimestamp(),
    });

    revalidatePath('/hr/jobs');
    return { message: 'Job posting created successfully.', errors: null };
  } catch (error) {
    console.error('Error adding job:', error);
    return { message: 'Failed to create job posting.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function updateJob(jobId: string, values: JobFormValues) {
  if (!jobId) {
    return { message: 'Job ID is required.', errors: { _server: ['Job ID not provided.'] } };
  }

  const validatedFields = jobFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const jobRef = doc(firestore, 'jobs', jobId);
    await updateDoc(jobRef, {
      ...validatedFields.data,
      title_lowercase: validatedFields.data.title.toLowerCase(),
    });
    
    revalidatePath('/hr/jobs');
    return { message: 'Job posting updated successfully.', errors: null };
  } catch (error) {
    console.error('Error updating job:', error);
    return { message: 'Failed to update job posting.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}

export async function deleteJob(jobId: string) {
  if (!jobId) {
    return { success: false, message: 'Job ID is required.' };
  }

  try {
    const jobRef = doc(firestore, 'jobs', jobId);

    // Check for linked candidates
    const candidatesQuery = query(collection(firestore, 'candidates'), where('jobId', '==', jobId));
    const candidatesSnapshot = await getDocs(candidatesQuery);
    if (!candidatesSnapshot.empty) {
      return { success: false, message: 'Cannot delete job with existing candidates. Please re-assign or delete them first.' };
    }

    await deleteDoc(jobRef);
    revalidatePath('/hr/jobs');
    return { success: true, message: 'Job posting deleted successfully.' };
  } catch (error) {
    console.error('Error deleting job:', error);
    return { success: false, message: 'Failed to delete job posting.' };
  }
}
