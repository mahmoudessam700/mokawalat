'use server';

import { firestore } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const performanceReviewFormSchema = z.object({
  employeeId: z.string().min(1, "Employee is required."),
  reviewDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Please select a valid date.',
  }),
  rating: z.coerce.number().min(1).max(5),
  goals: z.string().min(10, "Goals must be at least 10 characters long."),
  feedback: z.string().min(10, "Feedback must be at least 10 characters long."),
});

export type PerformanceReviewFormValues = z.infer<typeof performanceReviewFormSchema>;

export async function addPerformanceReview(reviewerId: string, values: PerformanceReviewFormValues) {
  const validatedFields = performanceReviewFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    const employeeSnap = await getDoc(doc(firestore, 'employees', values.employeeId));
    if (!employeeSnap.exists()) {
      return { message: 'Selected employee not found.', errors: { employeeId: ['Invalid employee.'] } };
    }

    await addDoc(collection(firestore, 'performanceReviews'), {
      ...validatedFields.data,
      reviewerId,
      reviewerEmail: (await getDoc(doc(firestore, 'users', reviewerId))).data()?.email,
      employeeName: employeeSnap.data().name,
      createdAt: serverTimestamp(),
    });

    revalidatePath('/hr/performance');
    return { message: 'Performance review added successfully.', errors: null };
  } catch (error) {
    console.error('Error adding performance review:', error);
    return { message: 'Failed to add review.', errors: { _server: ['An unexpected error occurred.'] } };
  }
}
