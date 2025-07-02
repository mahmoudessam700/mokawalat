
'use server';

import { firestore, storage } from '@/lib/firebase';
import { collection, addDoc, doc, deleteDoc, updateDoc, serverTimestamp, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
    revalidatePath(`/hr/jobs/${jobId}`);
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


// Candidate Actions
const candidateFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long."),
  email: z.string().email("Please enter a valid email address."),
  phone: z.string().min(10, "Please enter a valid phone number."),
});

export type CandidateFormValues = z.infer<typeof candidateFormSchema>;

export async function addCandidate(jobId: string, formData: FormData) {
  if (!jobId) {
    return { message: 'Job ID is required.', errors: { _server: ['Job ID is missing.'] } };
  }

  const formValues = {
    name: formData.get('name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
  };

  const validatedFields = candidateFormSchema.safeParse(formValues);
  if (!validatedFields.success) {
    return { errors: validatedFields.error.flatten().fieldErrors, message: 'Invalid data provided.' };
  }

  const resumeFile = formData.get('resume') as File | null;
  if (resumeFile && resumeFile.size > 5 * 1024 * 1024) { // 5MB limit
    return { errors: { resume: ['Resume must be less than 5MB.'] }, message: 'File is too large.' };
  }

  try {
    const newCandidateRef = doc(collection(firestore, 'candidates'));
    let resumeUrl = '';
    let resumePath = '';

    if (resumeFile && resumeFile.size > 0) {
      resumePath = `resumes/${jobId}/${newCandidateRef.id}/${resumeFile.name}`;
      const storageRef = ref(storage, resumePath);
      await uploadBytes(storageRef, resumeFile);
      resumeUrl = await getDownloadURL(storageRef);
    }
    
    await setDoc(newCandidateRef, {
      ...validatedFields.data,
      jobId,
      status: 'Applied',
      appliedAt: serverTimestamp(),
      resumeUrl,
      resumePath,
    });

    revalidatePath(`/hr/jobs/${jobId}`);
    return { message: 'Candidate added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding candidate:', error);
    return { message: 'Failed to add candidate.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}
