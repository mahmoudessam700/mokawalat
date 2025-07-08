'use server';

import { firestore, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const trainingRecordFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  courseName: z.string().min(3, "Course name is required."),
  completionDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
});

export type TrainingRecordFormValues = z.infer<typeof trainingRecordFormSchema>;

export async function addTrainingRecord(formData: FormData) {
  const formValues = {
    employeeId: formData.get('employeeId'),
    courseName: formData.get('courseName'),
    completionDate: formData.get('completionDate'),
  };

  const validatedFields = trainingRecordFormSchema.safeParse(formValues);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  const certificateFile = formData.get('certificate') as File | null;
  if (certificateFile && certificateFile.size > 5 * 1024 * 1024) { // 5MB limit
    return { errors: { certificate: ['Certificate must be less than 5MB.'] }, message: 'File is too large.' };
  }

  try {
    const newTrainingRef = doc(collection(firestore, 'trainings'));
    let certificateUrl = '';
    let certificatePath = '';

    const employeeSnap = await getDoc(doc(firestore, 'employees', validatedFields.data.employeeId));
    if (!employeeSnap.exists()) {
      return { message: 'Selected employee not found.', errors: { employeeId: ['Invalid employee.'] } };
    }

    if (certificateFile && certificateFile.size > 0) {
      certificatePath = `certificates/${validatedFields.data.employeeId}/${newTrainingRef.id}/${certificateFile.name}`;
      const storageRef = ref(storage, certificatePath);
      await uploadBytes(storageRef, certificateFile);
      certificateUrl = await getDownloadURL(storageRef);
    }
    
    await setDoc(newTrainingRef, {
      ...validatedFields.data,
      employeeName: employeeSnap.data().name,
      completionDate: new Date(validatedFields.data.completionDate),
      certificateUrl,
      certificatePath,
      createdAt: serverTimestamp(),
    });

    revalidatePath('/hr/training');
    return { message: 'Training record added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding training record:', error);
    return { message: 'Failed to add training record.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}
