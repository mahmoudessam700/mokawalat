'use server';

import { firestore } from '@/lib/firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

export async function checkIn(employeeId: string, employeeName: string) {
  if (!employeeId || !employeeName) {
    return { success: false, message: 'Employee information is required.' };
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const attendanceCollection = collection(firestore, 'attendance');

  try {
    // Check if there is already an open check-in for today
    const q = query(
      attendanceCollection,
      where('employeeId', '==', employeeId),
      where('date', '==', todayStr),
      where('checkOutTime', '==', null),
      limit(1)
    );
    const existingCheckIn = await getDocs(q);
    if (!existingCheckIn.empty) {
      return { success: false, message: 'You have already checked in today.' };
    }

    // Create a new attendance record
    await addDoc(attendanceCollection, {
      employeeId,
      employeeName,
      checkInTime: serverTimestamp(),
      checkOutTime: null,
      date: todayStr,
      status: 'Present',
    });

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Employee ${employeeName} checked in.`,
        type: "ATTENDANCE_CHECK_IN",
        link: `/hr/attendance`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/hr/attendance');
    revalidatePath(`/employees/${employeeId}`);

    return { success: true, message: 'Checked in successfully.' };
  } catch (error) {
    console.error('Error checking in:', error);
    return { success: false, message: 'Failed to check in.' };
  }
}

export async function checkOut(attendanceId: string) {
  if (!attendanceId) {
    return { success: false, message: 'Attendance record ID is required.' };
  }

  try {
    const attendanceRef = doc(firestore, 'attendance', attendanceId);
    await updateDoc(attendanceRef, {
      checkOutTime: serverTimestamp(),
    });

    const attendanceSnap = await getDoc(attendanceRef);
    const employeeName = attendanceSnap.exists() ? attendanceSnap.data().employeeName : 'Unknown';

    await addDoc(collection(firestore, 'activityLog'), {
        message: `Employee ${employeeName} checked out.`,
        type: "ATTENDANCE_CHECK_OUT",
        link: `/hr/attendance`,
        timestamp: serverTimestamp(),
    });

    revalidatePath('/hr/attendance');
    if(attendanceSnap.exists()) revalidatePath(`/employees/${attendanceSnap.data().employeeId}`);

    return { success: true, message: 'Checked out successfully.' };
  } catch (error) {
    console.error('Error checking out:', error);
    return { success: false, message: 'Failed to check out.' };
  }
}
