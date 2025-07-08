'use server';

import { firestore } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const leaveRequestFormSchema = z.object({
  leaveType: z.enum(['Annual', 'Sick', 'Unpaid', 'Other']),
  startDate: z.string().refine((date) => !isNaN(Date.parse(date))),
  endDate: z.string().refine((date) => !isNaN(Date.parse(date))),
  reason: z.string().optional(),
});

export type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>;

export async function addLeaveRequest(employeeId: string, employeeName: string, values: LeaveRequestFormValues) {
  const validatedFields = leaveRequestFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Invalid data provided.',
    };
  }

  try {
    await addDoc(collection(firestore, 'leaveRequests'), {
      ...validatedFields.data,
      employeeId,
      employeeName,
      status: 'Pending',
      requestedAt: serverTimestamp(),
      startDate: new Date(validatedFields.data.startDate),
      endDate: new Date(validatedFields.data.endDate),
    });

     await addDoc(collection(firestore, 'activityLog'), {
        message: `Leave request submitted by ${employeeName}`,
        type: "LEAVE_REQUEST_CREATED",
        link: `/hr/leave`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/hr/leave');
    revalidatePath(`/employees/${employeeId}`);

    return { message: 'Leave request submitted successfully.', errors: null };
  } catch (error) {
    console.error('Error submitting leave request:', error);
    return {
      message: 'Failed to submit leave request.',
      errors: { _server: ['An unexpected error occurred.'] },
    };
  }
}

export async function updateLeaveRequestStatus(requestId: string, status: 'Approved' | 'Rejected') {
  if (!requestId) {
    return { success: false, message: 'Request ID is required.' };
  }

  const requestRef = doc(firestore, 'leaveRequests', requestId);

  try {
    await updateDoc(requestRef, { status });
    const requestSnap = await getDoc(requestRef);
    if (requestSnap.exists()) {
        const employeeName = requestSnap.data().employeeName;
        const employeeId = requestSnap.data().employeeId;
        await addDoc(collection(firestore, 'activityLog'), {
            message: `Leave request for ${employeeName} was ${status.toLowerCase()}`,
            type: status === 'Approved' ? "LEAVE_REQUEST_APPROVED" : "LEAVE_REQUEST_REJECTED",
            link: `/hr/leave`,
            timestamp: serverTimestamp(),
        });
        revalidatePath(`/employees/${employeeId}`);
    }


    revalidatePath('/hr/leave');
    return { success: true, message: `Request status updated to ${status}.` };
  } catch (error) {
    console.error('Error updating leave request status:', error);
    return { success: false, message: 'Failed to update request status.' };
  }
}
