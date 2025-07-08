'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const offboardingFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  exitDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  reason: z.string().min(3, "Reason for departure is required."),
  feedback: z.string().optional(),
  assetsReturned: z.boolean().default(false),
});

export type OffboardingFormValues = z.infer<typeof offboardingFormSchema>;

export async function startOffboarding(values: OffboardingFormValues) {
  const validatedFields = offboardingFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const batch = writeBatch(firestore);
    
    // 1. Create offboarding record
    const offboardingRef = doc(collection(firestore, 'offboarding'));
    batch.set(offboardingRef, {
      ...validatedFields.data,
      exitDate: new Date(validatedFields.data.exitDate),
      createdAt: serverTimestamp(),
    });

    // 2. Update employee status to Inactive
    const employeeRef = doc(firestore, 'employees', validatedFields.data.employeeId);
    batch.update(employeeRef, { status: 'Inactive' });

    await batch.commit();

    revalidatePath('/hr/offboarding');
    revalidatePath('/employees');
    return { message: 'Offboarding process started successfully. Employee status is now Inactive.', errors: null };
  } catch (error) {
    console.error('Error starting offboarding:', error);
    return { message: 'Failed to start offboarding process.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}
